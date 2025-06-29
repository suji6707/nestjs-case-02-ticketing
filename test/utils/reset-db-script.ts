import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function resetCharge(): Promise<void> {
	console.log('Resetting database for k6 tests...');

	await prisma.pointHistoryEntity.deleteMany({});
	await prisma.userPointEntity.deleteMany({});
	await prisma.reservationEntity.deleteMany({});

	console.log('Database reset completed.');

	// AUTO_INCREMENT 리셋
	await prisma.$executeRaw`ALTER TABLE reservations AUTO_INCREMENT = 1;`;
	await prisma.$executeRaw`ALTER TABLE user_points AUTO_INCREMENT = 1;`;
	await prisma.$executeRaw`ALTER TABLE point_histories AUTO_INCREMENT = 1;`;
}

resetCharge()
	.catch((e) => {
		console.error('Failed to reset database:', e);
		process.exit(1);
	})
	.finally(() => {
		prisma.$disconnect();
	});
