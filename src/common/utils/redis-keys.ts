// 분산락 관련
export const getSeatLockKey = (seatId: number): string => {
	return `seat:${seatId}`;
};

export const getPaymentLockKey = (seatId: number): string => {
	return `payment:${seatId}`;
};

// Token 관련
export const getQueueTokenKey = (token: string): string => {
	return `token:queue:${token}`;
};

export const getPaymentTokenKey = (token: string): string => {
	return `token:payment:${token}`;
};

export const getQueueTokenJobIdKey = (token: string): string => {
	return `token:queue:${token}:jobId`;
};

export const getQueueName = (concertId: number): string => {
	return `concert-${concertId}-queue`;
};

export const EXPIRE_QUEUE_NAME = 'expire-reservation';
