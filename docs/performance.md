# Performance

Run benchmarks with:

```bash
npm run benchmark
```

The benchmark suite measures:

- Registration scale for 10/100, 100/1,000, and 1,000/10,000 mutation-target graphs.
- Preview latency.
- Changed latency without adapters.
- Changed latency with fake adapters.
- Receipt generation overhead.
- Dedupe overhead.
- Manifest generation speed.
- Manifest loading speed.
- Memory delta.
- Core entry size.
- Cold import time.

Reports are written to `reports/benchmark-report.md` and `reports/benchmark-report.json`.
