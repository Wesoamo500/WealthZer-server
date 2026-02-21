import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../auth/src/prisma/prisma.service'; // Adjust path if needed or use a shared prisma service
import { CreateTransactionDto, CreateAssetDto, UpdateAssetValueDto, CreateBudgetDto, TransactionCategory } from '@wealthzer/shared';

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

  async createBudget(userId: string, dto: CreateBudgetDto) {
    // Check if budget for category already exists
    const existingBudget = await this.prisma.budget.findFirst({
      where: { userId, category: dto.category },
    });

    if (existingBudget) {
      return this.prisma.budget.update({
        where: { id: existingBudget.id },
        data: {
          amount: dto.amount,
          period: dto.period || 'MONTHLY',
        },
      });
    }

    return this.prisma.budget.create({
      data: {
        userId,
        category: dto.category,
        amount: dto.amount,
        period: dto.period || 'MONTHLY',
      },
    });
  }

  async getBudgets(userId: string) {
    return this.prisma.budget.findMany({
      where: { userId },
    });
  }

  async getNetWorth(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [assets, transactions, budgets] = await Promise.all([
      this.prisma.portfolioAsset.findMany({ where: { userId } }),
      this.prisma.transaction.findMany({ where: { userId } }),
      this.prisma.budget.findMany({ where: { userId } }),
    ]);

    // 1. Calculate Investment Value
    const totalInvestments = assets.reduce((sum, asset) => {
      const value = asset.currentValue ? Number(asset.currentValue) : Number(asset.purchasePrice);
      return sum + (value * Number(asset.amount));
    }, 0);

    // 2. Calculate Cash and Credit balances from transactions
    // Sum of all transactions (Income is +, Expenses are -)
    const transactionBalance = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

    const totalNetWorth = totalInvestments + transactionBalance;

    // 3. Current Month Stats
    const currentMonthTransactions = transactions.filter(t => t.date >= startOfMonth);
    const totalIncome = currentMonthTransactions
      .filter(t => t.category === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = currentMonthTransactions
      .filter(t => t.category !== 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // 4. Budget Progress
    const budgetsWithProgress = budgets.map(budget => {
      const spent = currentMonthTransactions
        .filter(t => t.category === budget.category)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return {
        ...budget,
        spent,
        remaining: Number(budget.amount) - spent,
        progress: (spent / Number(budget.amount)) * 100,
      };
    });

    // 5. Daily Trend Calculation
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaysTransactions = currentMonthTransactions.filter(t => t.date >= startOfToday);
    
    // Sum of all transactions today
    const dailyChange = todaysTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

    const prevNetWorth = totalNetWorth - dailyChange;
    const dailyChangePercent = prevNetWorth !== 0 ? (dailyChange / prevNetWorth) * 100 : 0;

    return {
      totalNetWorth,
      totalInvestments,
      totalIncome,
      totalExpenses,
      dailyChange,
      dailyChangePercent,
      budgets: budgetsWithProgress,
      currency: 'USD',
    };
  }
}
