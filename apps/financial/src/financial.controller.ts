import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FinancialService } from './financial.service';
import { MarketService } from './market.service';
import { CreateTransactionDto, CreateAssetDto, UpdateAssetValueDto, CreateBudgetDto } from '@wealthzer/shared';

@Controller()
export class FinancialController {
  constructor(
    private readonly financialService: FinancialService,
    private readonly marketService: MarketService,
  ) {}

  @MessagePattern({ cmd: 'create-transaction' })
  async createTransaction(@Payload() data: { userId: string, dto: CreateTransactionDto }) {
    return this.financialService.createTransaction(data.userId, data.dto);
  }

  @MessagePattern({ cmd: 'get-transactions' })
  async getTransactions(@Payload() data: { userId: string }) {
    return this.financialService.getTransactions(data.userId);
  }

  @MessagePattern({ cmd: 'get-portfolio' })
  async getPortfolio(@Payload() data: { userId: string }) {
    return this.financialService.getPortfolioWithPrices(data.userId);
  }

  @MessagePattern({ cmd: 'add-asset' })
  async addAsset(@Payload() data: { userId: string, dto: CreateAssetDto }) {
    return this.financialService.addAsset(data.userId, data.dto);
  }

  @MessagePattern({ cmd: 'create-budget' })
  async createBudget(@Payload() data: { userId: string, dto: CreateBudgetDto }) {
    return this.financialService.createBudget(data.userId, data.dto);
  }

  @MessagePattern({ cmd: 'get-budgets' })
  async getBudgets(@Payload() data: { userId: string }) {
    return this.financialService.getBudgets(data.userId);
  }

  @MessagePattern({ cmd: 'get-net-worth' })
  async getNetWorth(@Payload() data: { userId: string }) {
    return this.financialService.getNetWorth(data.userId);
  }

  @MessagePattern({ cmd: 'get-health-score' })
  async getHealthScore(@Payload() data: { userId: string }) {
    return this.financialService.getHealthScore(data.userId);
  }

  @MessagePattern({ cmd: 'get-exchange-rates' })
  async getExchangeRates(@Payload() data: { baseCurrency?: string }) {
    return this.financialService.getExchangeRates(data.baseCurrency);
  }

  @MessagePattern({ cmd: 'get-historical-net-worth' })
  async getHistoricalNetWorth(@Payload() data: { userId: string, period: string }) {
    return this.financialService.getHistoricalNetWorth(data.userId, data.period);
  }

  // ── Market Data Patterns ──────────────────────────────────
  @MessagePattern({ cmd: 'get-market-tickers' })
  async getMarketTickers(@Payload() data: { category?: string }) {
    return this.marketService.getMarketTickers(data.category);
  }

  @MessagePattern({ cmd: 'search-tickers' })
  async searchTickers(@Payload() data: { query: string }) {
    return this.marketService.searchTickers(data.query);
  }

  @MessagePattern({ cmd: 'get-watchlist' })
  async getWatchlist(@Payload() data: { userId: string }) {
    return this.marketService.getUserWatchlist(data.userId);
  }

  @MessagePattern({ cmd: 'toggle-watchlist' })
  async toggleWatchlist(@Payload() data: { userId: string, symbol: string, type: string }) {
    return this.marketService.toggleWatchlist(data.userId, data.symbol, data.type);
  }

  @MessagePattern({ cmd: 'get-ticker-detail' })
  async getTickerDetail(@Payload() data: { symbol: string, type: string }) {
    return this.marketService.getTickerDetail(data.symbol, data.type);
  }

  @MessagePattern({ cmd: 'get-market-history' })
  async getMarketHistory(@Payload() data: { symbol: string, type: string, period?: string }) {
    return this.marketService.getMarketHistory(data.symbol, data.type, data.period);
  }
}
