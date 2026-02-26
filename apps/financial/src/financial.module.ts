import { Module } from '@nestjs/common';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { PriceService } from './price.service';
import { PriceSyncService } from './price-sync.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../auth/src/prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  controllers: [FinancialController],
  providers: [FinancialService, PriceService, PriceSyncService],
})
export class FinancialModule {}
