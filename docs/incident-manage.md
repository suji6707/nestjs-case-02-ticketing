# 콘서트 예약 시스템 장애 분석 및 대응 보고서

## 1. 시스템 개요

### 1.1 아키텍처 구조
- **이벤트 기반 MSA**: Kafka를 통한 비동기 메시징
- **완전한 이벤트 드리븐**: payment.try → success/retry → failure/cancel
- **분산 트랜잭션**: Saga 패턴 + 보상 트랜잭션
- **동시성 제어**: Redis 분산락 + 베타락
- **멱등성 보장**: paymentTxId 기반 중복 요청 방지

### 1.2 핵심 컴포넌트
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   HTTP API      │    │   Kafka Broker  │    │  Event Consumer │
│  (즉시 응답)      │───▶│   (3 brokers)   │───▶│  (비동기 처리)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Redis 분산락     │    │ PaymentTx Table │    │  보상 트랜잭션     │
│  (동시성 제어)     │    │   (상태 추적)     │    │   (데이터 복구)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```
상단 레이어 (비동기 처리 파이프라인):
- HTTP API: 클라이언트 요청을 즉시 응답 (202 Accepted)
- Kafka Broker: 이벤트 메시지 큐잉 및 전달 (3개 브로커 클러스터)
- Event Consumer: 실제 비즈니스 로직 비동기 처리

하단 레이어 (상태 관리 및 안정성):
- Redis 분산락: 동시성 제어 (같은 좌석 중복 예약 방지)
- PaymentTx Table: 트랜잭션 상태 추적 (PENDING → SUCCESS/FAILED)
- 보상 트랜잭션: 실패 시 데이터 복구 (Saga 패턴)

---
## 2. 잠재적 장애 시나리오 분석

### 2.0 🎯 SPOF (Single Point of Failure) 식별 및 완화 전략

#### 2.0.1 주요 SPOF 컴포넌트 분석

**🔴 CRITICAL SPOF:**
1. **Kafka Broker 클러스터**
   - **위험도**: 최고 (전체 이벤트 처리 중단)
   - **완화 방법**:
     - 3개 이상 브로커 클러스터 운영 (Quorum 보장)
     - Cross-AZ 배치로 물리적 장애 대응
     - Kafka Connect 기반 백업 클러스터 구축
     - Circuit Breaker 패턴으로 Graceful Degradation

2. **Redis 분산락**
   - **위험도**: 최고 (예약 불가 또는 중복 처리 위험)
   - **실제 장애 시나리오**:
     ```
     시나리오 A: 락 보유 중 Redis 서버 다운
     1. 사용자 A가 좌석1 예약 락 획득
     2. Redis 서버 갑작스런 다운
     3. 락이 해제되지 않음 → 좌석1 영구 잠김
     4. 다른 사용자들 좌석1 예약 불가 (무한 대기)
     
     시나리오 B: 네트워크 분할 (Split-Brain)
     1. Redis 연결 끊김 → 락 상태 확인 불가
     2. 애플리케이션이 "락 없음"으로 판단
     3. 여러 사용자가 동시에 같은 좌석 예약 시도
     4. 중복 예약 발생
     ```
   - **완화 방법(인프라 개선)**:
     - Redis Sentinel 모드 (3개 센티넬)
     - Redlock 알고리즘 적용  // TODO: Redis Cluster 모드
   - **개발자 대응 방안(코드 개선)**:
     ```typescript
     // 1. 락 TTL 자동 갱신 (Heartbeat)
     async acquireLockWithHeartbeat(key: string, ttl: number) {
       const lockValue = uuidv4();
       const acquired = await this.redis.set(key, lockValue, 'PX', ttl, 'NX');
       
       if (acquired) {
         // TTL의 1/3 주기로 갱신
         const heartbeat = setInterval(() => {
           this.redis.pexpire(key, ttl);
         }, ttl / 3);
         
         return { lockValue, heartbeat };
       }
     }
     
     // 2. 락 해제 실패 시 강제 해제 로직
     async forceReleaseLock(key: string) {
       const lockAge = await this.redis.pttl(key);
       if (lockAge > MAX_LOCK_AGE) {  // 10초 이상 된 락
         await this.redis.del(key);
         this.logger.warn(`Force released stuck lock: ${key}`);
       }
     }
     
     // 3. Redis 연결 실패 시 DB 기반 락 폴백
     async acquireLockWithFallback(seatId: string) {
       try {
         return await this.redisLock.acquire(seatId);
       } catch (redisError) {
         // DB 기반 비관적 락으로 폴백
         return await this.dbLock.acquire(seatId);
       }
     }
     ```

**🟡 HIGH SPOF:**
3. **PaymentTx Table**
   - **위험도**: 높음 (클라이언트 폴링 상태 불일치)
   - **실제 문제 시나리오**:
     ```
     1. 결제 완료 → DB 업데이트 지연 → 클라이언트 폴링 시 "PENDING" 응답
     2. 클라이언트 재시도 → 동일 paymentTxId로 중복 결제 시도
     3. "이미 처리된 결제입니다" 에러 → 사용자 혼란
     ```
   - **완화 방법(인프라 개선)**:
     - Master-Slave 복제 (Read Replica 3개 이상)
     - 자동 Failover 설정 (30초 이내)
     - 실시간 백업 및 Point-in-Time Recovery
     - Connection Pool 다중화
   - **개발자 대응 방안(코드 개선)**:
     ```typescript
     // 1. 폴링 응답에 상세 상태 정보 포함
     {
       status: "PENDING",
       retryAfter: 3000,  // 3초 후 재시도 권장
       message: "결제 처리 중입니다. 잠시만 기다려주세요."
     }
     
     // 2. 중복 결제 시도 시 친화적 응답
     if (existingTx.status === 'SUCCESS') {
       return { status: 'ALREADY_COMPLETED', redirectUrl: '/success' };
     }
     
     // 3. DB 조회 실패 시 Kafka 이벤트 로그 백업 조회
     const eventLog = await this.getPaymentEventFromKafka(paymentTxId);
     ```

4. **Event Consumer**
   - **위험도**: 중간 (처리 지연)
   - **완화 방법(인프라 개선)**:
     - 다중 인스턴스 운영 (최소 3개)
     - Auto Scaling 설정 (CPU 70% 기준)
     - Dead Letter Queue 구성
     - Consumer Group 분산 처리

---
#### 2.0.2 고가용성 아키텍처 설계

**🏗️ 2-Tier 고가용성 아키텍처:**

```
상위 계층 (요청 처리 파이프라인) - 수평 확장 가능
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Load Balancer  │    │   Kafka Cluster │    │ Consumer Group  │
│   (다중 AZ)      │───▶│  (3 Brokers)    │───▶│  (Auto Scale)   │
│ ✅ 99.99% SLA   │    │ ✅ Replication=3│    │ ✅ Min 3 Pods   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
하위 계층 (상태 관리 & 안정성) - 데이터 일관성 보장
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Redis Sentinel  │    │  DB Master/Slave│    │ Circuit Breaker │
│  (3 Sentinels)  │    │   (실시간 복제)    │    │  (장애 격리)      │
│ ✅ Auto Failover│    │ ✅ Read Replica  │    │ ✅ Fallback     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**🔄 각 컴포넌트별 고가용성 전략:**

