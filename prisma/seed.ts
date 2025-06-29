import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function refresh(): Promise<void> {
	console.log('Deleting existing data...');
	await prisma.reservationEntity.deleteMany({});
	await prisma.seatEntity.deleteMany({});
	await prisma.concertScheduleEntity.deleteMany({});
	await prisma.concertEntity.deleteMany({});
	console.log('Existing data deleted.');

	// MySQL AUTO_INCREMENT 리셋
	await prisma.$executeRaw`ALTER TABLE reservations AUTO_INCREMENT = 1;`;
	await prisma.$executeRaw`ALTER TABLE seats AUTO_INCREMENT = 1;`;
	await prisma.$executeRaw`ALTER TABLE concert_schedules AUTO_INCREMENT = 1;`;
	await prisma.$executeRaw`ALTER TABLE concerts AUTO_INCREMENT = 1;`;
}

async function main(): Promise<void> {
	await refresh();

	// Create a concert
	const concert = await prisma.concertEntity.create({
		data: {
			title: '블랙핑크 월드투어',
			description: 'BORN PINK',
		},
	});
	console.log(`Created concert: ${concert.title}`);

	// Create a schedule for the concert
	// 7주일동안 매일 1시~5시
	const startAt = new Date('2025-12-25T13:00:00+09:00');

	for (let i = 0; i < 7; i++) {
		startAt.setDate(startAt.getDate() + 1);
		const endAt = new Date(startAt);
		endAt.setHours(endAt.getHours() + 4);
		const schedule = await prisma.concertScheduleEntity.create({
			data: {
				concertId: concert.id,
				startAt,
				endAt,
				basePrice: 50000,
				totalSeats: 50,
			},
		});
		console.log(`Created schedule at: ${schedule.startAt}`);

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

		await prisma.seatEntity.createMany({
			data: seatsToCreate,
		});

		console.log(`Created 50 seats for schedule ID: ${schedule.id}`);
		console.log('Database has been seeded. 🌱');
	}
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});

// 유저플로우 따로. 미리 생성해둔후, k6에선 userId 1~50까지 login.
async function createUsers(): Promise<void> {
	await prisma.reservationEntity.deleteMany({});
	await prisma.userPointEntity.deleteMany({});
	await prisma.pointHistoryEntity.deleteMany({});
	await prisma.userEntity.deleteMany({});

	// MySQL AUTO_INCREMENT 리셋 - 각 테이블마다 별도 실행
	await prisma.$executeRaw`ALTER TABLE users AUTO_INCREMENT = 1;`;
	await prisma.$executeRaw`ALTER TABLE user_points AUTO_INCREMENT = 1;`;
	await prisma.$executeRaw`ALTER TABLE point_histories AUTO_INCREMENT = 1;`;
	await prisma.$executeRaw`ALTER TABLE reservations AUTO_INCREMENT = 1;`;

	const numUser = 50;
	for (let i = 0; i < numUser; i++) {
		await prisma.userEntity.create({
			data: {
				email: `test_${i + 1}@example.com`,
				encryptedPassword:
					'$2b$10$MIv9WMWzzrT4TOnOwAxtDOJn/X8rP4QL5IjUQnGMjihszThyO6G5G', // test-password
			},
		});
	}
}

// createUsers()
// 	.catch((e) => {
// 		console.error(e);
// 		process.exit(1);
// 	})
// 	.finally(() => {
// 		prisma.$disconnect();
// 	});
