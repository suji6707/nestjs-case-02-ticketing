// SERVICE INJECTION TOKEN
export const REDIS_CLIENT = 'REDIS_CLIENT';

// ======================= TTL =======================
export const QUEUE_TOKEN_TTL = 3600; // 1h
export const RESERVATION_SESSION_TTL = 180; // 3min - 예약 페이지 세션 만료 시간

// export const AUTH_TOKEN_TTL = '1800'; // 3h
// export const SEAT_LOCK_TTL = 300 + 1; // 5min + 1sec
// export const PAYMENT_TOKEN_TTL = 300;

// ======================= for test =======================
export const AUTH_TOKEN_TTL = '7d';
export const SEAT_LOCK_TTL = 3 + 1; //
export const PAYMENT_TOKEN_TTL = 3;
