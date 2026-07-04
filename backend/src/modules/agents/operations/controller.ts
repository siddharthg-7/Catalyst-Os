import { Controller, Post, Body } from '@nestjs/common';
import { OperationsService } from './service';
import { OperationsCheckInput } from './schema';

@Controller('agents/operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Post('check')
  check(@Body() body: OperationsCheckInput) {
    return this.operationsService.checkUptime(body);
  }
}
