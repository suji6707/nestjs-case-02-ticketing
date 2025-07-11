// on-event-safe.decorator.ts
import { Logger, applyDecorators } from '@nestjs/common';
import { OnEvent, OnEventType } from '@nestjs/event-emitter';
import { OnEventOptions } from '@nestjs/event-emitter/dist/interfaces';

function _OnEventSafe(): MethodDecorator {
	return <T>(
		target: any,
		key: string,
		descriptor: PropertyDescriptor,
	): TypedPropertyDescriptor<T> => {
		const originalMethod = descriptor.value;

		const metaKeys = Reflect.getOwnMetadataKeys(descriptor.value);
		const metas = metaKeys.map((key) => [
			key,
			Reflect.getMetadata(key, descriptor.value),
		]);

		descriptor.value = async function (...args: any[]): Promise<void> {
			try {
				await originalMethod.call(this, ...args);
			} catch (err) {
				Logger.error(err, err.stack, 'OnEventSafe');
			}
		};
		for (const [k, v] of metas) {
			Reflect.defineMetadata(k, v, descriptor.value);
		}
		return descriptor;
	};
}

export function OnEventSafe(
	event: OnEventType,
	options?: OnEventOptions | undefined,
): MethodDecorator {
	return applyDecorators(OnEvent(event, options), _OnEventSafe());
}
