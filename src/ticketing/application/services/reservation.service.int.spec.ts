import { Test, TestingModule } from '@nestjs/testing';
import { ReservationService } from './reservation.service';

describe('ReservationService', () => {
	let service: ReservationService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [ReservationService],
		}).compile();

		service = module.get<ReservationService>(ReservationService);
	});

	/**
	 * 예약 요청 시나리오
	 * 0. redis에 대기열 토큰이 있는지 검증한다.
	 * 1. 좌석이 이미 배정되어있으면 에러를 반환한다.
	 * 2. 좌석이 배정상태가 아니면 배정 후 reservation 생성, 임시 결제토큰을 받는다.
	 * 3. 트랜잭션: 예약 생성에 실패한 경우 seat status 변경이 롤백된다.
	 *
	 * 결제 요청 시나리오
	 * 0. redis에 결제 토큰이 있는지 검증한다.
	 * 1. 잔액이 충분하면 포인트를 차감하고,
	 * - reservation, seat 업데이트
	 * - 대기열 토큰 및 결제 토큰 삭제
	 */
	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
