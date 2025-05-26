import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CommonModule } from 'src/common/common.module';
import { AuthModule } from '../auth.module';
import { UserService } from './user.service';

describe('UserService Integration Test', () => {
	let app: INestApplication;
	let userService: UserService;

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AuthModule, CommonModule],
			providers: [],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();

		userService = moduleRef.get<UserService>(UserService);
	});

	it('email, password를 넣으면 DB에 유저를 저장한다', async () => {
		const email = `test_${new Date().getTime()}@example.com`;
		const password = 'test_password';
		const { token } = await userService.signUp(email, password);
		console.log(token);
		expect(token).toBeDefined();
	});
});
