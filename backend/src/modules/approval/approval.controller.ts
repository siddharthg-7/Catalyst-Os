import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApprovalService } from './approval.service';

@Controller('approval')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get(':startupId')
  getPending(@Param('startupId') startupId: string) {
    return this.approvalService.listPending(startupId);
  }

  @Post(':id/review')
  reviewItem(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; feedback?: string }
  ) {
    return this.approvalService.review(id, body.action, body.feedback);
  }
}
