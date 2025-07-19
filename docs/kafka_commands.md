# Kafka CLI 명령어 참고서

## 🚀 토픽 관리

### 토픽 생성
```bash
# 기본 토픽 생성
docker exec -it broker1 kafka-topics --create \
  --topic payment-events \
  --partitions 3 \
  --replication-factor 3 \
  --bootstrap-server broker1:9092

# 설정 옵션 포함 토픽 생성
docker exec -it broker1 kafka-topics --create \
  --topic reservation-events \
  --partitions 3 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config segment.ms=86400000 \
  --bootstrap-server broker1:9092
```

### 토픽 조회
```bash
# 토픽 목록
docker exec -it broker1 kafka-topics --list \
  --bootstrap-server broker1:9092

# 토픽 상세 정보
docker exec -it broker1 kafka-topics --describe \
  --topic payment-events \
  --bootstrap-server broker1:9092

# 모든 토픽 상세 정보
docker exec -it broker1 kafka-topics --describe \
  --bootstrap-server broker1:9092

# 파티션 정보 조회
docker exec -it broker1 kafka-topics --describe \
  --topic <토픽명> \
  --bootstrap-server broker1:9092

# 파티션별 오프셋 정보
docker exec -it broker1 kafka-run-class kafka.tools.GetOffsetShell \
  --broker-list broker1:9092 \
  --topic <토픽명>

# Consumer Group의 오프셋(라그) 정보
docker exec -it broker1 kafka-consumer-groups \
  --bootstrap-server broker1:9092 \
  --group <컨슈머그룹명> \
  --describe
```

### 토픽 수정/삭제
```bash
# 파티션 수 증가 (감소는 불가능)
docker exec -it broker1 kafka-topics --alter \
  --topic payment-events \
  --partitions 5 \
  --bootstrap-server broker1:9092

# 토픽 삭제
docker exec -it broker1 kafka-topics --delete \
  --topic payment-events \
  --bootstrap-server broker1:9092
```

## 📨 메시지 송수신 테스트

### Producer 테스트
```bash
# 기본 Producer
docker exec -it broker1 kafka-console-producer \
  --topic payment-events \
  --bootstrap-server broker1:9092

# Key-Value Producer
docker exec -it broker1 kafka-console-producer \
  --topic payment-events \
  --bootstrap-server broker1:9092 \
  --property "key.separator=:" \
  --property "parse.key=true"

# 입력 예시: user123:{"eventType":"payment.success","amount":50000}
```

### Consumer 테스트
```bash
# 처음부터 모든 메시지 읽기
docker exec -it broker1 kafka-console-consumer \
  --topic payment-events \
  --bootstrap-server broker1:9092 \
  --from-beginning

# Key와 함께 읽기
docker exec -it broker1 kafka-console-consumer \
  --topic payment-events \
  --bootstrap-server broker1:9092 \
  --from-beginning \
  --property "print.key=true" \
  --property "key.separator=:"

# Consumer Group으로 읽기
docker exec -it broker1 kafka-console-consumer \
  --topic payment-events \
  --bootstrap-server broker1:9092 \
  --group test-group
```

## 🔍 모니터링 및 디버깅

### Consumer Group 관리
```bash
# Consumer Group 목록
docker exec -it broker1 kafka-consumer-groups \
  --bootstrap-server broker1:9092 \
  --list

# Consumer Group 상태 확인
docker exec -it broker1 kafka-consumer-groups \
  --bootstrap-server broker1:9092 \
  --group ticketing-consumer-group \
  --describe

# Consumer Group 오프셋 리셋
docker exec -it broker1 kafka-consumer-groups \
  --bootstrap-server broker1:9092 \
  --group ticketing-consumer-group \
  --topic payment-events \
  --reset-offsets --to-earliest \
  --execute
```

### 로그 및 오프셋 확인
```bash
# 토픽의 최신/최초 오프셋 확인
docker exec -it broker1 kafka-run-class kafka.tools.GetOffsetShell \
  --broker-list broker1:9092 \
  --topic payment-events

# 특정 파티션의 메시지 개수
docker exec -it broker1 kafka-run-class kafka.tools.GetOffsetShell \
  --broker-list broker1:9092 \
  --topic payment-events \
  --partitions 0
```

## 🛠️ 성능 테스트

### Producer 성능 테스트
```bash
docker exec -it broker1 kafka-producer-perf-test \
  --topic payment-events \
  --num-records 10000 \
  --record-size 1000 \
  --throughput 1000 \
  --producer-props bootstrap.servers=broker1:9092
```

### Consumer 성능 테스트
```bash
docker exec -it broker1 kafka-consumer-perf-test \
  --topic payment-events \
  --messages 10000 \
  --bootstrap-server broker1:9092
```

## 📋 참고 링크
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Confluent Kafka Tools](https://docs.confluent.io/platform/current/kafka/operations-tools/kafka-tools.html)
- [Kafka Console Tools Tutorial](https://docs.confluent.io/platform/current/tutorials/examples/clients/docs/console.html)
