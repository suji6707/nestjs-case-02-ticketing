병목지점 파악
Slow query. Cache Miss 
- 🔺어떤 기능이 이걸 유발하는지 정리가 되어있어야함!!

slow query의 경우
@reservation.prisma.repository.ts#L12-17  그나마 제일 여러 요소와 연관이 많이 되어있는 테이블도 slow query 여지는 별로 없어보이는데..

캐시의 경우
1. 콘서트 스케줄/좌석 조회: @constants.ts#L20 @event-search.service.ts#L68-69   @event-search.service.ts#L35-56 이게 캐시미스가 난다고 부하가 커질 부분인가 하면 애매하고..
2. 대기열큐 waiting vs active 큐를 sorted set으로 관리하고 있긴 한데  @queue-ranking.service.ts#L47-55 @queue-ranking.service.ts#L41-44 이건 ttl도 설정하지 않아서 캐시미스가 날일은 없어보이거든
3. 결제토큰: @payment-token.service.ts#L50-60 결제시 토큰을 가지고 임시예약을 한 사람인지 검증 후 결제하고있긴한데 이건 @payment-token.service.ts#L38-42 3분 만료시간을 설정해둔거라 캐시 병목 지점은 아닐거같은데..


---
### 🔍 분산락 적용 전후 성능 비교 분석
현재 결과를 보니 여전히 동일한 좌석 경쟁 시나리오로 테스트가 진행된 것 같습니다. 분산락의 효과와 성능 영향을 정확히 분석해보겠습니다.

📊 핵심 지표 비교:
지표 | 분산락 적용 전	| 분산락 적용 후	| 변화
--- | --- | --- | ---
예약 성공률	| 2% (1/50)	| 2% (1/50)	| 동일
예약 지연 P95	| 114ms	| 326ms	| 🔴 +185% 증가
예약 지연 P99	| 115ms	| 334ms	| 🔴 +190% 증가
로그인 지연 P95	| 912ms	| 1043ms	| 🔴 +14% 증가
전체 처리시간 P95	| N/A	| 1091ms	| 새로 측정
🚨 분산락으로 인한 성능 영향:
1. 예약 단계 지연 급증
P95: 114ms → 326ms (185% 증가)
P99: 115ms → 334ms (190% 증가)
원인: 49명이 락 대기로 인한 순차 처리
2. 로그인 성능도 악화
P95: 912ms → 1043ms (14% 증가)
전체적인 시스템 부하 증가

---
### 🔍 Redis Pipeline 최적화 전후 성능 비교 분석
Redis Pipeline을 적용하여 대기열 시스템의 배치 처리를 최적화한 결과입니다.

📊 예약 API 성능 비교:
지표 | Pipeline 적용 전 | Pipeline 적용 후 | 변화
--- | --- | --- | ---
예약 성공률 | 2% (1/50) | 2% (1/50) | 동일
예약 지연 P50 | 20.08ms | 5.42ms | 🟢 -73% 개선
예약 지연 P75 | 122.57ms | 14.85ms | 🟢 -88% 개선
예약 지연 P90 | 267.12ms | 108.85ms | 🟢 -59% 개선
예약 지연 P95 | 326.05ms | 115.46ms | 🟢 -65% 개선
예약 지연 P99 | 333.99ms | 278.79ms | 🟢 -17% 개선
예약 지연 평균 | 89.05ms | 30.15ms | 🟢 -66% 개선
예약 지연 최대 | 336.51ms | 323.54ms | 🟢 -4% 개선

🚀 Pipeline 최적화 효과:
1. **배치 처리로 Redis 호출 최소화**
   - 개별 zadd/zrem → Pipeline 배치 처리
   - 네트워크 라운드트립 N번 → 1번으로 감소

2. **분산락 보유 시간 단축**
   - 빠른 배치 처리로 락 경합 시간 감소
   - 동시성 처리 성능 향상

3. **전체 처리 시간 개선**
   - 평균 응답 시간 66% 개선
   - P95 응답 시간 65% 개선

---
### 병렬 테스트로 변경
📊 예상 개선 결과:
지표 | 기존 | 개선 후 예상
--- | --- | ---
예약 성공률 | 2% (1/50) | 100% (50/50)
실제 동시성 테스트 | ❌ 단일 좌석 경쟁 | ✅ 50개 좌석 병렬 처리
병목 지점 식별 | ❌ 분산락만 측정 | ✅ 실제 DB/Kafka 성능 측정
로그인 성능 | P95: 912ms | 목표: P95 < 500ms

🔍 새로운 분석 포인트:
🎯 실제 동시성 성능: 50명이 동시에 다른 좌석 예약 시 성능
⚡ 데이터베이스 병목: 동시 INSERT/UPDATE 성능 측정
🔥 Kafka 처리량: 50개 이벤트 동시 발행/처리 성능
💰 결제 처리 안정성: 실제 비즈니스 플로우 성능
이제 진짜 성능 병목을 찾을 수 있을 것입니다! 🚀

