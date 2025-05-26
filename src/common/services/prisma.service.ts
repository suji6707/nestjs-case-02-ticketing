import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
	private logger = new Logger(PrismaService.name);

	constructor() {
		super({
			log: ['query', 'info', 'warn', 'error'],
			errorFormat: 'pretty',
		});
	}

	async onModuleInit(): Promise<void> {
		this.$on('query' as never, (e: Prisma.QueryEvent) => {
			this.logger.debug(`Query: ${e.query}`);
			this.logger.debug(`Params: ${e.params}`);
			this.logger.debug(`Duration: ${e.duration}ms`);
		});
		await this.$connect();
	}
}
