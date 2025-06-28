import { check, group, sleep } from 'k6';
import http from 'k6/http';

/**
 * Payment optimisic lock vs pessimistic lock 성능테스트
 */
export const options = {
	vus: 5,
	iterations: 5,
	thresholds: {
		http_req_failed: ['rate<0.01'],
		http_req_duration: ['p(95)<10000'],
		// todo: custom threshold 추가
	},
};

export function setup() {
	const vu = options.vus;
	return { vu };
}

const BASE_URL = 'http://localhost:3001/api';
// 유저 1명에 대한 잔액 변경
const authToken =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdF8xNzQ5NTY4MDY2NDAwQGV4YW1wbGUuY29tIiwiaWF0IjoxNzUwMzQ0NjUyLCJleHAiOjE3NTA5NDk0NTJ9.ze5zfCjla7zQkEjF5Y0IdX_U7n1ejXY398BYQwrOUP0';
const initialAmount = 0;
const chargeAmount = 10000;

export default function () {
	const payload1 = JSON.stringify({
		concertId: 1,
	});
	const params1 = {
		headers: {
			Authorization: `Bearer ${authToken}`,
			'Content-Type': 'application/json',
		},
		tags: {
			name: 'queue-token',
		},
	};

	const res1 = http.post(
		`${BASE_URL}/ticketing/reservation/token`,
		payload1,
		params1,
	);

	const { token: queueToken } = JSON.parse(res1.body);
	console.log('queueToken', queueToken);

	// 예약 페이지 진입
	sleep(1);

	const payload2 = JSON.stringify({
		amount: 10000,
	});
	const params2 = {
		headers: {
			Authorization: `Bearer ${authToken}`,
			'Content-Type': 'application/json',
		},
		tags: {
			name: 'charge',
		},
	};
	const res2 = http.patch(`${BASE_URL}/payment/charge`, payload2, params2);
	console.log('res2', JSON.parse(res2.body));
	check(
		res2,
		{
			'is status 200': (r) => r.status === 200,
			// 'is balance correct': (r) => JSON.parse(r.body).balance === 10000,
		},
		{
			name: 'charge',
		},
	);
}

export function teardown(data) {
	const params = {
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
	};
	const res = http.get(`${BASE_URL}/payment/balance`, params);
	const finalBalance = JSON.parse(res.body).balance;
	console.log('finalBalance', finalBalance);

	const expectedBalance = initialAmount + chargeAmount * data.vu;
	console.log('expectedBalance', expectedBalance);
	check(
		{ finalBalance },
		{
			'is balance correct': (b) => b.finalBalance === expectedBalance,
		},
	);
}

/**
 * k6 기본:
 * - 스케줄 조회 하나 하려면 auth token, 대기열 토큰 둘 다 있어야함.
 * 	-> auth token: 유저 10명 만들어서(db insert prisma seed 만들어두자.) token 발급, 하드코딩해놓기.
 * 	-> queue token은 매번 새롭게 발급하는게 나을듯?
 * 추후: docker로 설정해서 로컬환경에 맞는 mock db 사용
 *
 */
