import { Controller, Get, Post, Body, Inject, UseGuards, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateTransactionDto, CreateAssetDto, CreateBudgetDto } from '@wealthzer/shared';
import { firstValueFrom } from 'rxjs';
import { User } from '../auth/user.decorator';

@Controller('financial')
export class FinancialController {
  constructor(@Inject('FINANCIAL_SERVICE') private readonly financialClient: ClientProxy) {}

  @Post('transactions')
  async createTransaction(@User('userId') userId: string, @Body() dto: CreateTransactionDto) {
    return firstValueFrom(this.financialClient.send({ cmd: 'create-transaction' }, { userId, dto }));
  }

  @Get('transactions')
  async getTransactions(@User('userId') userId: string) {
    return firstValueFrom(this.financialClient.send({ cmd: 'get-transactions' }, { userId }));
  }

  @Get('portfolio')
  async getPortfolio(@User('userId') userId: string) {
    return firstValueFrom(this.financialClient.send({ cmd: 'get-portfolio' }, { userId }));
  }

  @Post('assets')
  async addAsset(@User('userId') userId: string, @Body() dto: CreateAssetDto) {
    return firstValueFrom(this.financialClient.send({ cmd: 'add-asset' }, { userId, dto }));
  }

  @Get('net-worth')
  async getNetWorth(@User('userId') userId: string) {
    return firstValueFrom(this.financialClient.send({ cmd: 'get-net-worth' }, { userId }));
  }

  @Get('health-score')
  async getHealthScore(@User('userId') userId: string) {
    return firstValueFrom(this.financialClient.send({ cmd: 'get-health-score' }, { userId }));
  }

  @Get('exchange-rates')
  async getExchangeRates() {
    return firstValueFrom(this.financialClient.send({ cmd: 'get-exchange-rates' }, {}));
  }

  @Post('budgets')
  async createBudget(@User('userId') userId: string, @Body() dto: CreateBudgetDto) {
    return firstValueFrom(this.financialClient.send({ cmd: 'create-budget' }, { userId, dto }));
  }

  @Get('budgets')
  async getBudgets(@User('userId') userId: string) {
    return firstValueFrom(this.financialClient.send({ cmd: 'get-budgets' }, { userId }));
  }

  @Get('historical-net-worth')
  async getHistoricalNetWorth(@User('userId') userId: string, @Query('period') period: string) {
    return firstValueFrom(this.financialClient.send({ cmd: 'get-historical-net-worth' }, { userId, period }));
  }

  // ── Market Data ───────────────────────────────────────────
  @Get('markets')
  async getMarketTickers(@Query('category') category?: string) {
    return firstValueFrom(this.financialClient.send({ cmd: 'get-market-tickers' }, { category }));
  }

  @Get('markets/search')
  async searchTickers(@Query('q') query: string) {
    return firstValueFrom(this.financialClient.send({ cmd: 'search-tickers' }, { query }));
  }

  @Get('watchlist')
  async getWatchlist(@User('userId') userId: string) {
    return firstValueFrom(this.financialClient.send({ cmd: 'get-watchlist' }, { userId }));
  }

  @Post('watchlist/toggle')
  async toggleWatchlist(
    @User('userId') userId: string,
    @Body() dto: { symbol: string; type: string },
  ) {
    return firstValueFrom(
      this.financialClient.send({ cmd: 'toggle-watchlist' }, { userId, ...dto }),
    );
  }

  @Get('markets/detail')
  async getTickerDetail(@Query('symbol') symbol: string, @Query('type') type: string) {
    return firstValueFrom(
      this.financialClient.send({ cmd: 'get-ticker-detail' }, { symbol, type }),
    );
  }

  @Get('markets/history')
  async getMarketHistory(
    @Query('symbol') symbol: string,
    @Query('type') type: string,
    @Query('period') period?: string,
  ) {
    return firstValueFrom(
      this.financialClient.send({ cmd: 'get-market-history' }, { symbol, type, period }),
    );
  }
}
