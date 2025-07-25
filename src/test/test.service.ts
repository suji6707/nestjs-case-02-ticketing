import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { QueueRankingService } from 'src/ticketing/application/services/queue-ranking.service';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis/redis.service';
import { SeatStatus } from '../ticketing/application/domain/models/seat';

@Injectable()
export class TestService {
	constructor(
		private readonly prismaService: PrismaService,
		private readonly redisService: RedisService,
		private readonly queueRankingService: QueueRankingService,
	) {}

	/**
	 * 🔄 테스트 데이터 전체 초기화
	 * - 데이터베이스 초기화 (seed 실행)
	 * - Redis 캐시 초기화
	 * - 테스트 사용자 생성
	 */
	async resetTestData(): Promise<void> {
		console.log('🚀 Starting test data reset...');

		// 1. Redis 캐시 초기화
		await this.flushRedis();

		// 2. 대기열 큐 초기 셋팅
		await this.queueRankingService.initialize();

		// 2. 데이터베이스 초기화 (seed 로직 실행)
		await this.seedDatabase();

		// 3. 테스트 사용자 생성
		await this.seedTestUsers();

		console.log('✅ Test data reset completed');
	}

	/**
	 * 🗑️ Redis 캐시 초기화
	 */
	async flushRedis(): Promise<void> {
		console.log('🧹 Flushing Redis cache...');
		await this.redisService.flushDb();
		console.log('✅ Redis cache flushed');
	}

	/**
	 * 🌱 데이터베이스 시드 데이터 생성
	 * prisma/seed.ts의 로직을 서비스로 이동
	 */
	async seedDatabase(): Promise<void> {
		console.log('🌱 Seeding database...');

		// 기존 데이터 삭제 및 AUTO_INCREMENT 리셋
		await this.prismaService.$executeRaw`DELETE FROM reservations;`;
		await this.prismaService.$executeRaw`DELETE FROM user_points;`;
		await this.prismaService.$executeRaw`DELETE FROM point_histories;`;
		await this.prismaService.$executeRaw`DELETE FROM seats;`;
		await this.prismaService.$executeRaw`DELETE FROM concert_schedules;`;
		await this.prismaService.$executeRaw`DELETE FROM concerts;`;
		await this.prismaService
			.$executeRaw`DELETE FROM users WHERE email LIKE 'test_%@example.com';`;
		// 기타
		await this.prismaService.$executeRaw`DELETE FROM payment_transactions;`;
		await this.prismaService.$executeRaw`DELETE FROM event_logs;`;

		// AUTO_INCREMENT 리셋
		await this.prismaService
			.$executeRaw`ALTER TABLE reservations AUTO_INCREMENT = 1;`;
		await this.prismaService
			.$executeRaw`ALTER TABLE user_points AUTO_INCREMENT = 1;`;
		await this.prismaService
			.$executeRaw`ALTER TABLE point_histories AUTO_INCREMENT = 1;`;
		await this.prismaService.$executeRaw`ALTER TABLE seats AUTO_INCREMENT = 1;`;
		await this.prismaService
			.$executeRaw`ALTER TABLE concert_schedules AUTO_INCREMENT = 1;`;
		await this.prismaService
			.$executeRaw`ALTER TABLE concerts AUTO_INCREMENT = 1;`;
		await this.prismaService.$executeRaw`ALTER TABLE users AUTO_INCREMENT = 1;`;
		// 기타
		await this.prismaService
			.$executeRaw`ALTER TABLE payment_transactions AUTO_INCREMENT = 1;`;
		await this.prismaService
			.$executeRaw`ALTER TABLE event_logs AUTO_INCREMENT = 1;`;

		// 콘서트 생성
		const concert = await this.prismaService.concertEntity.create({
			data: {
				title: '블랙핑크 월드투어',
				description: 'BORN PINK',
			},
		});

		// 콘서트 스케줄 생성 (3일간)
		const startAt = new Date('2025-12-25T13:00:00+09:00');

		for (let i = 0; i < 3; i++) {
			startAt.setDate(startAt.getDate() + 1);
			const endAt = new Date(startAt);
			endAt.setHours(endAt.getHours() + 4);

			const schedule = await this.prismaService.concertScheduleEntity.create({
				data: {
					concertId: concert.id,
					startAt,
					endAt,
					basePrice: 50000,
					totalSeats: 50,
				},
			});

			// 좌석 생성 (50개)
			const classes = ['A', 'B', 'C', 'D', 'E'];
			const prices = {
				A: 150000,
				B: 120000,
				C: 100000,
				D: 80000,
				E: 60000,
			};

			const seatsToCreate = [];
			for (const className of classes) {
				for (let i = 0; i < 10; i++) {
					seatsToCreate.push({
						scheduleId: schedule.id,
						className: `${className}${i + 1}`,
						price: prices[className],
						status: 0, // 0: AVAILABLE, 1: RESERVED, 2: SOLD
					});
				}
			}

			await this.prismaService.seatEntity.createMany({
				data: seatsToCreate,
			});
		}

		console.log('✅ Database seeded successfully');
	}

	/**
	 * 👥 테스트 사용자 50명 생성
	 */
	async seedTestUsers(): Promise<number> {
		console.log('👥 Creating test users...');

		const users = [];
		for (let i = 1; i <= 50; i++) {
			users.push({
				email: `test_${i}@example.com`,
				encryptedPassword:
					'$2b$10$pk6uGvkVq9Q8UoAkI8IlSOcPSRnOFhrk1yit8Hw4Z/tbS8.rI5pHW',
			});
		}

		// 기존 테스트 사용자 삭제
		await this.prismaService.userEntity.deleteMany({
			where: {
				email: {
					startsWith: 'test_',
				},
			},
		});

		// 새 테스트 사용자 생성
		await this.prismaService.userEntity.createMany({
			data: users,
		});

		console.log(`✅ Created ${users.length} test users`);
		return users.length;
	}
}
