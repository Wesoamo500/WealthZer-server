import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../auth/src/prisma/prisma.service"; // Adjust path if needed or use a shared prisma service
import {
  CreateTransactionDto,
  CreateAssetDto,
  UpdateAssetValueDto,
  CreateBudgetDto,
} from "@wealthzer/shared";
import { PriceService } from "./price.service";

@Injectable()
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly priceService: PriceService,
  ) {}

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
      orderBy: { date: "desc" },
    });
  }

  async getPortfolio(userId: string) {
    return this.prisma.portfolioAsset.findMany({
      where: { userId },
    });
  }

  async getPortfolioWithPrices(userId: string) {
    const assets = await this.prisma.portfolioAsset.findMany({
      where: { userId },
    });

    if (assets.length === 0) return [];

    const priceMap = await this.priceService.getBatchPrices(
      assets.map((a) => ({ symbol: a.symbol, type: a.type })),
    );

    return assets.map((asset) => {
      const currentPrice = priceMap.get(asset.symbol) || 0;
      const purchasePrice = Number(asset.purchasePrice);
      const amount = Number(asset.amount);

      const currentValue = currentPrice * amount;
      const purchaseValue = purchasePrice * amount;
      const gainLoss = currentValue - purchaseValue;
      const gainLossPercent =
        purchaseValue > 0 ? (gainLoss / purchaseValue) * 100 : 0;

      return {
        id: asset.id,
        name: asset.name,
        symbol: asset.symbol,
        type: asset.type,
        amount: amount,
        purchasePrice: purchasePrice,
        currentPrice: currentPrice,
        currentValue: currentValue,
        purchaseValue: purchaseValue,
        gainLoss: gainLoss,
        gainLossPercent: gainLossPercent,
      };
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
          period: dto.period || "MONTHLY",
        },
      });
    }

    return this.prisma.budget.create({
      data: {
        userId,
        category: dto.category,
        amount: dto.amount,
        period: dto.period || "MONTHLY",
      },
    });
  }

  async getBudgets(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId },
    });
    return budgets.map(b => ({
      ...b,
      emoji: this.getCategoryEmoji(b.category)
    }));
  }

  private getCategoryEmoji(category: string): string {
    const map: Record<string, string> = {
      'DINING': '🍽', 'GROCERIES': '🛒', 'TRANSPORT': '🚗',
      'FUN': '🎉', 'SHOPPING': '🛍', 'RENT': '🏠',
      'UTILITIES': '⚡', 'INCOME': '💰', 'OTHERS': '📦'
    };
    return map[category] || '💰';
  }

  async getNetWorth(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [assets, transactions, budgets] = await Promise.all([
      this.prisma.portfolioAsset.findMany({ where: { userId } }),
      this.prisma.transaction.findMany({ where: { userId } }),
      this.prisma.budget.findMany({ where: { userId } }),
    ]);

    // Fetch real-time prices for all assets
    const priceMap = await this.priceService.getBatchPrices(
      assets.map((a) => ({ symbol: a.symbol, type: a.type })),
    );

    // Calculate Investment Value with real-time prices
    let totalInvestments = 0;
    let totalGainLoss = 0;

    const assetsWithPrices = assets.map((asset) => {
      const currentPrice = priceMap.get(asset.symbol) || 0;
      const purchasePrice = Number(asset.purchasePrice);
      const amount = Number(asset.amount);

      const currentValue = currentPrice * amount;
      const purchaseValue = purchasePrice * amount;
      const gainLoss = currentValue - purchaseValue;
      const gainLossPercent =
        purchaseValue > 0 ? (gainLoss / purchaseValue) * 100 : 0;

      totalInvestments += currentValue;
      totalGainLoss += gainLoss;

      return {
        id: asset.id,
        name: asset.name,
        symbol: asset.symbol,
        type: asset.type,
        amount: amount,
        purchasePrice: purchasePrice,
        currentPrice: currentPrice,
        currentValue: currentValue,
        purchaseValue: purchaseValue,
        gainLoss: gainLoss,
        gainLossPercent: gainLossPercent,
      };
    });

    // Calculate overall portfolio gain/loss percentage
    const totalPurchaseValue = assetsWithPrices.reduce(
      (sum, a) => sum + a.purchaseValue,
      0,
    );
    const totalGainLossPercent =
      totalPurchaseValue > 0 ? (totalGainLoss / totalPurchaseValue) * 100 : 0;

    // Calculate Cash and Credit balances from transactions
    const transactionBalance = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );
    const totalNetWorth = totalInvestments + transactionBalance;

    // Current Month Stats
    const currentMonthTransactions = transactions.filter(
      (t) => t.date >= startOfMonth,
    );
    const totalIncome = currentMonthTransactions
      .filter((t) => t.category === "INCOME")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = currentMonthTransactions
      .filter((t) => t.category !== "INCOME")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Budget Progress
    const budgetsWithProgress = budgets.map((budget) => {
      const spent = currentMonthTransactions
        .filter((t) => t.category === budget.category)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return {
        ...budget,
        spent,
        remaining: Number(budget.amount) - spent,
        progress: (spent / Number(budget.amount)) * 100,
      };
    });

    // Daily Trend Calculation
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todaysTransactions = currentMonthTransactions.filter(
      (t) => t.date >= startOfToday,
    );
    const dailyChange = todaysTransactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );
    const prevNetWorth = totalNetWorth - dailyChange;
    const dailyChangePercent =
      prevNetWorth !== 0 ? (dailyChange / prevNetWorth) * 100 : 0;

    return {
      totalNetWorth,
      totalInvestments,
      totalGainLoss,
      totalGainLossPercent,
      totalIncome,
      totalExpenses,
      dailyChange,
      dailyChangePercent,
      budgets: budgetsWithProgress.map(b => ({ ...b, emoji: this.getCategoryEmoji(b.category) })),
      assets: assetsWithPrices,
      currency: "USD",
      updatedAt: now,
    };
  }

  async getHealthScore(userId: string) {
    const [assets, transactions, budgets, dates] = await Promise.all([
      this.prisma.portfolioAsset.findMany({ where: { userId } }),
      this.prisma.transaction.findMany({ where: { userId } }),
      this.prisma.budget.findMany({ where: { userId } }),
      this.getDateRanges(),
    ]);

    const priceMap = await this.priceService.getBatchPrices(
      assets.map((a) => ({ symbol: a.symbol, type: a.type })),
    );

    const { currentMonthTxns, lastMonthTxns } = this.filterTransactionsByMonth(
      transactions,
      dates.startOfMonth,
      dates.startOfLastMonth,
    );

    const { totalIncome, totalExpenses, lastMonthIncome, lastMonthExpenses } =
      this.calculateIncomeExpenses(currentMonthTxns, lastMonthTxns);

    const savingsRateScore = this.calculateSavingsRate(
      totalIncome,
      totalExpenses,
      lastMonthIncome,
      lastMonthExpenses,
    );
    const budgetScore = this.calculateBudgetScore(budgets, currentMonthTxns);
    const diversificationScore = this.calculateDiversification(assets);
    const cashFlowScore = this.calculateCashFlow(totalIncome, totalExpenses);
    const activityScore = this.calculateActivity(
      budgets,
      assets,
      transactions,
      priceMap,
    );

    const totalScore = Math.round(
      Math.min(
        Math.max(
          savingsRateScore.score +
            budgetScore +
            diversificationScore +
            cashFlowScore +
            activityScore,
          0,
        ),
        100,
      ),
    );

    const grade = this.getGrade(totalScore);
    const pillars = this.buildPillars(
      savingsRateScore.score,
      budgetScore,
      diversificationScore,
      cashFlowScore,
      activityScore,
    );
    const weakest = pillars.reduce(
      (min, p) => (p.score / p.max < min.score / min.max ? p : min),
      pillars[0],
    );

    // Calculate delta (simplified: 1/4 of savings rate change as a placeholder for total score delta)
    const scoreDelta = Math.round(savingsRateScore.change / 4);
    const tipsCount = pillars.filter(p => p.score < p.max * 0.7).length;

    return {
      score: totalScore,
      grade,
      scoreDelta,
      tipsCount,
      pillars,
      tip: this.getTip(weakest.name),
      comparisonText: this.getComparisonText(savingsRateScore.change),
      savingsRate: Math.round(savingsRateScore.rate),
      updatedAt: new Date(),
    };
  }

  private getDateRanges() {
    const now = new Date();
    return {
      startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
      startOfLastMonth: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    };
  }

  private filterTransactionsByMonth(transactions: any[], startOfMonth: Date, startOfLastMonth: Date) {
    return {
      currentMonthTxns: transactions.filter((t) => t.date >= startOfMonth),
      lastMonthTxns: transactions.filter(
        (t) => t.date >= startOfLastMonth && t.date < startOfMonth,
      ),
    };
  }

  private calculateIncomeExpenses(currentMonthTxns: any[], lastMonthTxns: any[]) {
    return {
      totalIncome: currentMonthTxns
        .filter((t) => t.category === "INCOME")
        .reduce((sum, t) => sum + Number(t.amount), 0),
      totalExpenses: Math.abs(
        currentMonthTxns
          .filter((t) => t.category !== "INCOME")
          .reduce((sum, t) => sum + Number(t.amount), 0),
      ),
      lastMonthIncome: lastMonthTxns
        .filter((t) => t.category === "INCOME")
        .reduce((sum, t) => sum + Number(t.amount), 0),
      lastMonthExpenses: Math.abs(
        lastMonthTxns
          .filter((t) => t.category !== "INCOME")
          .reduce((sum, t) => sum + Number(t.amount), 0),
      ),
    };
  }

  private calculateSavingsRate(
    totalIncome: number,
    totalExpenses: number,
    lastMonthIncome: number,
    lastMonthExpenses: number,
  ) {
    const rate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    const score = totalIncome > 0 ? Math.min(Math.max(rate / 20, 0), 1) * 20 : 0;
    const lastRate =
      lastMonthIncome > 0 ? ((lastMonthIncome - lastMonthExpenses) / lastMonthIncome) * 100 : 0;
    return { score, rate, change: rate - lastRate };
  }

  private calculateBudgetScore(budgets: any[], currentMonthTxns: any[]) {
    if (budgets.length === 0) return 5;
    const scores = budgets.map((budget) => {
      const spent = Math.abs(
        currentMonthTxns
          .filter((t) => t.category === budget.category)
          .reduce((sum, t) => sum + Number(t.amount), 0),
      );
      const usage = Number(budget.amount) > 0 ? (spent / Number(budget.amount)) * 100 : 0;
      if (usage <= 80) return 20;
      if (usage <= 100) return 20 * (1 - (usage - 80) / 20);
      return 0;
    });
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private calculateDiversification(assets: any[]) {
    return Math.min(new Set(assets.map((a) => a.type)).size / 3, 1) * 20;
  }

  private calculateCashFlow(totalIncome: number, totalExpenses: number) {
    const cashFlow = totalIncome - totalExpenses;
    if (cashFlow > 0) return 20;
    if (cashFlow === 0) return 10;
    return Math.max(10 * (1 - Math.min(Math.abs(cashFlow) / (totalIncome || 1), 1)), 0);
  }

  private calculateActivity(
    budgets: any[],
    assets: any[],
    transactions: any[],
    priceMap: Map<string, number>,
  ) {
    let score = 0;
    if (budgets.length > 0) score += 5;
    if (assets.length > 0) score += 5;
    if (transactions.length > 0) score += 5;
    const netWorth =
      assets.reduce((sum, a) => sum + (priceMap.get(a.symbol) || 0) * Number(a.amount), 0) +
      transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    if (netWorth > 0) score += 5;
    return score;
  }

  private getGrade(score: number) {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Poor";
  }

  private buildPillars(
    savingsRate: number,
    budget: number,
    diversification: number,
    cashFlow: number,
    activity: number,
  ) {
    return [
      { name: "Savings Rate", score: Math.round(savingsRate), max: 20 },
      { name: "Budget Adherence", score: Math.round(budget), max: 20 },
      { name: "Diversification", score: Math.round(diversification), max: 20 },
      { name: "Cash Flow", score: Math.round(cashFlow), max: 20 },
      { name: "Activity", score: Math.round(activity), max: 20 },
    ];
  }

  private getTip(pillarName: string) {
    const tips: Record<string, string> = {
      "Savings Rate":
        "Try to save at least 20% of your monthly income. Even small increases compound over time!",
      "Budget Adherence":
        "You're overspending in some categories. Review your budgets and adjust limits or spending habits.",
      Diversification:
        "Consider diversifying your portfolio across stocks, crypto, and cash to reduce risk.",
      "Cash Flow":
        "Your expenses are exceeding your income. Look for areas to cut back or increase earnings.",
      Activity:
        "Set up budgets, add assets, and track transactions to get a more complete financial picture.",
    };
    return tips[pillarName];
  }

  private getComparisonText(change: number) {
    if (change > 0) {
      return `Your savings rate is ${Math.abs(Math.round(change))}% higher than last month. Keep it up!`;
    }
    if (change < 0) {
      return `Your savings rate dropped ${Math.abs(Math.round(change))}% from last month. Let's get back on track.`;
    }
    return `Your financial habits are consistent. Keep building towards your goals!`;
  }

  // --- Exchange Rate Cache ---
  private cachedRates: {
    rates: Record<string, number>;
    fetchedAt: number;
  } | null = null;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  async getExchangeRates(baseCurrency: string = "USD") {
    // Return cached rates if fresh
    if (
      this.cachedRates &&
      Date.now() - this.cachedRates.fetchedAt < this.CACHE_TTL
    ) {
      return this.cachedRates.rates;
    }

    try {
      const response = await fetch(
        `https://open.er-api.com/v6/latest/${baseCurrency}`,
      );
      const data = await response.json();

      if (data.result === "success") {
        this.cachedRates = { rates: data.rates, fetchedAt: Date.now() };
        return data.rates;
      }

      throw new Error("Exchange rate API returned an error");
    } catch (error) {
      // Return fallback rates if API fails
      return {
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        NGN: 1550,
        JPY: 149.5,
        CAD: 1.36,
        AUD: 1.53,
        CHF: 0.88,
        CNY: 7.24,
        INR: 83.1,
        BRL: 4.97,
        ZAR: 18.5,
        AED: 3.67,
        SAR: 3.75,
        KES: 153,
      };
    }
  }
}
