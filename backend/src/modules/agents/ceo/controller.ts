import { Controller, Post, Body } from '@nestjs/common';
import { CeoService } from './service';
import { CeoPlanInput } from './schema';

@Controller('agents/ceo')
export class CeoController {
  constructor(private readonly ceoService: CeoService) {}

  @Post('plan')
  async createPlan(@Body() body: CeoPlanInput) {
    return this.ceoService.executePlan(body);
  }
}