**상위 계층 (처리량 중심):**
1. **Load Balancer (다중 AZ)**
   - **역할**: 트래픽 분산 및 헬스체크
   - **고가용성**: AWS ALB 99.99% SLA
   - **장애 대응**: 자동 인스턴스 라우팅 제외
     ```
     예시: 3개 인스턴스 운영 중
     - ticketing-app-1 (AZ-1a): 정상 ✅
     - ticketing-app-2 (AZ-1b): 장애 ❌ -> ALB가 자동 제외
     - ticketing-app-3 (AZ-1c): 정상 ✅
     
     ALB Health Check:
     GET /health -> 200 OK (정상)
     GET /health -> 500 Error (장애) -> 라우팅 테이블에서 제외
     ```
   - **모니터링**: `target_health_check_failed > 0`

2. **Kafka Cluster (3 Brokers)**
   - **역할**: 이벤트 메시지 큐잉 및 순서 보장
   - **고가용성**: Replication Factor = 3, Min ISR = 2
   - **장애 대응**: 1개 브로커 다운 시에도 서비스 지속
   - **모니터링**: `kafka_broker_online < 2`

3. **Consumer Group (Auto Scale)**
   - **역할**: 비동기 이벤트 처리 (결제, 예약)
   - **고가용성**: HPA로 CPU 70% 기준 자동 확장
   - **장애 대응**: Pod 재시작 + **Dead Letter Queue**
     ```
     Pod = 컴슈머 인스턴스 1개 (ticketing-app 컴테이너)
     
     Consumer Group: "ticketing-consumer-group"
     ├─ Pod-1 (ticketing-app-1): payment.success 파티션 0,1 처리
     ├─ Pod-2 (ticketing-app-2): payment.success 파티션 2 처리  ❌ 장애!
     └─ Pod-3 (ticketing-app-3): payment.retry 파티션 0,1,2 처리
     
     Pod-2 장애 시:
     1. Kubernetes가 Pod-2 재시작
     2. Kafka가 파티션 2를 Pod-1 또는 Pod-3에 재배정
     3. 미처리 메시지는 Dead Letter Queue로 이동
     ```
   - **모니터링**: `consumer_lag > 1000`

