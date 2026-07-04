import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';

@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get(':startupId')
  getFiles(@Param('startupId') startupId: string) {
    return this.knowledgeService.listFiles(startupId);
  }

  @Post(':startupId')
  uploadFile(
    @Param('startupId') startupId: string,
    @Body() body: { name: string; content: string; type: string }
  ) {
    return this.knowledgeService.uploadFile(startupId, body.name, body.content, body.type);
  }
}
