import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): string {
    return 'WealthZer API Gateway is healthy';
  }
}
