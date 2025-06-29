import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
	private readonly logger = new Logger('http');

	use(req: Request, res: Response, next: NextFunction): void {
		const { ip, method, originalUrl } = req;
		const startTime = new Date().getTime();

		this.logger.log(`Started [${method.toUpperCase()}] ${originalUrl} ${ip}`);
		res.on('finish', () => {
			const endTime = new Date().getTime();
			this.logger.log(
				`Finished [${method.toUpperCase()}] ${originalUrl} - ${endTime - startTime}ms`,
			);
		});

		next();
	}
}
