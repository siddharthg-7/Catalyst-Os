import { Controller, Post, Body } from '@nestjs/common';
import { TalentService } from './service';
import { TalentHiringInput } from './schema';

@Controller('agents/talent')
export class TalentController {
  constructor(private readonly talentService: TalentService) {}

  @Post('hire')
  hireRole(@Body() body: TalentHiringInput) {
    return this.talentService.draftRole(body);
  }
}
