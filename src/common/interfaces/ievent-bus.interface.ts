export interface IEvent {
	eventName: string;
	timestamp: Date;
	data: any;
}

export interface IKafkaEvent extends IEvent {
	eventId: string;
}

export type EventHandler<T extends IEvent> = (event: T) => void;

export interface IEventBus {
	publish<T extends IEvent>(event: T, messageKey?: string): void;
	subscribe?<T extends IEvent>(
		eventName: string,
		listener: EventHandler<T>,
	): void;
}