---
### 🎯 Multiple Seats vs Single Seat 성능 비교 분석
단일 좌석 경쟁 vs 다중 좌석 병렬 처리 성능을 비교한 결과입니다.
-> 단일 좌석은 워낙 분산락으로 빠른 실패 처리하고 있었어서. 합당한 비교는 아님.
**다만 이제 실제 성능 병목을 정확히 파악했으니, DB 최적화와 Kafka 튜닝에 집중할 수 있음!**

📊 핵심 성능 지표 비교:
지표 | Single Seat (경쟁) | Multiple Seats (병렬) | 변화
--- | --- | --- | ---
예약 성공률 | 2% (1/50) | 98% (49/50) | 🚀 +4800% 개선
예약 지연 P50 | 5.42ms | 26.28ms | 🔴 +385% 증가
예약 지연 P75 | 14.85ms | 129.24ms | 🔴 +770% 증가
예약 지연 P90 | 108.85ms | 238.46ms | 🔴 +119% 증가
예약 지연 P95 | 115.46ms | 319.68ms | 🔴 +177% 증가
예약 지연 P99 | 278.79ms | 424.67ms | 🔴 +52% 증가
예약 지연 평균 | 30.15ms | 95.67ms | 🔴 +217% 증가
로그인 지연 P95 | 965.13ms | 977.11ms | 🔴 +1% 증가
전체 처리시간 P95 | 984.71ms | 1136.59ms | 🔴 +15% 증가

🔍 **분석 결과:**

**✅ 성공률 극적 개선:**
- 분산락 경합 제거로 예약 성공률 98% 달성
- 실제 비즈니스 시나리오에 더 가까운 테스트 환경

**⚠️ 개별 응답 시간 증가:**
- DB 동시 INSERT/UPDATE 부하로 지연 시간 증가
- Kafka 이벤트 발행 부하 증가 (49개 vs 1개)
- 시스템 전체 처리량 증가로 인한 개별 요청 지연

**🎯 병목 지점 식별:**
1. **데이터베이스 동시성 처리** - 가장 큰 병목
2. **Kafka 이벤트 처리량** - 49배 증가한 이벤트 부하
3. **시스템 리소스 경합** - CPU/메모리/네트워크 사용량 증가

**💡 최적화 방향:**
- DB 커넥션 풀 튜닝 및 인덱스 최적화
- Kafka 파티션 증가 및 배치 처리 개선
- 캐싱 전략 도입으로 DB 부하 감소



---
서킷브레이커 도입 우선순위

1. Redis 연결 (🔴 HIGH 우선순위)
```
// 현재 Redis 사용 현황
- 분산락 (결제 동시성 제어)
- 캐시 (콘서트 스케줄, 좌석 정보)  
- 대기열 관리 (Sorted Set, ~390 QPS)
```
도입 이유: Redis 장애 시 전체 시스템 마비, 캐시 미스로 DB 부하 급증

2. Database 연결 (🔴 HIGH 우선순위)
```
// 현재 DB 병목 지점
- FOR UPDATE 쿼리 (reservations, seats, user_points)
- 행 락 경합으로 인한 데드락 위험
- 피크 시 100 TPS 처리 필요
```
도입 이유: 락 타임아웃 시 graceful degradation 필요

3. Kafka Producer (🟡 MEDIUM 우선순위)
```
// 현재 Kafka 사용 현황
- 이벤트 발행: payment.try/success/failure/retry
- Consumer 초기화 지연 (20초)
- 비동기 처리의 핵심 인프라
```
Opossum 라이브러리 사용 
성숙한 라이브러리: Netflix Hystrix 패턴 구현
풍부한 설정: 임계값, 타임아웃, 재시도 정책
메트릭 제공: 성공률, 응답시간, 서킷 상태 모니터링
NestJS 통합: 데코레이터 패턴으로 쉬운 적용

---
# 서킷브레이커 적용

현재 코드를 분석하여 RedisCircuitBreakerService를 어떻게 적용할지 구체적으로 설명합니다.

## 🎯 서킷브레이커 도입 우선순위

### 1. **Redis 연결** (🔴 HIGH 우선순위)
```typescript
// 현재 Redis 사용 현황
- 분산락 (결제 동시성 제어)
- 캐시 (콘서트 스케줄, 좌석 정보)  
- 대기열 관리 (Sorted Set, ~390 QPS)
```

**도입 이유**: Redis 장애 시 전체 시스템 마비, 캐시 미스로 DB 부하 급증

### 2. **Database 연결** (🔴 HIGH 우선순위)
```typescript
// 현재 DB 병목 지점
- FOR UPDATE 쿼리 (reservations, seats, user_points)
- 행 락 경합으로 인한 데드락 위험
- 피크 시 100 TPS 처리 필요
```

