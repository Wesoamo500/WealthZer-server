import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../auth/src/prisma/prisma.service'; // Adjust path if needed or use a shared prisma service
import { CreateTransactionDto, CreateAssetDto, UpdateAssetValueDto } from '@wealthzer/shared';

@Injectable()
export class FinancialService {
  constructor(private readonly prisma: PrismaService) {}

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        userId,
        title: dto.title,
        amount: dto.amount,
        category: dto.category,
        account: dto.account,
        note: dto.note,
        isAiSuggested: dto.isAiSuggested || false,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async getTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  async getPortfolio(userId: string) {
    return this.prisma.portfolioAsset.findMany({
      where: { userId },
    });
  }

  async addAsset(userId: string, dto: CreateAssetDto) {
    return this.prisma.portfolioAsset.create({
      data: {
        userId,
        name: dto.name,
        symbol: dto.symbol,
        amount: dto.amount,
        type: dto.type,
        purchasePrice: dto.purchasePrice,
        currentValue: dto.purchasePrice, // Initial value is purchase price
      },
    });
  }

  async updateAssetValue(dto: UpdateAssetValueDto) {
    return this.prisma.portfolioAsset.update({
      where: { id: dto.assetId },
      data: { currentValue: dto.currentValue },
    });
  }

  async getNetWorth(userId: string) {
    const assets = await this.prisma.portfolioAsset.findMany({
      where: { userId },
    });

    const totalAssets = assets.reduce((sum, asset) => {
      const value = asset.currentValue ? Number(asset.currentValue) : Number(asset.purchasePrice);
      return sum + (value * Number(asset.amount));
    }, 0);

    // In a real app, we would also subtract liabilities (Credit accounts)
    return {
      totalNetWorth: totalAssets,
      currency: 'USD',
    };
  }
}
