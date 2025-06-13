import Redis from 'ioredis';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

let container: StartedTestContainer;
let redisClient: Redis;

beforeAll(async () => {
	container = await new GenericContainer('redis')
		.withExposedPorts(6379)
		.start();

	redisClient = new Redis({
		host: container.getHost(),
		port: container.getMappedPort(6379),
		reconnectOnError: (err): boolean => {
			console.log(err);
			return false;
		},
	});
	process.env.REDIS_HOST = container.getHost();
	process.env.REDIS_PORT = String(container.getMappedPort(6379));

	console.log('Test redis connected');
});

afterAll(async () => {
	if (redisClient.status !== 'end') {
		await redisClient.quit();
		console.log('Redis client closed');
	}
	if (container) await container.stop();
});

// it('should set and retrieve values from Redis', async () => {
// 	await redisClient.set('test', 'val');
// 	expect(await redisClient.get('test')).toEqual('val');
// });

export { redisClient as RedisClientRef };