**하위 계층 (일관성 중심):**
4. **Redis Sentinel (3 Sentinels)**
   - **역할**: 분산락 관리 및 자동 Failover
   - **고가용성**: Quorum 기반 마스터 선출
     ```
     Quorum = 과반수 투표 시스템
     
     정상 상황:
     ├─ Sentinel-1: Master=redis-1 ✅
     ├─ Sentinel-2: Master=redis-1 ✅  
     └─ Sentinel-3: Master=redis-1 ✅
     
     Master 장애 시:
     ├─ Sentinel-1: Master=redis-1 ❌ (연결 실패)
     ├─ Sentinel-2: Master=redis-1 ❌ (연결 실패)
     └─ Sentinel-3: Master=redis-1 ❌ (연결 실패)
     
     Quorum 투표 (3개 중 2개 이상 동의 필요):
     ✅ Sentinel-1: redis-2를 새 Master로 선출
     ✅ Sentinel-2: redis-2를 새 Master로 선출  
     ✅ Sentinel-3: redis-2를 새 Master로 선출
     
     결과: redis-2가 새 Master로 승격 (30초 이내)
     ```
   - **장애 대응**: 30초 이내 자동 마스터 전환
   - **모니터링**: `redis_master_down > 0`

5. **DB Master/Slave (실시간 복제)**
   - **역할**: 트랜잭션 상태 영구 저장
   - **고가용성**: Aurora 자동 Failover (30초)
   - **장애 대응**: Read Replica로 읽기 부하 분산
   - **모니터링**: `db_connection_failed > 0`

6. **Circuit Breaker (장애 격리)**
   - **역할**: 연쇄 장애 방지 및 Graceful Degradation
   - **고가용성**: 실패율 50% 초과 시 회로 차단
   - **장애 대응**: 폴백 로직으로 기본 서비스 유지
   - **모니터링**: `circuit_breaker_open > 0`

**🎯 장애 시나리오별 대응:**

| 장애 컴포넌트 | 영향도 | 자동 복구 시간 | 서비스 지속성 |
|-------------|--------|---------------|-------------|
| Load Balancer | 🔴 High | 즉시 | 다른 AZ로 라우팅 |
| Kafka 1개 브로커 | 🟡 Medium | 즉시 | 2개 브로커로 지속 |
| Consumer Pod | 🟢 Low | 30초 | 다른 Pod이 처리 |
| Redis Master | 🟡 Medium | 30초 | Sentinel이 전환 |
| DB Master | 🔴 High | 30초 | Aurora 자동 전환 |
| Circuit Open | 🟢 Low | 60초 | 폴백 모드 동작 |

#### 2.0.3 장애 복구 우선순위

**P0 (5분 이내)**: Kafka, Database
**P1 (15분 이내)**: Redis, Event Consumer
**P2 (30분 이내)**: 모니터링, 로깅

---

### 2.1 🔴 Critical - 시스템 전체 영향

#### 2.1.1 Kafka 브로커 클러스터 장애
**장애 현상:**
- 모든 이벤트 처리 중단
- 결제 요청은 접수되지만 실제 처리 불가
- 클라이언트 폴링 시 PENDING 상태 지속

**비즈니스 영향:**
- 신규 결제 처리 100% 중단
- 기존 진행 중인 트랜잭션 처리 지연
- 고객 불만 및 매출 손실 직접 연결

**탐지 방법:**
```bash
# Kafka 브로커 상태 모니터링
kafka-broker-online-partitions < 9  # 3브로커 × 3파티션
kafka-consumer-lag > 1000
kafka-producer-failed-sends > 0
```

