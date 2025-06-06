import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from './jwt.service';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private readonly jwtService: JwtService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();
		const token = request.headers.authorization?.split(' ')[1];
		if (!token) {
			return false;
		}
		const decoded = await this.jwtService.verifyJwtAsync(token);

		request.userId = decoded.userId;
		return true;
	}
}
