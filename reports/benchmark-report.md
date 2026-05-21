# Benchmark Report

| Scenario | Runs | min ms | p50 ms | p95 ms | max ms |
| --- | --- | --- | --- | --- | --- |
| preview: 10 mutations / 100 targets | 50 | 0.051 | 0.085 | 0.556 | 8.378 |
| changed no adapters: 10 mutations / 100 targets | 50 | 0.034 | 0.056 | 0.462 | 3.229 |
| changed fake adapters: 10 mutations / 100 targets | 50 | 0.137 | 0.220 | 0.847 | 2.547 |
| receipt generation overhead | 50 | 0.028 | 0.040 | 0.157 | 1.922 |
| dedupe overhead: 1,000 duplicate targets | 25 | 0.877 | 1.169 | 2.425 | 2.716 |
| preview: 100 mutations / 1,000 targets | 25 | 0.069 | 0.242 | 0.327 | 0.332 |
| preview: 1,000 mutations / 10,000 targets | 10 | 0.490 | 0.541 | 1.285 | 1.285 |
| manifest generation: 1,000 mutations / 10,000 targets | 10 | 246.064 | 386.710 | 427.437 | 427.437 |
| manifest loading: 1,000 mutations / 10,000 targets | 10 | 0.009 | 0.014 | 0.343 | 0.343 |
| cold import: @stalezero/core | 5 | 1.830 | 2.055 | 2.938 | 2.938 |

## Size and memory

| Metric | Value |
| --- | --- |
| Core ESM entry | 0.52 kB |
| Heap delta during benchmark | 14.59 MB |
| Source maps policy | generated in dist for debugging; published tarballs include them intentionally |
