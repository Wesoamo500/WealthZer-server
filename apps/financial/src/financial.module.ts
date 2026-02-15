import { Module } from '@nestjs/common';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../auth/src/prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  controllers: [FinancialController],
  providers: [FinancialService],
})
export class FinancialModule {}
