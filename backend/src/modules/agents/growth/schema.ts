export interface GrowthCampaignInput {
  budget: number;
  channel: string;
}

export interface GrowthCampaignOutput {
  channel: string;
  expectedSignups: number;
  estimatedCac: number;
}
