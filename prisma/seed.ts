import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
		let seatNumber = 1;
		for (const className of classes) {
			for (let i = 0; i < 10; i++) {
				seatsToCreate.push({
					scheduleId: schedule.id,
					number: seatNumber++,
					className: className,
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

async function refresh(): Promise<void> {
	console.log('Deleting existing data...');
	await prisma.reservationEntity.deleteMany({});
	await prisma.seatEntity.deleteMany({});
	await prisma.concertScheduleEntity.deleteMany({});
	await prisma.concertEntity.deleteMany({});
	console.log('Existing data deleted.');
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
