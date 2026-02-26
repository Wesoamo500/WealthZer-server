import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../auth/src/prisma/prisma.service';

interface PriceData {
  symbol: string;
  price: number;
  change24h?: number;
  changePercent24h?: number;
}

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);
  private readonly DB_CACHE_TTL = 3600000; // 1 hour

  constructor(private readonly prisma: PrismaService) {}

  async getCurrentPrice(symbol: string, type: 'STOCK' | 'CRYPTO'): Promise<number> {
    // Try database first
    const cached = await this.prisma.assetPrice.findUnique({
      where: { symbol_type: { symbol, type } },
    });

    if (cached && Date.now() - cached.fetchedAt.getTime() < this.DB_CACHE_TTL) {
      return Number(cached.price);
    }

    // Fallback to API (shouldn't happen often with scheduled sync)
    this.logger.warn(`Cache miss for ${symbol}, fetching from API`);
    return 0; // Return 0 to avoid exhausting API, sync service will update
  }

  async getBatchPrices(assets: Array<{ symbol: string; type: string }>): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();
    
    // Fetch all from database in one query
    const prices = await this.prisma.assetPrice.findMany({
      where: {
        OR: assets.map(a => ({ symbol: a.symbol, type: a.type })),
      },
    });

    // Map prices
    for (const asset of assets) {
      if (asset.type === 'CASH') {
        priceMap.set(asset.symbol, 1);
      } else {
        const cached = prices.find(p => p.symbol === asset.symbol && p.type === asset.type);
        priceMap.set(asset.symbol, cached ? Number(cached.price) : 0);
      }
    }
    
    return priceMap;
  }
}
