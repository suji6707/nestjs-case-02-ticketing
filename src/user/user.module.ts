import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { UserRepository } from './repositories/user.repository';

@Module({
  imports:[],
  providers: [UserService, UserRepository],
  controllers: [UserController]
})
export class UserModule {}
