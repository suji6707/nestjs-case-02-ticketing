import { Injectable, Logger } from '@nestjs/common';
import { QueueRankingService } from 'src/ticketing/application/services/queue-ranking.service';
import { RedisService } from 'src/common/services/redis/redis.service';

/**
 * 전략 1: Batch + Polling 방식
 * 주기적으로 큐 업데이트를 실행하여 동시성 경합을 줄임
 */
@Injectable()
export class QueueSchedulerService {
	private readonly logger = new Logger(QueueSchedulerService.name);
	private isRunning = false;
	private intervalId: NodeJS.Timeout | null = null;
	private readonly instanceId = `scheduler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	private readonly leaderKey = 'queue:scheduler:leader';
	private readonly leaderTTL = 10; // 10초

	constructor(
		private readonly queueRankingService: QueueRankingService,
		private readonly redisService: RedisService,
	) {}

	/**
	 * 🏆 리더 선출 기반 배치 스케줄러 시작
	 * - 🔄 500ms마다 큐 업데이트 실행
	 * - 동시성 경합을 방지하기 위해 리더 선출을 사용
	 */
	private isCurrentLeader = false;
	private heartbeatInterval: NodeJS.Timeout | null = null;
	
	startBatchScheduler(intervalMs = 500): void {
	    if (this.intervalId) {
	        this.logger.warn('Scheduler already running');
	        return;
	    }
	    
	    // 리더 선출 시도
	    this.tryBecomeLeader();
	    
	    // 주기적으로 리더십 확인
	    this.intervalId = setInterval(async () => {
	        if (this.isCurrentLeader) {
	            await this.updateQueueBatch();
	        } else {
	            await this.tryBecomeLeader();
	        }
	    }, intervalMs);
	    
	    this.logger.log(`✅ Queue scheduler started with leader election`);
	}
	
	private async tryBecomeLeader(): Promise<void> {
	    try {
	        const becameLeader = await this.redisService.set(
	            this.leaderKey,
	            this.instanceId,
	            this.leaderTTL,
	            true,
	        );
	        
	        if (becameLeader) {
	            this.isCurrentLeader = true;
	            this.startHeartbeat();
	            this.logger.log(`[${this.instanceId}] 🏆 Became leader`);
	        }
	    } catch (error) {
	        this.logger.error('Leader election failed:', error);
	    }
	}
	
	private startHeartbeat(): void {
	    if (this.heartbeatInterval) {
	        clearInterval(this.heartbeatInterval);
	    }
	    
	    // TTL의 절반 주기로 heartbeat
	    this.heartbeatInterval = setInterval(async () => {
	        try {
	            const currentLeader = await this.redisService.get(this.leaderKey);
	            
	            if (currentLeader === this.instanceId) {
	                // 리더십 유지: TTL 연장
	                await this.redisService.set(this.leaderKey, this.instanceId, this.leaderTTL);
	            } else {
	                // 리더십 상실
	                this.isCurrentLeader = false;
	                this.stopHeartbeat();
	                this.logger.warn(`[${this.instanceId}] 👥 Lost leadership`);
	            }
	        } catch (error) {
	            this.logger.error('Heartbeat failed:', error);
	            this.isCurrentLeader = false;
	            this.stopHeartbeat();
	        }
	    }, (this.leaderTTL * 1000) / 2); // TTL의 절반 주기
	}
	
	private stopHeartbeat(): void {
	    if (this.heartbeatInterval) {
	        clearInterval(this.heartbeatInterval);
	        this.heartbeatInterval = null;
	    }
	}
	
	/**
	 * 스케줄러 중지
	 */
	stopBatchScheduler(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
			this.logger.log('✅ Queue batch scheduler stopped');
		}
	}

	private async updateQueueBatch(): Promise<void> {
		if (this.isRunning) {
			this.logger.debug('Queue update already running, skipping...');
			return;
		}

		try {
			this.isRunning = true;
			const start = Date.now();
			
			await this.queueRankingService.updateEntireQueue();
			
			const duration = Date.now() - start;
			this.logger.log(`✅ Batch queue update completed in ${duration}ms`);
		} catch (error) {
			this.logger.error('❌ Batch queue update failed:', error);
		} finally {
			this.isRunning = false;
		}
	}

	/**
	 * 🔄 빠른 간격으로 큐 업데이트 (200ms)
	 */
	startFastScheduler(): void {
		this.startBatchScheduler(200);
	}

	/**
	 * 수동으로 큐 업데이트 트리거 (테스트용)
	 */
	async triggerManualUpdate(): Promise<void> {
		if (this.isRunning) {
			throw new Error('Queue update is already running');
		}
		
		await this.updateQueueBatch();
	}
}