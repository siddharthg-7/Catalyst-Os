import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MemoryService } from './memory.service';

@Controller('memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get(':startupId')
  getMemories(@Param('startupId') startupId: string) {
    return this.memoryService.listMemories(startupId);
  }

  @Post(':startupId')
  addMemory(
    @Param('startupId') startupId: string,
    @Body() body: { category: string; title: string; description: string }
  ) {
    return this.memoryService.storeMemory(startupId, body.category, body.title, body.description);
  }
}
