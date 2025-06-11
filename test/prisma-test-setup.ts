import 'iconv-lite/encodings'; // 반드시 최상단에
import { MySqlContainer, StartedMySqlContainer } from '@testcontainers/mysql';
import { execSync } from 'child_process';
import { createConnection, Connection } from 'mysql2';
import { PrismaService } from 'src/common/services/prisma.service';

let mysqlContainer: StartedMySqlContainer;
let mysqlClient: Connection;
let prismaServiceRef: PrismaService;

beforeAll(async () => {
	mysqlContainer = await new MySqlContainer().start();
	
	const client = createConnection({
		host: mysqlContainer.getHost(),
		port: mysqlContainer.getPort(),
		user: mysqlContainer.getUsername(),
		password: mysqlContainer.getUserPassword(),
		database: mysqlContainer.getDatabase(),
	})

	mysqlClient = client;

	const databaseUrl = `mysql://${mysqlContainer.getUsername()}:${mysqlContainer.getUserPassword()}@${mysqlContainer.getHost()}:${mysqlContainer.getPort()}/${mysqlContainer.getDatabase()}`;
	console.log(databaseUrl);
	process.env.DATABASE_URL = databaseUrl;

	execSync(`DATABASE_URL=${databaseUrl} npx prisma migrate deploy`)

	prismaServiceRef = new PrismaService();
	// Nest module 시스템을 거치지 않으므로 수동으로 호출
	await prismaServiceRef.onModuleInit();
	console.log('Test database connected and migrations run.')

});

afterAll(async () => {
	if (mysqlClient) mysqlClient.end();
	if (mysqlContainer) await mysqlContainer.stop();
	if (prismaServiceRef) await prismaServiceRef.$disconnect();
});

export { mysqlClient, prismaServiceRef as PrismaServiceRef };