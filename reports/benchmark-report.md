# Benchmark Report

| Scenario | Runs | min ms | p50 ms | p95 ms | max ms |
| --- | --- | --- | --- | --- | --- |
| preview: 10 mutations / 100 targets | 50 | 0.022 | 0.026 | 0.252 | 3.935 |
| changed no adapters: 10 mutations / 100 targets | 50 | 0.015 | 0.017 | 0.106 | 1.369 |
| changed fake adapters: 10 mutations / 100 targets | 50 | 0.061 | 0.077 | 0.272 | 1.033 |
| receipt generation overhead | 50 | 0.013 | 0.015 | 0.039 | 0.129 |
| dedupe overhead: 1,000 duplicate targets | 25 | 0.348 | 0.440 | 0.833 | 0.906 |
| preview: 100 mutations / 1,000 targets | 25 | 0.030 | 0.069 | 0.128 | 0.147 |
| preview: 1,000 mutations / 10,000 targets | 10 | 0.210 | 0.237 | 0.485 | 0.485 |
| manifest generation: 1,000 mutations / 10,000 targets | 10 | 106.889 | 149.730 | 163.885 | 163.885 |
| manifest loading: 1,000 mutations / 10,000 targets | 10 | 0.002 | 0.003 | 0.153 | 0.153 |
| cold import: @stalezero/core | 5 | 0.814 | 0.829 | 1.261 | 1.261 |

## Size and memory

| Metric | Value |
| --- | --- |
| Core ESM entry | 1.34 kB |
| Heap delta during benchmark | 8.07 MB |
| Source maps policy | generated in dist for debugging; published tarballs include them intentionally |