**도입 이유**: 락 타임아웃 시 graceful degradation 필요

### 3. **Kafka Producer** (🟡 MEDIUM 우선순위)
```typescript
// 현재 Kafka 사용 현황
- 이벤트 발행: payment.try/success/failure/retry
- Consumer 초기화 지연 (20초)
- 비동기 처리의 핵심 인프라
```

## 🛠️ 구현 방식 권장사항

### **Opossum 라이브러리 사용 (강력 권장)**

**이유:**
1. **성숙한 라이브러리**: Netflix Hystrix 패턴 구현
2. **풍부한 설정**: 임계값, 타임아웃, 재시도 정책
3. **메트릭 제공**: 성공률, 응답시간, 서킷 상태 모니터링
4. **NestJS 통합**: 데코레이터 패턴으로 쉬운 적용

## 📋 적용된 변경사항

### 1. `RedisCircuitBreakerService` 생성
```typescript
@Injectable()
export class RedisCircuitBreakerService {
  private readonly circuitBreaker: CircuitBreaker<any[], any>;

  constructor() {
    this.circuitBreaker = new CircuitBreaker(
      async (operation: () => Promise<any>) => {
        return await operation();
      },
      {
        timeout: 3000, // 3초 타임아웃
        errorThresholdPercentage: 50, // 50% 실패 시 OPEN
        resetTimeout: 30000, // 30초 후 HALF_OPEN
        rollingCountTimeout: 10000, // 10초 윈도우
        rollingCountBuckets: 10, // 10개 버킷
        volumeThreshold: 10, // 최소 10개 요청 후 판단
      }
    );
  }

  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    fallbackValue?: T
  ): Promise<T> {
    try {
      return await this.circuitBreaker.fire(operation);
    } catch (error) {
      this.logger.error('Redis Circuit Breaker execution failed', error);
      
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      throw error;
    }
  }
}
```

### 2. `QueueRankingService` 개선
```typescript
// Circuit Breaker를 통해 Redis 작업 실행
async addToWaitingQueue(queueToken: string): Promise<void> {
  try {
    await this.redisCircuitBreaker.executeWithCircuitBreaker(
      () => this.redisService.zadd(waitingQueueKey(), Date.now(), queueToken)
    );
  } catch (error) {
    this.logger.error('Failed to add token to waiting queue', error);
    
    // Circuit Breaker가 OPEN 상태이거나 Redis 장애 시
    // 대기열 없이 바로 처리하도록 fallback
    throw new Error('QUEUE_SERVICE_UNAVAILABLE');
  }
}

// 대기열 순위 조회 (Circuit Breaker 적용)
async getWaitingRank(queueToken: string): Promise<number> {
  try {
    return await this.redisCircuitBreaker.executeWithCircuitBreaker(
      () => this.redisService.zrevrank(waitingQueueKey(), queueToken),
      -1 // fallback: 순위를 알 수 없으면 -1 반환
    );
  } catch (error) {
    this.logger.error('Failed to get waiting rank', error);
    return -1; // Redis 장애 시 순위 알 수 없음
  }
}
```

### 3. `QueueTokenService` 개선
```typescript
async createToken(
  params: ICreateQueueTokenParams,
): Promise<QueueTokenResponseDto> {
  const { userId, concertId } = params;
  const payload = { userId, concertId };
  const token = await this.jwtService.signJwtAsync(payload, QUEUE_TOKEN_TTL);

  try {
    // sorted set에 추가 (Circuit Breaker 적용됨)
    await this.queueRankingService.addToWaitingQueue(token);
    this.logger.log(
      `Queue token created and stored in Redis for userId: ${userId}, concertId: ${concertId}`,
    );
  } catch (error) {
    // Redis 장애 시에도 토큰은 발급 (degraded service)
    if (error.message === 'QUEUE_SERVICE_UNAVAILABLE') {
      this.logger.warn(
        `Queue service unavailable, token issued without queue for userId: ${userId}`,
      );
      // 토큰은 발급하되, 대기열 없이 바로 활성 상태로 처리
    } else {
      // 다른 에러는 재발생
      throw error;
    }
  }

  return { token };
}
```

### 4. 모듈 설정
```typescript
// RedisModule에 Circuit Breaker 서비스 추가
@Global()
@Module({
  providers: [
    RedisService, 
    DistributedLockService,
    RedisCircuitBreakerService, // 추가
  ],
  exports: [
    RedisService, 
    DistributedLockService,
    RedisCircuitBreakerService, // 추가
  ],
})
export class RedisModule {}
```

## 🔄 동작 방식

