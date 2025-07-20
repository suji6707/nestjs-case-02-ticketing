import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';

/**
 * Reservation 성능테스트
 * - Only optimisic lock
 * - Distributed lock + 조건부 UPDATE
 */
export const options = {
	vus: 50,
	iterations: 50,
	// 📊 상세한 백분위수 통계 출력 설정
	summaryTrendStats: [
		'avg',
		'min',
		'med',
		'max',
		'p(50)',
		'p(75)',
		'p(90)',
		'p(95)',
		'p(99)',
	],
	thresholds: {
		http_req_duration: ['p(95)<10000'],
		// Success count thresholds
		login_success: ['count==50'], // All 50 should succeed
		queue_token_success: ['count==50'], // All 50 should succeed
		charge_success: ['count==50'], // All 50 should succeed
		reserve_success: ['count==1'], // Only 1 should succeed
		payment_success: ['count==1'], // Only 1 should succeed
		// Latency thresholds
		login_latency: ['p(95)<2000'], // Login should be under 2s
		queue_token_latency: ['p(95)<1000'], // Queue token should be under 1s
		charge_latency: ['p(95)<1000'], // Charge should be under 1s
		reserve_latency: ['p(95)<3000'], // Reserve should be under 3s (distributed lock)
		payment_latency: ['p(95)<5000'], // Payment should be under 5s (includes Kafka)
		// Latency thresholds (P50, P75, P90, P99 추가)
		// login_latency: ['p(50)<1000', 'p(75)<1500', 'p(90)<2000', 'p(95)<2000', 'p(99)<3000'],
		// queue_token_latency: ['p(50)<500', 'p(75)<750', 'p(90)<1000', 'p(95)<1000', 'p(99)<1500'],
		// charge_latency: ['p(50)<500', 'p(75)<750', 'p(90)<1000', 'p(95)<1000', 'p(99)<1500'],
		// reserve_latency: ['p(50)<1000', 'p(75)<2000', 'p(90)<3000', 'p(95)<3000', 'p(99)<5000'],
		// payment_latency: ['p(50)<2000', 'p(75)<3000', 'p(90)<4000', 'p(95)<5000', 'p(99)<7000'],
	},
};

export function setup() {
	const vu = options.vus;

	// 🔄 테스트 시작 전 데이터 초기화
	console.log('🚀 Setting up test data...');

	// 방법 1: 데이터 초기화 API 호출 (추천)
	const resetResponse = http.post(
		`${BASE_URL}/test/reset-data`,
		{},
		{
			headers: { 'Content-Type': 'application/json' },
		},
	);
	if (resetResponse.status === 200) {
		console.log('✅ Test data reset completed');
	} else {
		console.log('❌ Test data reset failed:', resetResponse.status);
	}
	return { vu };
}

const BASE_URL = 'http://localhost:3001/api';

// Success counters
const loginSucess = new Counter('login_success');
const queueTokenSucess = new Counter('queue_token_success');
const chargeSucess = new Counter('charge_success');
const reserveSucess = new Counter('reserve_success');
const paymentSucess = new Counter('payment_success');

// Latency trends
const loginLatency = new Trend('login_latency');
const queueTokenLatency = new Trend('queue_token_latency');
const chargeLatency = new Trend('charge_latency');
const reserveLatency = new Trend('reserve_latency');
const paymentLatency = new Trend('payment_latency');

export default function () {
	const userId = __VU; // 현재 유저
	console.log('userId', userId);

	// await redisService.flushDb();

	// 50명 전부 로그인 ================================================
	const payload1 = JSON.stringify({
		email: `test_${userId}@example.com`,
		password: 'test_password',
	});
	const authParams = {
		headers: {
			'Content-Type': 'application/json',
		},
	};
	const res1 = http.post(`${BASE_URL}/auth/login`, payload1, authParams);
	const loginCheck = check(res1, {
		login_success: (r) => r.status === 201 && r.json().token,
	});
	loginSucess.add(loginCheck);
	loginLatency.add(res1.timings.duration);
	const { token } = JSON.parse(res1.body);
	if (!global.authTokens) {
		global.authTokens = [];
	}
	global.authTokens.push({ userId, token });

	// 대기열 진입 ======================================================
	const payload2 = JSON.stringify({
		concertId: 1,
	});
	const headers = {
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	};
	const res2 = http.post(
		`${BASE_URL}/ticketing/reservation/token`,
		payload2,
		headers,
	);
	const queueTokenCheck = check(res2, {
		queue_token_success: (r) => r.status === 201 && r.json().token,
	});
	queueTokenSucess.add(queueTokenCheck);
	queueTokenLatency.add(res2.timings.duration);
	const { token: queueToken } = JSON.parse(res2.body);
	// console.log('queueToken', queueToken);

	// 충전 ============================================================
	const payload3 = JSON.stringify({
		amount: 200000,
	});
	const res3 = http.patch(`${BASE_URL}/payment/charge`, payload3, headers);
	const chargeCheck = check(res3, {
		charge_success: (r) => r.status === 200 && r.json().balance,
	});
	chargeSucess.add(chargeCheck);
	chargeLatency.add(res3.timings.duration);

	// 임시 예약 ============================================================
	const seatId = 1; // 동시에 한 좌석 예약
	const payload4 = JSON.stringify({
		seatId,
		queueToken,
	});
	const res4 = http.post(
		`${BASE_URL}/ticketing/reservation/new`,
		payload4,
		headers,
	);
	const reserveCheck = check(res4, {
		reserve_success: (r) => r.status === 201 && r.json().reservationId,
	});
	reserveSucess.add(reserveCheck);
	reserveLatency.add(res4.timings.duration);

	const { reservationId, paymentToken } = JSON.parse(res4.body);
	if (reservationId) {
		console.log(`User ${userId} reservation succeed!`);
	}
	if (!global.reservations) {
		global.reservations = [];
	}
	global.reservations.push({ userId, reservationId });

	// 결제 후 최종예약 ============================================================
	if (!reserveCheck) {
		return; // 예약에 성공한 유저만 결제
	}
	const payload5 = JSON.stringify({
		reservationId,
		paymentToken,
	});
	const res5 = http.patch(`${BASE_URL}/payment/process`, payload5, headers);
	console.log('res5', JSON.parse(res5.body));
	const paymentCheck = check(res5, {
		payment_success: (r) => r.status === 200,
	});
	paymentSucess.add(paymentCheck);
	paymentLatency.add(res5.timings.duration);

	const { reservation } = JSON.parse(res5.body);
	if (reservation) {
		console.log(
			`User ${userId} reservation succeed! status ${reservation.status}`,
		);
	}
}
