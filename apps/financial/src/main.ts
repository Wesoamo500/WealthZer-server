import { NestFactory } from '@nestjs/core';
import { FinancialModule } from './financial.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('FinancialService');
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(FinancialModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3002,
    },
  });
  
  await app.listen();
  logger.log('Financial Microservice is listening on port 3002');
}
bootstrap();
