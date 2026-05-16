# KafkaDesk
KafkaDesk with golang


## Konfigurasi Multi-Cluster

KafkaDesk mendukung pengelolaan banyak cluster Kafka sekaligus. Konfigurasi cluster dibaca dari Environment Variables dengan format:

`KAFKA_CLUSTERS_<INDEX>_<PROPERTY>`

- `<INDEX>`: Dimulai dari `0`, `1`, dst. Server akan berhenti membaca jika index berikutnya tidak ditemukan.
- `<PROPERTY>`: Nama properti (misal: `NAME`, `BOOTSTRAPSERVERS`).

### Contoh Konfigurasi (ENV)

```env
# Cluster ke-0
KAFKA_CLUSTERS_0_NAME=local-dev
KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=localhost:9092

# Cluster ke-1
KAFKA_CLUSTERS_1_NAME=production-aiven
KAFKA_CLUSTERS_1_BOOTSTRAPSERVERS=kafka-prod.aivencloud.com:19257
KAFKA_CLUSTERS_1_PROPERTIES_SECURITY_PROTOCOL=SASL_SSL
KAFKA_CLUSTERS_1_PROPERTIES_SASL_MECHANISM=PLAIN
KAFKA_CLUSTERS_1_PROPERTIES_SASL_JAAS_CONFIG="org.apache.kafka.common.security.plain.PlainLoginModule required username=\"user\" password=\"pass\";"
```
