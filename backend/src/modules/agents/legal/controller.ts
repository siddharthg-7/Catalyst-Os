import { Controller, Post, Body } from '@nestjs/common';
import { LegalService } from './service';
import { LegalAuditInput } from './schema';

@Controller('agents/legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Post('vet')
  vet(@Body() body: LegalAuditInput) {
    return this.legalService.vetAgreement(body);
  }
}
