import { Injectable, Logger } from '@nestjs/common';
import { QueueSchedulerService } from './queue-scheduler.service';
import { QueueRankingService } from '../../ticketing/application/services/queue-ranking.service';

/**
 * 전략 1: Batch + Polling 방식 적용
 * 개별 요청마다 updateEntireQueue() 호출하지 않고 스케줄러에 위임
 */
@Injectable()
export class QueueBatchService {
	private readonly logger = new Logger(QueueBatchService.name);

	constructor(
		private readonly queueSchedulerService: QueueSchedulerService,
		private readonly queueRankingService: QueueRankingService,
	) {}

	/**
	 * 🚀 배치 스케줄러 시작
	 */
	startQueueScheduler(): void {
		// 500ms 간격으로 큐 업데이트 (추천)
		this.queueSchedulerService.startBatchScheduler(100);
		
		// 더 빠른 응답이 필요한 경우 200ms 사용
		// this.queueSchedulerService.startFastScheduler();
		
		this.logger.log('✅ Queue batch scheduler started');
	}

	/**
	 * 🔍 큐 상태 폴링 API (클라이언트용)
	 * 클라이언트가 주기적으로 호출하여 active 상태 확인
	 */
	async getQueueStatusForPolling(
		userId: number,
		queueToken: string,
	): Promise<{
		status: 'WAITING' | 'ACTIVE' | 'EXPIRED';
		waitingRank?: number;
		activeRemainTime?: number;
		estimatedWaitTime?: number;
	}> {
		try {
			// 큐 상태 확인
			const queueStatus = await this.queueRankingService.checkQueueStatus(
				queueToken,
			);

			if (queueStatus.activeRemainTime > 0) {
				return {
					status: 'ACTIVE',
					activeRemainTime: queueStatus.activeRemainTime,
				};
			}

			if (queueStatus.waitingRank >= 0) {
				// 예상 대기 시간 계산 (평균 처리 시간 기반)
				const avgProcessingTime = 1000 * 60; // 1분 가정
				const estimatedWaitTime = queueStatus.waitingRank * avgProcessingTime;

				return {
					status: 'WAITING',
					waitingRank: queueStatus.waitingRank,
					estimatedWaitTime,
				};
			}

			return { status: 'EXPIRED' };
		} catch (error) {
			this.logger.error('Queue status polling failed:', error);
			return { status: 'EXPIRED' };
		}
	}

	/**
	 * 🛑 스케줄러 중지 (애플리케이션 종료 시)
	 */
	stopQueueScheduler(): void {
		this.queueSchedulerService.stopBatchScheduler();
		this.logger.log('✅ Queue batch scheduler stopped');
	}
}