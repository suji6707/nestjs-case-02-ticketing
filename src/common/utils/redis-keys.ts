// sorted set 관련
export const getDurationKey = (scheduleId: number): string => {
	return `schedule:${scheduleId}`;
};

export const getFastSelloutRankingKey = (): string => {
	return 'fast_sellout_ranking';
};

export const getSellingStartTimeKey = (scheduleId: number): string => {
	return `selling_start_time:schedule:${scheduleId}`;
};

export const getTotalSeatsCountKey = (scheduleId: number): string => {
	return `total_seats_count:schedule:${scheduleId}`;
};

export const getBookedCountKey = (scheduleId: number): string => {
	return `booked_count:schedule:${scheduleId}`;
};

// 분산락 관련
export const getSeatLockKey = (seatId: number): string => {
	return `seat:${seatId}`;
};

export const getPaymentLockKey = (seatId: number): string => {
	return `payment:${seatId}`;
};

// 캐싱 관련
export const getSchedulesCacheKey = (concertId: number): string => {
	return `concert:${concertId}:schedules`;
};

export const getSeatsCacheKey = (scheduleId: number): string => {
	return `schedule:${scheduleId}:seats`;
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
