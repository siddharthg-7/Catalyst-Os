import { Controller, Post, Body } from '@nestjs/common';
import { FinanceService } from './service';
import { FinanceAuditInput } from './schema';

@Controller('agents/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('audit')
  audit(@Body() body: FinanceAuditInput) {
    return this.financeService.auditExpense(body);
  }
}
