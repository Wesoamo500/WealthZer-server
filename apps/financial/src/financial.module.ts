import { Module } from '@nestjs/common';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { PriceService } from './price.service';
import { MarketService } from './market.service';
import { PriceSyncService } from './price-sync.service';
import { PrismaModule } from '../../auth/src/prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [FinancialController],
  providers: [
    FinancialService,
    PriceService,
    MarketService,
    PriceSyncService,
  ],
  exports: [FinancialService, MarketService],
})
export class FinancialModule {}