**즉시 대응:**
1. Kafka 클러스터 재시작
2. 장애 브로커 격리 후 복구
3. 임시로 단일 브로커 운영
4. 고객 공지: "결제 처리 지연 안내"

#### 2.1.2 Redis 분산락 서버 장애
**장애 현상:**
- 동시성 제어 실패로 중복 결제 발생
- Race Condition으로 인한 데이터 불일치
- 베타락 충돌 에러 급증

**비즈니스 영향:**
- 중복 결제로 인한 고객 피해
- 데이터 정합성 문제
- 환불 처리 업무 급증

**탐지 방법:**
```bash
# Redis 연결 상태
redis-connection-failed > 0
redis-response-time > 100ms
duplicate-payment-transactions > 0
```

**즉시 대응:**
1. Redis 재시작 또는 Failover
2. 결제 API 일시 중단 (Circuit Breaker)
3. 중복 결제 건 긴급 조회 및 환불 처리
4. 데이터 정합성 검증 스크립트 실행

### 2.2 🟡 High - 서비스 부분 영향

#### 2.2.1 Kafka Consumer 처리 지연
**장애 현상:**
- Consumer Lag 급증 (>1000)
- 이벤트 처리 시간 증가
- 클라이언트 폴링 타임아웃

**원인 분석:**
- DB 커넥션 풀 고갈
- Slow Query 발생
- Consumer 인스턴스 부족
- GC(Garbage Collection) 지연

**탐지 방법:**
```bash
# Consumer 성능 지표
kafka-consumer-lag > 1000
event-processing-time > 5s
db-connection-pool-usage > 90%
```

**단계별 대응:**
1. **즉시**: Consumer 인스턴스 스케일 아웃
2. **단기**: DB 커넥션 풀 확장
3. **중기**: Slow Query 최적화
4. **장기**: Consumer 성능 튜닝

#### 2.2.2 결제 재시도 메커니즘 과부하
**장애 현상:**
- payment.retry 이벤트 급증
- Exponential Backoff로 인한 지연 누적
- 최종 실패율 증가

**원인 분석:**
- 외부 결제 API 장애
- 네트워크 불안정
- 재시도 로직 버그

**대응 방안:**
```typescript
// 재시도 제한 강화
const MAX_RETRY_COUNT = 3; // 기존
const EMERGENCY_MAX_RETRY = 1; // 장애 시 단축

// Circuit Breaker 패턴 적용
if (failureRate > 50%) {
    // 재시도 중단, 즉시 실패 처리
    publishPaymentFailure(paymentTxId, "Circuit breaker open");
}
```

### 2.3 🟢 Medium - 성능 영향

#### 2.3.1 DB 커넥션 풀 고갈
**장애 현상:**
- "Connection pool exhausted" 에러
- API 응답 시간 급증
- 타임아웃 에러 발생

**모니터링 지표:**
```sql
-- 활성 커넥션 수 모니터링
SHOW PROCESSLIST;
SELECT COUNT(*) FROM information_schema.PROCESSLIST 
WHERE COMMAND != 'Sleep';
```

**대응:**
1. 커넥션 풀 사이즈 확장
2. 커넥션 타임아웃 조정
3. 불필요한 Long Transaction 제거

## 3. 장애 탐지 시스템 설계

### 3.1 모니터링 대시보드
```yaml
# Prometheus + Grafana 설정
kafka_metrics:
  - kafka_broker_online_partitions
  - kafka_consumer_lag_sum
  - kafka_producer_send_rate

application_metrics:
  - payment_transaction_status_count
  - event_processing_duration
  - db_connection_pool_usage

redis_metrics:
  - redis_connected_clients
  - redis_memory_usage
  - redis_response_time
```

### 3.2 알림 채널 분류
```yaml
alert_channels:
  critical:  # 즉시 대응 필요
    - kafka_cluster_down
    - redis_cluster_down
    - payment_failure_rate > 10%
    destination: "#emergency-alert"
    
  warning:   # 30분 내 대응
    - consumer_lag > 1000
    - db_connection_pool > 80%
    - event_processing_time > 3s
    destination: "#ops-warning"
    
  info:      # 모니터링 목적
    - payment_retry_count
    - reservation_success_rate
    destination: "#ops-info"
```

## 4. 장애 대응 매뉴얼

### 4.1 Kafka 클러스터 장애 대응

