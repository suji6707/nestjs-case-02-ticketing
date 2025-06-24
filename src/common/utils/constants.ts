// SERVICE INJECTION TOKEN
export const REDIS_CLIENT = 'REDIS_CLIENT';
export const DISTRIBUTED_LOCK_SERVICE = 'DISTRIBUTED_LOCK_SERVICE';

// ======================= TTL (비즈니스 로직) =======================
export const QUEUE_TOKEN_TTL = 3600; // 1h
export const RESERVATION_SESSION_TTL = 180; // 3min - 예약 페이지 세션 만료 시간

// export const AUTH_TOKEN_TTL = '1800'; // 3h
export const SEAT_EXPIRE_TTL = 300 + 1; // 5min + 1sec
export const PAYMENT_EXPIRE_TTL = 300; // 결제 요청 대기시간 5min

// ======================= LOCK TTL (분산락) =======================
// P95 x margin ?
export const PAYMENT_LOCK_TTL = 3; // 3sec - 너무 짧으면 트랜잭션 커밋 전에 해제됨
export const SEAT_LOCK_TTL = 3; // 3sec

// ======================= for test =======================
export const AUTH_TOKEN_TTL = '7d';
// export const SEAT_EXPIRE_TTL = 3 + 1; //
// export const PAYMENT_EXPIRE_TTL = 3;
