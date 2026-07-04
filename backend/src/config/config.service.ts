import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';

@Injectable()
export class ConfigService {
  private readonly envConfig: Record<string, string>;

  constructor() {
    dotenv.config();
    this.envConfig = process.env as Record<string, string>;
  }

  get(key: string): string {
    return this.envConfig[key] || '';
  }

  getOrThrow(key: string): string {
    const val = this.get(key);
    if (!val) {
      throw new Error(`Configuration key "${key}" is missing in environment variables.`);
    }
    return val;
  }

  get isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  get port(): number {
    return parseInt(this.get('PORT') || '3000', 10);
  }
}
