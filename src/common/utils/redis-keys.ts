export const getQueueTokenKey = (token: string): string => {
	return `token:queue:${token}`;
};

export const getPaymentTokenKey = (token: string): string => {
	return `token:payment:${token}`;
};
