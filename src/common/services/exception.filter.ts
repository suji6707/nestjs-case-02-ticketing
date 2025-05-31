import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name);

	catch(exception: HttpException, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const status = exception.getStatus();

		this.logger.error(exception);

		if (exception instanceof HttpException) {
			response.status(status).json({
				statusCode: status,
				message: exception.message,
			});
			return;
		}

		response.status(status).json({
			statusCode: status,
			message: 'INTERNAL_SERVER_ERROR',
		});
	}
}
