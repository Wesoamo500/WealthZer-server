import { Controller, Get, Post, Body, Inject, UseGuards } from '@nestjs/common';
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
}
