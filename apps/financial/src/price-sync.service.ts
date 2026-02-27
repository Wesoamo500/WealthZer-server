import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../auth/src/prisma/prisma.service";

@Injectable()
export class PriceSyncService implements OnModuleInit {
  private readonly logger = new Logger(PriceSyncService.name);
  private syncInterval: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Run immediately on startup
    this.syncPrices();

    // Run every hour (24 times per day = well under 25 API limit)
    this.syncInterval = setInterval(() => {
      this.syncPrices();
    }, 60 * 60 * 1000); // 1 hour
  }

  async syncPrices() {
    try {
      this.logger.log("Starting price sync...");

      // Get unique symbols from all user portfolios
      const assets = await this.prisma.portfolioAsset.findMany({
        select: { symbol: true, type: true },
        distinct: ["symbol", "type"],
      });

      if (assets.length === 0) {
        this.logger.log("No assets to sync");
        return;
      }

      this.logger.log(`Syncing prices for ${assets.length} unique assets`);

      // Fetch and store prices
      for (const asset of assets) {
        if (asset.type === "CASH") continue;

        try {
          const price = await this.fetchPrice(asset.symbol, asset.type);

          if (price > 0) {
            await this.prisma.assetPrice.upsert({
              where: {
                symbol_type: {
                  symbol: asset.symbol,
                  type: asset.type,
                },
              },
              update: {
                price: price,
                fetchedAt: new Date(),
              },
              create: {
                symbol: asset.symbol,
                type: asset.type,
                price: price,
                fetchedAt: new Date(),
              },
            });
            this.logger.log(
              `Updated ${asset.symbol} (${asset.type}): $${price}`,
            );
          }
        } catch (error) {
          this.logger.error(`Failed to sync ${asset.symbol}:`, error);
        }

        // Small delay to avoid rate limiting
        await this.delay(1000);
      }

      this.logger.log("Price sync completed");
    } catch (error) {
      this.logger.error("Price sync failed:", error);
    }
  }

  private async fetchPrice(symbol: string, type: string): Promise<number> {
    if (type === "CRYPTO") {
      return this.fetchCryptoPrice(symbol);
    } else {
      return this.fetchStockPrice(symbol);
    }
  }

  private async fetchCryptoPrice(symbol: string): Promise<number> {
    try {
      const coinId = this.getCoinGeckoId(symbol);
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      );
      const data = await response.json();
      return data[coinId]?.usd || 0;
    } catch {
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`,
        );
        const data = await response.json();
        return parseFloat(data.price) || 0;
      } catch {
        return 0;
      }
    }
  }

  private async fetchStockPrice(symbol: string): Promise<number> {
    try {
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY || "demo";
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
      );
      const data = await response.json();
      const price = parseFloat(data["Global Quote"]?.["05. price"]);

      if (price) return price;

      return await this.fetchYahooPrice(symbol);
    } catch {
      return 0;
    }
  }

  private async fetchYahooPrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      );
      const data = await response.json();
      return data.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
    } catch {
      return 0;
    }
  }

  private getCoinGeckoId(symbol: string): string {
    const mapping: Record<string, string> = {
      BTC: "bitcoin",
      ETH: "ethereum",
      USDT: "tether",
      BNB: "binancecoin",
      SOL: "solana",
      XRP: "ripple",
      ADA: "cardano",
      DOGE: "dogecoin",
      MATIC: "matic-network",
      DOT: "polkadot",
      AVAX: "avalanche-2",
      LINK: "chainlink",
      UNI: "uniswap",
      ATOM: "cosmos",
      LTC: "litecoin",
    };
    return mapping[symbol.toUpperCase()] || symbol.toLowerCase();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  onModuleDestroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}
