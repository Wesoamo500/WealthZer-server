import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../auth/src/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MarketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketService.name);
  private syncInterval: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Initial sync
    this.syncMarketData();
    
    // Sync every 30 minutes for crypto/stocks
    this.syncInterval = setInterval(() => {
      this.syncMarketData();
    }, 30 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  async getMarketTickers(category?: string) {
    const where: any = {};
    if (category && category !== 'all') {
      where.type = category.toUpperCase();
    }

    return this.prisma.assetPrice.findMany({
      where,
      orderBy: { rank: 'asc' },
    });
  }

  async searchTickers(query: string) {
    return this.prisma.assetPrice.findMany({
      where: {
        OR: [
          { symbol: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
  }

  async getTickerDetail(symbol: string, type: string) {
    return this.prisma.assetPrice.findUnique({
      where: { symbol_type: { symbol, type } },
    });
  }

  async getUserWatchlist(userId: string) {
    const watchlist = await this.prisma.watchlist.findMany({
      where: { userId },
      select: { symbol: true, type: true },
    });

    if (watchlist.length === 0) return [];

    return this.prisma.assetPrice.findMany({
      where: {
        OR: watchlist.map(w => ({ symbol: w.symbol, type: w.type })),
      },
    });
  }

  async toggleWatchlist(userId: string, symbol: string, type: string) {
    const existing = await this.prisma.watchlist.findUnique({
      where: { userId_symbol_type: { userId, symbol, type } },
    });

    if (existing) {
      await this.prisma.watchlist.delete({
        where: { id: existing.id },
      });
      return { inWatchlist: false };
    } else {
      await this.prisma.watchlist.create({
        data: { userId, symbol, type },
      });
      return { inWatchlist: true };
    }
  }

  async getMarketHistory(symbol: string, type: string, period: string = '7D') {
    const now = new Date();
    let startDate: Date;

    const safePeriod = (period || '7D').toUpperCase();
    switch (safePeriod) {
      case '1D':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '1W':
      case '7D':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'ALL':
        startDate = new Date(2020, 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    return this.prisma.marketHistory.findMany({
      where: {
        symbol: symbol.toUpperCase(),
        type: type.toUpperCase(),
        timestamp: {
          gte: startDate,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
  }

  private async saveMarketHistory(symbol: string, type: string, price: number) {
    try {
      await this.prisma.marketHistory.create({
        data: {
          symbol: symbol.toUpperCase(),
          type: type.toUpperCase(),
          price: price,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save market history for ${symbol}:`, error);
    }
  }


  async syncMarketData() {
    this.logger.log('Starting Market Data Sync...');
    try {
      await Promise.all([
        this.syncCryptoMarkets(),
        this.syncStockMarkets(),
      ]);
      this.logger.log('Market Data Sync completed.');
    } catch (error) {
      this.logger.error('Market Data Sync failed:', error);
    }
  }

  private async syncCryptoMarkets() {
    try {
      this.logger.log('Syncing crypto markets from CoinGecko...');
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h'
      );
      
      const data = await response.json();

      if (!Array.isArray(data)) {
        this.logger.error('Invalid crypto data from CoinGecko, attempting Binance fallback for major coins');
        await this.syncMajorCryptoBinance();
        return;
      }

      for (const coin of data) {
        const symbol = coin.symbol.toUpperCase();
        const price = coin.current_price;
        const sparkline = JSON.stringify(coin.sparkline_in_7d?.price || []);
        
        await this.prisma.assetPrice.upsert({
          where: { symbol_type: { symbol, type: 'CRYPTO' } },
          update: {
            name: coin.name,
            price: price,
            change24h: coin.price_change_24h,
            changePercent24h: coin.price_change_percentage_24h,
            marketCap: this.formatCap(coin.market_cap),
            volume24h: this.formatCap(coin.total_volume),
            sparkline7d: sparkline,
            rank: coin.market_cap_rank,
            color: this.getCryptoColor(symbol),
            fetchedAt: new Date(),
          },
          create: {
            symbol,
            type: 'CRYPTO',
            name: coin.name,
            price: price,
            change24h: coin.price_change_24h,
            changePercent24h: coin.price_change_percentage_24h,
            marketCap: this.formatCap(coin.market_cap),
            volume24h: this.formatCap(coin.total_volume),
            sparkline7d: sparkline,
            rank: coin.market_cap_rank,
            color: this.getCryptoColor(symbol),
            fetchedAt: new Date(),
          },
        });

        // Save price snapshot to history
        await this.saveMarketHistory(symbol, 'CRYPTO', price);
      }
    } catch (error) {
      this.logger.error('Failed to sync crypto markets:', error);
      await this.syncMajorCryptoBinance();
    }
  }

  private async syncMajorCryptoBinance() {
    this.logger.log('Starting Binance fallback sync...');
    const majorCoins = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'MATIC', 'DOT'];
    
    for (const symbol of majorCoins) {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`);
        const data = await response.json();
        
        if (data.lastPrice) {
          const price = parseFloat(data.lastPrice);
          await this.prisma.assetPrice.updateMany({
            where: { symbol, type: 'CRYPTO' },
            data: {
              price: price,
              change24h: parseFloat(data.priceChange),
              changePercent24h: parseFloat(data.priceChangePercent),
              fetchedAt: new Date(),
            },
          });
          await this.saveMarketHistory(symbol, 'CRYPTO', price);
        }
      } catch (err) {
        this.logger.warn(`Binance fallback failed for ${symbol}`);
      }
    }
  }


  private async syncStockMarkets() {
    this.logger.log('Syncing stock markets...');
    // Expanded tech and major global stocks
    const stocks = [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'MSFT', name: 'Microsoft' },
      { symbol: 'NVDA', name: 'NVIDIA' },
      { symbol: 'GOOGL', name: 'Alphabet' },
      { symbol: 'AMZN', name: 'Amazon' },
      { symbol: 'TSLA', name: 'Tesla' },
      { symbol: 'META', name: 'Meta' },
      { symbol: 'BRK.B', name: 'Berkshire Hathaway' },
      { symbol: 'UNH', name: 'UnitedHealth' },
      { symbol: 'V', name: 'Visa' },
      { symbol: 'JNJ', name: 'Johnson & Johnson' },
      { symbol: 'WMT', name: 'Walmart' },
      { symbol: 'JPM', name: 'JPMorgan Chase' },
      { symbol: 'LLY', name: 'Eli Lilly' },
      { symbol: 'PG', name: 'Procter & Gamble' },
      { symbol: 'AVGO', name: 'Broadcom' },
      { symbol: 'MA', name: 'Mastercard' },
      { symbol: 'HD', name: 'Home Depot' },
      { symbol: 'CVX', name: 'Chevron' },
      { symbol: 'KO', name: 'Coca-Cola' },
    ];

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      try {
        const priceData = await this.fetchStockData(stock.symbol);
        if (priceData) {
          await this.prisma.assetPrice.upsert({
            where: { symbol_type: { symbol: stock.symbol, type: 'STOCK' } },
            update: {
              name: stock.name,
              price: priceData.price,
              change24h: priceData.change,
              changePercent24h: priceData.changePercent,
              marketCap: priceData.marketCap,
              rank: 100 + i,
              color: this.getStockColor(stock.symbol),
              fetchedAt: new Date(),
            },
            create: {
              symbol: stock.symbol,
              type: 'STOCK',
              name: stock.name,
              price: priceData.price,
              change24h: priceData.change,
              changePercent24h: priceData.changePercent,
              marketCap: priceData.marketCap,
              rank: 100 + i,
              color: this.getStockColor(stock.symbol),
              fetchedAt: new Date(),
            },
          });

          // Save price snapshot to history
          await this.saveMarketHistory(stock.symbol, 'STOCK', priceData.price);
        }
        // Delay to respect Alpha Vantage free tier (5 calls/min is very restrictive, demo is even more so)
        // Adjusting delay to be safer: 1.5s between calls
        await new Promise((r) => setTimeout(r, 1500));
      } catch (error) {
        this.logger.error(`Failed to sync stock ${stock.symbol}:`, error);
      }
    }
  }

  private async fetchStockData(symbol: string) {
    try {
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
      );
      const data = await response.json();
      const quote = data['Global Quote'];

      if (quote && quote['05. price']) {
        return {
          price: parseFloat(quote['05. price']),
          change: parseFloat(quote['09. change']),
          changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
          marketCap: '—', // Alpha Vantage Global Quote doesn't provide market cap
        };
      }

      // If Alpha Vantage fails or returns demo limit, try Yahoo fallback
      return await this.fetchYahooStockData(symbol);
    } catch {
      return await this.fetchYahooStockData(symbol);
    }
  }

  private async fetchYahooStockData(symbol: string) {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
      );
      const data = await response.json();
      const result = data.chart?.result?.[0];

      if (result) {
        const meta = result.meta;
        const currentPrice = meta.regularMarketPrice;
        const prevClose = meta.previousClose;
        const change = currentPrice - prevClose;
        const changePercent = (change / prevClose) * 100;

        return {
          price: currentPrice,
          change: change,
          changePercent: changePercent,
          marketCap: '—',
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private formatCap(val: number): string {
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  }

  private getCryptoColor(symbol: string): string {
    const colors: Record<string, string> = {
      BTC: '#F7931A',
      ETH: '#627EEA',
      SOL: '#9945FF',
      BNB: '#F3BA2F',
      XRP: '#23292F',
      ADA: '#0033AD',
      DOGE: '#C2A633',
      MATIC: '#8247E5',
      DOT: '#E6007A',
    };
    return colors[symbol] || '#627EEA';
  }

  private getStockColor(symbol: string): string {
    const colors: Record<string, string> = {
      AAPL: '#A2AAAD',
      MSFT: '#00A4EF',
      NVDA: '#76B900',
      GOOGL: '#4285F4',
      AMZN: '#FF9900',
      TSLA: '#E8101E',
      META: '#0668E1',
    };
    return colors[symbol] || '#B93535';
  }
}
