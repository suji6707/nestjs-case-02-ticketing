import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';

/**
 * Reservation 성능테스트
 * - Only optimisic lock
 * - Distributed lock + 조건부 UPDATE
 */
export const options = {
	vus: 50,
	iterations: 50,
	thresholds: {
		// http_req_failed: ['rate<0.01'],
		http_req_duration: ['p(95)<10000'],
		login_success: ['rate>0.9'],
		queue_token_success: ['rate>0.9'],
		charge_success: ['rate>0.9'],
		reserve_success: ['rate>=0.2'], // 1/50
		confirm_success: ['rate>=0.2'], // 1/50
	},
};

export function setup() {
	const vu = options.vus;
	return { vu };
}

const BASE_URL = 'http://localhost:3001/api';

const loginSucess = new Rate('login_success');
const queueTokenSucess = new Rate('queue_token_success');
const chargeSucess = new Rate('charge_success');
const reserveSucess = new Rate('reserve_success');
const confirmSucess = new Rate('confirm_success');

export default function () {
	const userId = __VU; // 현재 유저
	console.log('userId', userId);

	// 50명 전부 로그인 ================================================
	const payload1 = JSON.stringify({
		email: `test_${userId}@example.com`,
		password: 'test-password',
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
	const { token: queueToken } = JSON.parse(res2.body);
	console.log('queueToken', queueToken);

	// 충전 ============================================================
	const payload3 = JSON.stringify({
		amount: 200000,
	});
	const res3 = http.patch(`${BASE_URL}/payment/charge`, payload3, headers);
	const chargeCheck = check(res3, {
		charge_success: (r) => r.status === 200 && r.json().balance,
	});
	chargeSucess.add(chargeCheck);
	const { balance: chargedBalance } = JSON.parse(res3.body);

	// 예약 ============================================================
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
	reserveSucess.add(1);

	const { reservationId, paymentToken } = JSON.parse(res4.body);
	if (reservationId) {
		console.log(`User ${userId} reservation succeed!`);
	}
	if (!global.reservations) {
		global.reservations = [];
	}
	global.reservations.push({ userId, reservationId });

	// 결제 ============================================================
	const payload5 = JSON.stringify({
		paymentToken,
	});
	const res5 = http.post(
		`${BASE_URL}/ticketing/reservation/confirm`,
		payload5,
		headers,
	);
	const confirmCheck = check(res5, {
		confirm_success: (r) => r.status === 201 && r.json().reservation,
	});
	confirmSucess.add(confirmCheck);

	const { reservation } = JSON.parse(res5.body);
	if (reservation) {
		console.log(
			`User ${userId} reservation succeed! status ${reservation.status}`,
		);
	}
}

export function teardown(data) {
	console.log('teardown', data);
	const authTokens = global.authTokens;
	const reservations = global.reservations;

	console.log('authTokens', authTokens);
	console.log('reservations', reservations);

	let successCount = 0;
	let failedCount = 0;
	// 검증용 API
	for (const { userId, reservationId } of reservations) {
		const authToken = authTokens.find((token) => token.userId === userId);
		const headers = {
			headers: {
				Authorization: `Bearer ${authToken.token}`,
				'Content-Type': 'application/json',
			},
		};
		const res = http.get(
			`${BASE_URL}/ticketing/reservation/${reservationId}`,
			headers,
		);
		const reservation = JSON.parse(res.body);
		console.log('reservation', reservation.status);

		if (reservation.status === 'CONFIRMED') {
			successCount++;
		} else {
			failedCount++;
		}
	}
	console.log('successCount', successCount);
	console.log('failedCount', failedCount);
}
