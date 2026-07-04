import { Controller, Post, Body } from '@nestjs/common';
import { GrowthService } from './service';
import { GrowthCampaignInput } from './schema';

@Controller('agents/growth')
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  @Post('campaign')
  campaign(@Body() body: GrowthCampaignInput) {
    return this.growthService.evaluateCampaign(body);
  }
}
