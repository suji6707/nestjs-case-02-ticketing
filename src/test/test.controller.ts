import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TestService } from './test.service';

@ApiTags('Test')
@Controller('test')
export class TestController {
	constructor(private readonly testService: TestService) {}

	@Post('/reset-data')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: '테스트 데이터 초기화',
		description: 'K6 성능 테스트를 위한 데이터베이스 및 Redis 초기화',
	})
	@ApiResponse({ status: 200, description: '데이터 초기화 성공' })
	async resetTestData(): Promise<{ message: string }> {
		await this.testService.resetTestData();
		return { message: 'Test data reset completed' };
	}

	@Post('/flush-redis')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Redis 캐시 초기화',
		description: 'Redis의 모든 캐시 데이터 삭제',
	})
	@ApiResponse({ status: 200, description: 'Redis 캐시 초기화 성공' })
	async flushRedis(): Promise<{ message: string }> {
		await this.testService.flushRedis();
		return { message: 'Redis cache flushed' };
	}

	@Post('/seed-users')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: '테스트 사용자 생성',
		description: 'K6 테스트용 사용자 50명 생성',
	})
	@ApiResponse({ status: 200, description: '테스트 사용자 생성 성공' })
	async seedTestUsers(): Promise<{ message: string; count: number }> {
		const count = await this.testService.seedTestUsers();
		return { message: 'Test users created', count };
	}
}
