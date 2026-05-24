# Benchmark Report

| Scenario | Runs | min ms | p50 ms | p95 ms | max ms |
| --- | --- | --- | --- | --- | --- |
| preview: 10 mutations / 100 targets | 50 | 0.031 | 0.034 | 0.196 | 3.671 |
| changed no adapters: 10 mutations / 100 targets | 50 | 0.021 | 0.024 | 0.257 | 2.662 |
| changed fake adapters: 10 mutations / 100 targets | 50 | 0.091 | 0.113 | 0.442 | 1.387 |
| receipt generation overhead | 50 | 0.019 | 0.021 | 0.048 | 0.091 |
| dedupe overhead: 1,000 duplicate targets | 25 | 0.428 | 0.529 | 1.044 | 1.147 |
| preview: 100 mutations / 1,000 targets | 25 | 0.043 | 0.086 | 0.157 | 0.341 |
| preview: 1,000 mutations / 10,000 targets | 10 | 0.305 | 0.414 | 1.098 | 1.098 |
| manifest generation: 1,000 mutations / 10,000 targets | 10 | 131.688 | 138.844 | 195.340 | 195.340 |
| manifest loading: 1,000 mutations / 10,000 targets | 10 | 0.003 | 0.004 | 0.305 | 0.305 |
| cold import: @stalezero/core | 5 | 0.920 | 1.004 | 1.928 | 1.928 |

## Size and memory

| Metric | Value |
| --- | --- |
| Core ESM entry | 1.37 kB |
| Heap delta during benchmark | 7.94 MB |
| Source maps policy | generated in dist for debugging; published tarballs include them intentionally |