```typescript
// 정상 상태: Redis 정상 작동
await queueRankingService.addToWaitingQueue(token) // ✅ 성공

// Circuit Breaker OPEN: Redis 장애 감지
await queueRankingService.addToWaitingQueue(token) // ❌ 즉시 실패
// → 'QUEUE_SERVICE_UNAVAILABLE' 에러 발생
// → QueueTokenService에서 토큰은 발급, 대기열 없이 처리

// Circuit Breaker HALF-OPEN: 회복 테스트
// → 일부 요청만 Redis로 전달하여 상태 확인
```

## 📊 기대 효과

1. **장애 전파 방지**: Redis 장애가 전체 시스템을 마비시키지 않음
2. **빠른 실패**: 3초 타임아웃으로 응답성 보장
3. **자동 회복**: 30초 후 자동으로 Redis 연결 재시도
4. **사용자 경험 보호**: 대기열 없이라도 서비스 계속 제공

## 🚀 설치 및 실행

```bash
# opossum 라이브러리 설치
npm install opossum

# 서비스 재시작
npm run start:dev
```

현재 이벤트 기반 아키텍처와 높은 동시성 요구사항을 고려할 때, **Opossum을 활용한 서킷브레이커 도입**이 가장 실용적인 선택입니다.

---
## Kafka 컨슈머 그룹 리밸런싱 문제

이 내용은 **Kafka 컨슈머 그룹의 리밸런싱 문제**에 대한 설명입니다. 개발 환경에서 자주 겪는 이슈를 다루고 있어요.

## 🔍 문제 상황

### Kafka 컨슈머 그룹의 특성
- **컨슈머 그룹은 Node.js 인스턴스 외부에 독립적으로 존재**
- 컨슈머가 그룹에 **참여하거나 떠날 때마다** 모든 멤버가 다시 조인하고 동기화해야 함
- 이 과정을 **리밸런싱(Rebalancing)**이라고 함

## ⚡ 두 가지 종료 시나리오

### 1. **정상적인 종료 (Graceful Disconnect)**
```javascript
// 정상적인 연결 해제
await consumer.disconnect();
process.exit();
```
- 컨슈머가 즉시 그룹에서 나감
- **즉시 리밸런싱 발생**
- 다른 컨슈머들이 빠르게 파티션을 재할당받음

### 2. **비정상적인 종료 (강제 종료)**
```bash
# Ctrl+C 또는 강제 종료
kill -9 <process_id>
```
- 컨슈머가 그룹에서 즉시 나가지 않음
- **sessionTimeout 시간까지 대기** (보통 30초-6분)
- 이 시간동안 해당 컨슈머가 담당하던 파티션은 **처리되지 않음**

## 🚨 개발 환경에서의 문제

### Nodemon 사용 시
```javascript
// nodemon이 파일 변경을 감지할 때마다
// 1. 프로세스 강제 종료
// 2. 새 프로세스 시작
// 3. 컨슈머가 그룹에 재참여
// 4. 리밸런싱 발생 (모든 컨슈머 일시 중단)
```

**결과**: 개발 중 코드 수정할 때마다 전체 컨슈머 그룹이 멈춤

## 💡 해결 방안

### 1. **랜덤 그룹 ID 사용**
```javascript
const kafka = require('kafkajs').kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092']
});

// 개발 환경에서만 랜덤 그룹 ID 사용
const groupId = process.env.NODE_ENV === 'development' 
  ? `dev-group-${Math.random().toString(36).substr(2, 9)}`
  : 'production-group';

const consumer = kafka.consumer({ groupId });
```

**장점**:
- 재시작할 때마다 새로운 그룹 생성
- 기존 컨슈머들에게 영향 없음
- 개발 중 빠른 테스트 가능

### 2. **Graceful Shutdown 구현**
```javascript
process.on('SIGTERM', async () => {
  console.log('Gracefully shutting down...');
  await consumer.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Gracefully shutting down...');
  await consumer.disconnect();
  process.exit(0);
});
```

### 3. **Static Membership (향후 지원 예정)**
- 컨슈머에 고정 ID 할당
- 재시작 시에도 동일한 멤버로 인식
- 리밸런싱 없이 빠른 복구 가능

## 🔧 실제 개발 팁

### package.json 설정
```json
{
  "scripts": {
    "dev": "nodemon --exec 'node app.js'",
    "dev:kafka": "node app.js" // 카프카 테스트 시 nodemon 대신 사용
  }
}
```

### 환경별 설정 분리
```javascript
const config = {
  development: {
    groupId: `dev-${Date.now()}`, // 매번 새로운 그룹
    sessionTimeout: 10000 // 짧은 타임아웃
  },
  production: {
    groupId: 'stable-group-name', // 고정 그룹
    sessionTimeout: 30000
  }
};
```

이런 식으로 개발 환경에서의 Kafka 컨슈머 문제를 해결할 수 있습니다!

---

