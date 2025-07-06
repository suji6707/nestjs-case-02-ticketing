import { Injectable } from '@nestjs/common';

@Injectable()
export class DataPlatformService {
	async send(payload: any): Promise<void> {
		// 데이터분석 플랫폼에 payload 전송
		return;
	}
}
