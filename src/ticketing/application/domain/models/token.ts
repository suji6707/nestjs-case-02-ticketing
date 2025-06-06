export enum TokenStatus {
	WAITING = 'WAITING',
	PROCESSING = 'PROCESSING',
	COMPLETED = 'COMPLETED',
	EXPIRED = 'EXPIRED',
}

export enum TokenPurpose {
	QUEUE_ENTRY = 'QUEUE_ENTRY',
	PAYMENT = 'PAYMENT',
}

export interface TokenPayload {
	userId: number;
	concertId: number;
	status: TokenStatus;
	purpose: TokenPurpose;
	createdAt: Date;
	updatedAt: Date;
}