#### 4.1.1 단일 브로커 장애
```bash
# 1. 장애 브로커 확인
kafka-broker-api-versions.sh --bootstrap-server localhost:9092

# 2. 파티션 리더 재선출
kafka-leader-election.sh --bootstrap-server localhost:9093 \
  --election-type preferred --all-topic-partitions

# 3. 장애 브로커 재시작
docker-compose restart broker2

# 4. 클러스터 상태 확인
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --topic payment.success
```

#### 4.1.2 전체 클러스터 장애
```bash
# 긴급 복구 절차
# 1. 모든 브로커 중단
docker-compose down

# 2. 데이터 백업 (선택적)
cp -r ./kafka-data ./kafka-data-backup

# 3. 클러스터 재시작
docker-compose up -d

# 4. 토픽 재생성 (필요시)
kafka-topics.sh --create --topic payment.success \
  --bootstrap-server localhost:9092 --partitions 3 --replication-factor 3
```

### 4.2 Consumer 지연 대응

#### 4.2.1 스케일 아웃
```bash
# Docker Compose 스케일링
docker-compose up -d --scale ticketing-app=3

# 또는 수동 인스턴스 추가
PORT=3001 npm run start:prod &
PORT=3002 npm run start:prod &
PORT=3003 npm run start:prod &
```

#### 4.2.2 Consumer 설정 최적화
```typescript
// 긴급 시 Consumer 설정 변경
consumer: {
  groupId: 'ticketing-consumer-group',
  maxWaitTimeInMs: 100,        // 기존 500ms → 100ms
  sessionTimeout: 10000,       // 기존 30000ms → 10000ms
  heartbeatInterval: 3000,     // 기존 3000ms 유지
  maxBytesPerPartition: 1048576, // 1MB로 증가
}
```

### 4.3 데이터 정합성 복구

#### 4.3.1 중복 결제 검증 스크립트
```sql
-- 중복 결제 트랜잭션 조회
SELECT user_id, seat_id, COUNT(*) as duplicate_count
FROM payment_transactions 
WHERE status = 'SUCCESS' 
  AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY user_id, seat_id 
HAVING COUNT(*) > 1;

-- 중복 건 환불 처리
UPDATE payment_transactions 
SET status = 'REFUNDED', updated_at = NOW()
WHERE payment_tx_id IN (
  -- 중복 건 중 나중에 생성된 것들
);
```

#### 4.3.2 이벤트 재처리
```typescript
// 실패한 이벤트 재처리 도구
class EventReprocessor {
  async reprocessFailedEvents(startTime: Date, endTime: Date) {
    const failedTransactions = await this.paymentTransactionRepository
      .findFailedTransactions(startTime, endTime);
    
    for (const tx of failedTransactions) {
      // 상태 초기화 후 재시도
      await this.resetTransactionStatus(tx.paymentTxId);
      await this.publishPaymentTry(tx);
    }
  }
}
```

## 5. 장애 예방 및 개선 방안

### 5.1 단기 개선 방안 (1-2주)

1. **Circuit Breaker 패턴 도입**
```typescript
@Injectable()
export class PaymentCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 30000; // 30초

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

2. **Health Check 엔드포인트 강화**
```typescript
@Controller('health')
export class HealthController {
  @Get('kafka')
  async checkKafka() {
    // Kafka 연결 상태 확인
    const isHealthy = await this.kafkaHealthService.check();
    return { status: isHealthy ? 'UP' : 'DOWN' };
  }
  
  @Get('redis')
  async checkRedis() {
    // Redis 연결 상태 확인
    const isHealthy = await this.redisHealthService.check();
    return { status: isHealthy ? 'UP' : 'DOWN' };
  }
}
```

### 5.2 중기 개선 방안 (1-2개월)

1. **Dead Letter Queue (DLQ) 구현**
```typescript
// 처리 실패한 이벤트를 별도 토픽으로 이동
@EventPattern('payment.success')
async onPaymentSuccess(event: PaymentSuccessKafkaEvent) {
  try {
    await this.processPaymentSuccess(event);
  } catch (error) {
    // 3회 재시도 후 DLQ로 이동
    if (event.retryCount >= 3) {
      await this.sendToDLQ(event, error);
    } else {
      await this.scheduleRetry(event);
    }
  }
}
```

2. **이벤트 소싱 도입**
```typescript
// 모든 상태 변화를 이벤트로 저장
@Entity()
export class EventStore {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column()
  aggregateId: string; // paymentTxId
  
