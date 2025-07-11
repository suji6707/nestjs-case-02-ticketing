import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
	EventHandler,
	IEvent,
	IEventBus,
} from 'src/common/interfaces/ievent-bus.interface';

@Injectable()
export class NestEventBus implements IEventBus {
	constructor(private readonly eventEmitter: EventEmitter2) {}

	publish<T extends IEvent>(event: T): void {
		this.eventEmitter.emit(event.eventName, event);
	}

	subscribe<T extends IEvent>(
		eventName: string,
		listener: EventHandler<T>,
	): void {
		this.eventEmitter.on(eventName, listener);
	}
}
