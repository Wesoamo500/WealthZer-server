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

  async getHealthScore(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [assets, transactions, budgets] = await Promise.all([
      this.prisma.portfolioAsset.findMany({ where: { userId } }),
      this.prisma.transaction.findMany({ where: { userId } }),
      this.prisma.budget.findMany({ where: { userId } }),
    ]);

    // Current month transactions
    const currentMonthTxns = transactions.filter(t => t.date >= startOfMonth);
    const lastMonthTxns = transactions.filter(t => t.date >= startOfLastMonth && t.date < startOfMonth);

    const totalIncome = currentMonthTxns
      .filter(t => t.category === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = Math.abs(currentMonthTxns
      .filter(t => t.category !== 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0));

    const lastMonthIncome = lastMonthTxns
      .filter(t => t.category === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const lastMonthExpenses = Math.abs(lastMonthTxns
      .filter(t => t.category !== 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0));

    // --- PILLAR 1: Savings Rate (20 pts) ---
    // Target: >=20% savings rate = full marks
    let savingsRateScore = 0;
    let savingsRate = 0;
    if (totalIncome > 0) {
      savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
      savingsRateScore = Math.min(Math.max(savingsRate / 20, 0), 1) * 20;
    }

    // Last month comparison
    let lastMonthSavingsRate = 0;
    if (lastMonthIncome > 0) {
      lastMonthSavingsRate = ((lastMonthIncome - lastMonthExpenses) / lastMonthIncome) * 100;
    }
    const savingsRateChange = savingsRate - lastMonthSavingsRate;

    // --- PILLAR 2: Budget Adherence (20 pts) ---
    let budgetScore = 0;
    if (budgets.length > 0) {
      const budgetScores = budgets.map(budget => {
        const spent = Math.abs(currentMonthTxns
          .filter(t => t.category === budget.category)
          .reduce((sum, t) => sum + Number(t.amount), 0));
        const usage = Number(budget.amount) > 0 ? (spent / Number(budget.amount)) * 100 : 0;
        // Under 80% = full, 80-100% = partial, over 100% = 0
        if (usage <= 80) return 20;
        if (usage <= 100) return 20 * (1 - (usage - 80) / 20);
        return 0;
      });
      budgetScore = budgetScores.reduce((a, b) => a + b, 0) / budgetScores.length;
    } else {
      budgetScore = 5; // Partial credit for no budgets (encourage setting them up)
    }

    // --- PILLAR 3: Portfolio Diversification (20 pts) ---
    const assetTypes = new Set(assets.map(a => a.type));
    const diversificationScore = Math.min(assetTypes.size / 3, 1) * 20;

    // --- PILLAR 4: Cash Flow (20 pts) ---
    const cashFlow = totalIncome - totalExpenses;
    let cashFlowScore = 0;
    if (cashFlow > 0) {
      cashFlowScore = 20;
    } else if (cashFlow === 0) {
      cashFlowScore = 10;
    } else {
      // Negative: scale down from 10 to 0 based on severity
      const severity = Math.min(Math.abs(cashFlow) / (totalIncome || 1), 1);
      cashFlowScore = Math.max(10 * (1 - severity), 0);
    }

    // --- PILLAR 5: Financial Activity (20 pts) ---
    let activityScore = 0;
    if (budgets.length > 0) activityScore += 5;
    if (assets.length > 0) activityScore += 5;
    if (transactions.length > 0) activityScore += 5;
    const totalNetWorth = assets.reduce((sum, a) => {
      const val = a.currentValue ? Number(a.currentValue) : Number(a.purchasePrice);
      return sum + (val * Number(a.amount));
    }, 0) + transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    if (totalNetWorth > 0) activityScore += 5;

    // --- TOTAL SCORE ---
    const totalScore = Math.round(
      Math.min(Math.max(savingsRateScore + budgetScore + diversificationScore + cashFlowScore + activityScore, 0), 100)
    );

    // Grade
    let grade = 'Poor';
    if (totalScore >= 80) grade = 'Excellent';
    else if (totalScore >= 60) grade = 'Good';
    else if (totalScore >= 40) grade = 'Fair';

    // Pillars breakdown
    const pillars = [
      { name: 'Savings Rate', score: Math.round(savingsRateScore), max: 20 },
      { name: 'Budget Adherence', score: Math.round(budgetScore), max: 20 },
      { name: 'Diversification', score: Math.round(diversificationScore), max: 20 },
      { name: 'Cash Flow', score: Math.round(cashFlowScore), max: 20 },
      { name: 'Activity', score: Math.round(activityScore), max: 20 },
    ];

    // Find weakest pillar for tip
    const weakest = pillars.reduce((min, p) => (p.score / p.max) < (min.score / min.max) ? p : min, pillars[0]);
    const tips: Record<string, string> = {
      'Savings Rate': 'Try to save at least 20% of your monthly income. Even small increases compound over time!',
      'Budget Adherence': 'You\'re overspending in some categories. Review your budgets and adjust limits or spending habits.',
      'Diversification': 'Consider diversifying your portfolio across stocks, crypto, and cash to reduce risk.',
      'Cash Flow': 'Your expenses are exceeding your income. Look for areas to cut back or increase earnings.',
      'Activity': 'Set up budgets, add assets, and track transactions to get a more complete financial picture.',
    };

    // Comparison text
    let comparisonText = '';
    if (savingsRateChange > 0) {
      comparisonText = `Your savings rate is ${Math.abs(Math.round(savingsRateChange))}% higher than last month. Keep it up!`;
    } else if (savingsRateChange < 0) {
      comparisonText = `Your savings rate dropped ${Math.abs(Math.round(savingsRateChange))}% from last month. Let's get back on track.`;
    } else {
      comparisonText = `Your financial habits are consistent. Keep building towards your goals!`;
    }

    return {
      score: totalScore,
      grade,
      pillars,
      tip: tips[weakest.name],
      comparisonText,
      savingsRate: Math.round(savingsRate),
    };
  }
}
