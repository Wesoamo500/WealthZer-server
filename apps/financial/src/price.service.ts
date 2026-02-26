import { Injectable, Logger } from '@nestjs/common';

interface PriceData {
  symbol: string;
  price: number;
  change24h?: number;
  changePercent24h?: number;
}

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  async getCurrentPrice(symbol: string, type: 'STOCK' | 'CRYPTO'): Promise<number> {
    const cacheKey = `${type}:${symbol}`;
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.price;
    }

    try {
      const price = type === 'CRYPTO' 
        ? await this.getCryptoPrice(symbol)
        : await this.getStockPrice(symbol);
      
      this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
      return price;
    } catch (error) {
      this.logger.error(`Failed to fetch price for ${symbol}:`, error.message);
      return cached?.price || 0;
    }
  }

  private async getCryptoPrice(symbol: string): Promise<number> {
    try {
      // CoinGecko API (free tier)
      const coinId = this.getCoinGeckoId(symbol);
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
      );
      
      if (!response.ok) throw new Error('CoinGecko API error');
      
      const data = await response.json();
      return data[coinId]?.usd || 0;
    } catch (error) {
      // Fallback to Binance API
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`
        );
        const data = await response.json();
        return parseFloat(data.price) || 0;
      } catch {
        this.logger.warn(`Could not fetch crypto price for ${symbol}`);
        return 0;
      }
    }
  }

  private async getStockPrice(symbol: string): Promise<number> {
    try {
      // Alpha Vantage free API (5 calls/min, 100 calls/day)
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
      );
      
      const data = await response.json();
      const price = parseFloat(data['Global Quote']?.['05. price']);
      
      if (price) return price;
      
      // Fallback to Yahoo Finance alternative
      return await this.getYahooFinancePrice(symbol);
    } catch (error) {
      this.logger.warn(`Could not fetch stock price for ${symbol}`);
      return 0;
    }
  }

  private async getYahooFinancePrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
      );
      const data = await response.json();
      const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
      return price || 0;
    } catch {
      return 0;
    }
  }

  private getCoinGeckoId(symbol: string): string {
    const mapping: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDT': 'tether',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'DOGE': 'dogecoin',
      'MATIC': 'matic-network',
      'DOT': 'polkadot',
      'AVAX': 'avalanche-2',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'ATOM': 'cosmos',
      'LTC': 'litecoin',
    };
    return mapping[symbol.toUpperCase()] || symbol.toLowerCase();
  }

  async getBatchPrices(assets: Array<{ symbol: string; type: string }>): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();
    
    await Promise.all(
      assets.map(async (asset) => {
        if (asset.type === 'CASH') {
          priceMap.set(asset.symbol, 1);
        } else {
          const price = await this.getCurrentPrice(
            asset.symbol,
            asset.type as 'STOCK' | 'CRYPTO'
          );
          priceMap.set(asset.symbol, price);
        }
      })
    );
    
    return priceMap;
  }
}
