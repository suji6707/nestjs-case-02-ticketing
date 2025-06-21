# 콘서트 예약 시스템 동시성 제어 보고서

## 1. 개요

- 주제: 콘서트 예약 서비스의 핵심 기능 구현 시 발생할 수 있는 주요 동시성 이슈를 정의하고, 이를 해결하기 위해 적용한 기술적 전략과 테스트 결과를 기술. 
- 목표: 대규모 트래픽이 집중되는 콘서트 예약 환경에서 데이터 정합성을 보장하고 안정적인 서비스를 제공하는 것.

### 예상 동시성 이슈

-   중복 예약 발생: 같은 좌석에 대해 동시에 예약 요청시 중복 예약 발생
-   동시 결제시 잔액 불일치: 한 사용자의 포인트 차감 요청이 동시에 여러 번 처리될 경우, 데이터 갱신 손실(Lost Update)로 인해 잔액이 불일치
-   임시 배정 로직 오류: 좌석 임시 배정 시간(5분)이 만료되는 시점과 사용자의 결제 요청 시점이 겹칠 경우, 이미 만료된 예약이 결제되거나, 결제된 예약이 만료 처리되는 데이터 불일치 문제가 발생할 수 있음.

## 2. 구현된 동시성 제어 전략

요구사항에 따라 아래 3가지 핵심 동시성 문제를 해결하고 테스트를 완료.

### 2.1. 좌석 임시 배정 시 락 제어 (중복 예약 방지)

-   해결 전략: 조건부 UPDATE (Conditional Update) 사용. 좌석의 상태가 `AVAILABLE`일 때만 `RESERVED`으로 변경하도록 하여, 가장 먼저 요청한 사용자만 좌석을 선점하도록 보장.
-   참고: MySQL의 REPEATABLE READ 격리 수준: 트랜잭션 중 다른 트랜잭션이 해당 데이터 읽을 수 있으나 UPDATE는 잠금이 발생해 동시 수정을 막음. 
다만 조건부 업데이트를 사용할 경우 베타락과 달리 SELECT 시점에 락을 걸지 않으므로 지연시간이 적음. 
UPDATE 조건에 맞는 데이터가 없으면 P2025 에러 발생, 이를 사용자에게 적절히 안내할 필요.

```typescript
@Transactional()
async _reserveWithOptimisticLock(
	seat: Seat,
	reservation: Reservation,
): Promise<Reservation> {
	const seatBefore = await this.seatRepository.findOne(seat.id);
	if (seatBefore.status !== SeatStatus.AVAILABLE) {
		throw new ConflictException('ALREADY_RESERVED');
	}
	await this.seatRepository.update(seat, SeatStatus.AVAILABLE);
	const newReservation = await this.reservationRepository.create(reservation);
	return newReservation;
}

async update(seat: Seat, expectedStatus: SeatStatus): Promise<Seat> {
	try {
		const entity = await this.txHost.tx.seatEntity.update({
			where: {
				id: seat.id,
				status: expectedStatus,
			},
			data: {
				status: seat.status,
				price: seat.price,
			},
		});
		if (entity.status !== seat.status || entity.price !== seat.price) {
			throw new ConflictException('Failed to update seat');
		}
		return new Seat(entity);
	} catch (error) {
		console.log(error);
		throw new Error('Failed to update seat');
	}
}
```

### 2.2. 잔액 차감 동시성 제어 (잔액 불일치)

-   해결 전략: 비관적 락 (Pessimistic Lock) 사용. 결제 트랜잭션 시작 시 `SELECT ... FOR UPDATE` 쿼리로 특정 사용자의 포인트 레코드에 배타적 락(Exclusive Lock)을 설정하여, 다른 트랜잭션의 접근을 막고 순차적으로 처리하도록 강제.
-   구현: Prisma의 `$transaction`과 `$queryRaw`를 사용하여 `SELECT FOR UPDATE`를 실행하고, 동일 트랜잭션 내에서 잔액을 차감.

