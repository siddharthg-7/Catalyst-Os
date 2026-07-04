import { Injectable } from '@nestjs/common';
import { GrowthTools } from './tools';
import { GrowthCampaignInput, GrowthCampaignOutput } from './schema';

@Injectable()
export class GrowthService {
  constructor(private readonly tools: GrowthTools) {}

  async evaluateCampaign(input: GrowthCampaignInput): Promise<GrowthCampaignOutput> {
    const calc = this.tools.forecastAdWords(input.budget, 2.5);
    return {
      channel: input.channel,
      expectedSignups: Math.round(calc.clicks * 0.05), // 5% conversion rate
      estimatedCac: 50.0,
    };
  }
}
