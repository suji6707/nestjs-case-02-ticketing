import { Global, Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { UserRepository } from './repositories/user.repository';
import { AuthGuard } from './services/auth.guard';
import { JwtService } from './services/jwt.service';
import { UserService } from './services/user.service';

@Global()
@Module({
	imports: [],
	providers: [UserService, UserRepository, JwtService, AuthGuard],
	controllers: [AuthController],
	exports: [AuthGuard, JwtService],
})
export class AuthModule {}