```typescript
async selectForUpdate(userId: number): Promise<optional<UserPoint>> {
	const result = await this.txHost.tx.$queryRaw<UserPointEntity[]>`
		SELECT * FROM user_points
		WHERE user_id = ${userId}
		FOR UPDATE;
	`;
	if (result.length > 0) {
		return this.makeOutput(result[0]);
	}
	return null;
}

	async use(userId: number, amount: number): Promise<PointUseResponseDto> {
	const updatedUserPoint = await this.txHost.withTransaction(async () => {
		const userPoint = await this.userPointRepository.selectForUpdate(userId);
		if (!userPoint) {
			throw new Error('NOT_FOUND_USER_POINT');
		}
		// domain logic
		userPoint.use(amount);

		await this.pointHistoryRepository.create(
			userId,
			PointHistoryType.USE,
			amount,
		);
		return await this.userPointRepository.update(userPoint);
	});

	return { balance: updatedUserPoint.balance };
}
```

### 2.3. 배정 만료처리 vs 결제 승인 동시성 충돌

-   문제 상황: 예약 만료와 결제 승인 간의 동시 처리 충돌
-   해결 전략: BullMQ(지연 작업 큐) 와 조건부 UPDATE를 결합하여 해결. 좌석 임시 배정 시 5분 뒤에 실행될 만료 작업을 큐에 등록. 결제와 만료 처리 로직 모두 1)예약 상태가 `PENDING`이고 2)좌석이 `RESERVED`일 때만 다음 상태로 변경할 수 있다는 조건을 추가하여, 먼저 실행된 작업만 성공하도록 보장.
-   구현:
    -   예약 만료 로직 (Consumer): `PENDING` 상태의 예약만 `EXPIRED`로 변경하고 좌석을 `AVAILABLE`로 되돌림.
    -   결제 확정 로직 (Service): `PENDING` 상태의 예약만 `CONFIRMED`로 변경하고 좌석을 `SOLD`로 변경. 이 모든 과정은 단일 트랜잭션으로 묶여 원자성을 보장.
- 보완할 부분: 낙관적 락(조건부 UPDATE)의 경우 조건을 확인하는 select에서 성공하면서 일관성이 깨지는 문제. 베타락이 더 안전하게 P2025 에러를 발생시킬 것으로 보임.

```typescript
// reservation.service.ts - temporaryReserve (결제요청시 delay 큐에 등록)
const newReservation = await this._reserveWithPessimisticLock(
	seat,
	reservation,
);

// 5분뒤 만료 작업을 큐에 추가
await this.queueProducer.addJob(
	EXPIRE_QUEUE_NAME,
	{
		reservationId: newReservation.id,
		seatId: seatId,
		lockToken: queueToken, // 잠금 해제시 필요
	},
	{
		delay: SEAT_LOCK_TTL * 1000, // 5분 지연!!
	},
);
```

```typescript
// reservation.service.ts - confirmReservation (결제 승인)
async confirmReservation(
	userId: number,
	reservationId: number,
	paymentToken: string,
): Promise<PaymentResponseDto> {
	// verify
	const isValidToken = await this.paymentTokenService.verifyToken(
		userId,
		paymentToken,
	);
	if (!isValidToken) {
		throw new Error('Invalid payment token');
	}

	// 좌석 최종 배정
	const updatedReservation = await this.txHost.withTransaction(async () => {
		// 예약상태 변경
		const reservation =
			await this.reservationRepository.findOne(reservationId);
		if (reservation.status !== ReservationStatus.PENDING) {
			throw new Error('NOT_PENDING_RESERVATION');
		}
		reservation.setConfirmed();
		const updatedReservation = await this.reservationRepository.update(
			reservation,
			ReservationStatus.PENDING,
		);

		// 좌석상태 변경
		const seat = await this.seatRepository.findOne(reservation.seatId);
		seat.setSold();
		await this.seatRepository.update(seat, SeatStatus.RESERVED);

		// 결제 모듈 호출
		await this.paymentService.use(userId, reservation.purchasePrice);

		return updatedReservation;
	});

```

