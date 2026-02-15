import { NestFactory } from '@nestjs/core';
import { AdvisorModule } from './advisor.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('AdvisorService');
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AdvisorModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3004,
    },
  });
  
  await app.listen();
  logger.log('Advisor Microservice is listening on port 3004');
}
bootstrap();
