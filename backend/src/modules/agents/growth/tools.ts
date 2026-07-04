import { Injectable } from '@nestjs/common';

@Injectable()
export class GrowthTools {
  forecastAdWords(budget: number, cpc: number) {
    return { clicks: Math.round(budget / cpc), cost: budget };
  }
}