```typescript
// reservation-expire-consumer.service.ts
async process(
	job: Job<{ reservationId: number; seatId: number; lockToken: string }>,
): Promise<boolean> {
	const { reservationId, seatId, lockToken } = job.data;
	this.logger.log(
		`Processing job ${job.id} from queue ${job.queueName} with reservationId: ${reservationId}, seatId: ${seatId}, lockToken: ${lockToken}`,
	);

	await this.txHost.withTransaction(async () => {
		// 예약 상태 변경: PENDING -> EXPIRED
		const reservation =
			await this.reservationRepository.findOne(reservationId);
		reservation.setExpired();
		// 조건부 UPDATE
		await this.reservationRepository.update(
			reservation,
			ReservationStatus.PENDING,
		);

		// seat 상태 변경: RESERVED -> AVAILABLE
		const seat = await this.seatRepository.findOne(seatId);
		seat.setAvailable();
		await this.seatRepository.update(seat, SeatStatus.RESERVED);
	});

	return true;
}
```

<!-- ## 3. 동시성 테스트 전략 및 결과

### 3.1. 멀티스레드 통합 테스트 (Jest)

`Promise.all`을 사용하여 여러 비동기 요청을 동시에 실행하는 방식으로 멀티스레드/프로세스 환경을 모사하여, 각 동시성 제어 로직의 정확성을 검증했습니다.

-   좌석 중복 예약 테스트: 5개의 동시 예약 요청 시, 단 1개의 요청만 성공하고 나머지 4개는 `ConflictException`을 받는지 확인. (성공)
-   잔액 동시 차감 테스트: 10,000원을 가진 사용자가 1,000원짜리 상품을 5번 동시 구매 시, 최종 잔액이 정확히 5,000원이 되는지 확인. (성공)

모든 테스트 케이스를 통과하여 구현된 동시성 제어 로직이 의도대로 동작함을 확인했습니다.

### 3.2. 부하 테스트 (k6) - 계획

-   목표: 고경합 상황에서 조건부 업데이트와 비관적 락의 성능(응답 시간, 처리량)을 정량적으로 비교 분석합니다.
-   시나리오: 50명의 가상 유저(VUs)가 동시에 단 하나의 특정 좌석을 예약 시도합니다.
-   결과 예측:
    -   조건부 업데이트: 1개의 성공 요청 외 49개의 실패 요청은 DB에서 즉시 거절되므로 평균 응답 시간이 매우 빠를 것입니다. 이는 사용자에게 '실패' 피드백을 빠르게 전달하는 데 유리합니다.
    -   비관적 락 (만약 사용했다면): 49개 요청은 첫 요청의 락이 해제될 때까지 대기하므로 응답 시간이 길어지고, DB 커넥션 풀 고갈 위험이 있습니다.
-   결과:
    *(k6 스크립트 실행 후, 실제 측정된 p95/p99 응답 시간, TPS 등의 결과를 이곳에 추가할 예정입니다.)*

## 4. 결론

조건부 업데이트(낙관적 락 방식) 와 비관적 락을 상황에 맞게 적용하여 콘서트 예약 시스템의 주요 동시성 이슈를 효과적으로 해결했습니다.

-   좌석 선점과 같이 충돌이 예상되지만 빠른 실패 응답이 중요한 경우 조건부 업데이트가 효과적입니다.
-   결제와 같이 데이터 정합성이 매우 중요하고 충돌 시 롤백 비용이 큰 경우 비관적 락이 신뢰성 있는 선택입니다.

Jest를 이용한 멀티스레드 테스트로 각 전략의 유효성을 검증했으며, k6 부하 테스트를 통해 실제 운영 환경과 유사한 조건에서 성능을 분석하여 최적의 동시성 제어 방안을 선택할 근거를 마련할 것입니다. -->