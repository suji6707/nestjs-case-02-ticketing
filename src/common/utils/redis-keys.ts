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
