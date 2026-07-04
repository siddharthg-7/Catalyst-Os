import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { StartupService } from './startup.service';

@Controller('startup')
export class StartupController {
  constructor(private readonly startupService: StartupService) {}

  @Get(':id')
  getProfile(@Param('id') id: string) {
    return this.startupService.getProfile(id);
  }

  @Post(':id')
  updateProfile(@Param('id') id: string, @Body() body: any) {
    return this.startupService.updateProfile(id, body);
  }
}
