import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getHealth(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
      },
    });
  }

  @Get('details')
  async getDetailedHealth(@Res() res: Response) {
    let dbStatus = 'healthy';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'degraded';
    }

    return res.status(HttpStatus.OK).json({
      status: dbStatus === 'healthy' ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        database: dbStatus,
      },
    });
  }
}
