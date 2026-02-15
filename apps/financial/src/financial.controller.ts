import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FinancialService } from './financial.service';
import { CreateTransactionDto, CreateAssetDto, UpdateAssetValueDto } from '@wealthzer/shared';

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
    return this.financialService.getPortfolio(data.userId);
  }

  @MessagePattern({ cmd: 'add-asset' })
  async addAsset(@Payload() data: { userId: string, dto: CreateAssetDto }) {
    return this.financialService.addAsset(data.userId, data.dto);
  }

  @MessagePattern({ cmd: 'get-net-worth' })
  async getNetWorth(@Payload() data: { userId: string }) {
    return this.financialService.getNetWorth(data.userId);
  }
}
