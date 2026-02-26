import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FinancialService } from './financial.service';
import { CreateTransactionDto, CreateAssetDto, UpdateAssetValueDto, CreateBudgetDto } from '@wealthzer/shared';

@Controller()
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

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
}
