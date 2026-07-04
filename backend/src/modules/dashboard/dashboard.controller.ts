import { Controller, Get, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get(':startupId')
  getMetrics(@Param('startupId') startupId: string) {
    return this.dashboardService.getMetrics(startupId);
  }
}
