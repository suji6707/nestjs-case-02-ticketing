import { Global, Module } from '@nestjs/common';
import { AuthGuard } from './application/services/auth.guard';
import { JwtService } from './application/services/jwt.service';
import { UserService } from './application/services/user.service';
import { AuthController } from './controllers/auth.controller';
import { UserPrismaRepository } from './infrastructure/persistence/user.prisma.repository';

@Global()
@Module({
	imports: [],
	providers: [
		UserService,
		{ provide: 'IUserRepository', useClass: UserPrismaRepository },
		JwtService,
		AuthGuard,
	],
	controllers: [AuthController],
	exports: [AuthGuard, JwtService],
})
export class AuthModule {}
