import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { INestApplication } from '@nestjs/common';
import { UserModule } from '../user.module';
import { DatabaseModule } from 'src/database/database.module';

describe('UserService Integration Test', () => {
  let app: INestApplication;
  let userService: UserService;

  beforeAll(async() => {
    const moduleRef = await Test.createTestingModule({
      imports: [UserModule, DatabaseModule],
      providers: [],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    userService = moduleRef.get<UserService>(UserService);
  })

  it('email, password를 넣으면 DB에 유저를 저장한다', async () => {
    const email = 'test@example.com';
    const password = 'test_hashed_password';
    const user = await userService.signUp(email, password);
    console.log(user);
    expect(user).toBeDefined();
  });
});