  @Column()
  eventType: string;   // payment.try, payment.success
  
  @Column('json')
  eventData: any;
  
  @Column()
  version: number;     // 이벤트 순서 보장
}
```

### 5.3 장기 개선 방안 (3-6개월)

1. **완전한 MSA 분리**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │ Payment Service │    │Reservation Svc  │
│   (라우팅)        │    │  (결제 전용)      │    │  (예약 전용)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                    ┌─────────────────┐
                    │ Event Bus       │
                    │ (Kafka Cluster) │
                    └─────────────────┘
```

2. **분산 추적 시스템 (Distributed Tracing)**
```typescript
// OpenTelemetry 도입
import { trace } from '@opentelemetry/api';

@Injectable()
export class PaymentService {
  async processPayment(paymentTxId: string) {
    const span = trace.getActiveSpan();
    span?.setAttributes({
      'payment.txId': paymentTxId,
      'payment.userId': userId,
    });
    
    // 분산 추적으로 전체 플로우 모니터링
  }
}
```

## 6. 장애 대응 조직 체계

### 6.1 역할 및 책임
```yaml
incident_response_team:
  incident_commander:    # 전체 지휘
    - 상황 판단 및 의사결정
    - 관련 팀 소집 및 지시
    - 경영진 보고
    
  technical_lead:        # 기술적 복구
    - 장애 원인 분석
    - 복구 작업 수행
    - 기술적 의사결정
    
  communication_lead:    # 대외 소통
    - 고객 공지사항 작성
    - 내부 상황 전파
    - 미디어 대응
    
  business_analyst:      # 비즈니스 영향 분석
    - 매출 손실 산정
    - 고객 영향 범위 분석
    - 보상 방안 수립
```

### 6.2 에스컬레이션 절차
```yaml
escalation_matrix:
  level_1: # 0-30분
    - 개발팀 온콜 엔지니어
    - 자동 복구 시도
    
  level_2: # 30분-1시간
    - 팀 리드 소집
    - 수동 복구 작업
    - 고객 공지 준비
    
  level_3: # 1시간 이상
    - CTO 보고
    - 전사 대응팀 구성
    - 언론 대응 준비
```

## 7. 결론 및 권고사항

### 7.1 현재 시스템의 강점
- ✅ 이벤트 기반 아키텍처로 확장성 확보
- ✅ 멱등성 보장으로 데이터 일관성 유지
- ✅ 보상 트랜잭션으로 장애 복구 가능
- ✅ 분산락으로 동시성 제어

### 7.2 주요 취약점
- ⚠️ Kafka 클러스터 단일 장애점
- ⚠️ Consumer 처리 지연 시 전체 시스템 영향
- ⚠️ 복잡한 이벤트 체인으로 디버깅 어려움
- ⚠️ 분산 환경에서 트랜잭션 추적 한계

### 7.3 우선순위별 개선 권고

**🔴 즉시 (1주 내)**
1. Kafka 클러스터 모니터링 강화
2. Circuit Breaker 패턴 도입
3. Health Check 엔드포인트 구현
4. 장애 대응 매뉴얼 숙지

**🟡 단기 (1개월 내)**
1. Dead Letter Queue 구현
2. Consumer 성능 최적화
3. 분산 추적 시스템 도입
4. 자동 복구 스크립트 개발

**🟢 장기 (3개월 내)**
1. 완전한 MSA 분리
2. 이벤트 소싱 도입
3. 다중 리전 배포
4. 카오스 엔지니어링 도입

### 7.4 성공 지표 (KPI)
```yaml
reliability_metrics:
  availability: 99.9%        # 목표: 99.99%
  mttr: 15분                 # 목표: 5분 이내
  mtbf: 30일                 # 목표: 90일
  
performance_metrics:
  event_processing_time: 2초  # 목표: 1초 이내
  consumer_lag: 100          # 목표: 50 이하
  payment_success_rate: 98%  # 목표: 99.5%
```

---

**본 보고서는 현재 이벤트 기반 콘서트 예약 시스템의 장애 시나리오를 분석하고, 실무에서 활용 가능한 구체적인 대응 방안을 제시합니다. 지속적인 모니터링과 개선을 통해 시스템의 안정성과 신뢰성을 확보할 수 있을 것입니다.**

