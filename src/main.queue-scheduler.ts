import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { QueueBatchService } from "./queue/services/queue-batch.service";

// TODO: 카프카 제외하고 큐 스케줄러만 실행하기 위한 최소한의 모듈을 만들어 사용하기
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const queueBatchService = app.get(QueueBatchService)

  queueBatchService.startQueueScheduler();
}
bootstrap();