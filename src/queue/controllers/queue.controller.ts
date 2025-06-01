import { Body, Controller, Post } from '@nestjs/common';
import { QueueService } from '../services/queue.service';

@Controller('queue')
export class QueueController {
	constructor(private readonly queueService: QueueService) {}
}
