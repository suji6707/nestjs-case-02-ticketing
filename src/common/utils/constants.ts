// export const AUTH_TOKEN_TTL = '1800'; // 3h
export const AUTH_TOKEN_TTL = '7d'; // 테스트용

export const QUEUE_TOKEN_TTL = 3600; // 1h
// 예약 페이지 세션 만료 시간
export const RESERVATION_SESSION_TTL = 180; // 3min

export const SEAT_LOCK_TTL = 300 + 1; // 5min + 1sec
export const PAYMENT_TOKEN_TTL = 300;

// SERVICE INJECTION TOKEN
export const REDIS_CLIENT = 'REDIS_CLIENT';
