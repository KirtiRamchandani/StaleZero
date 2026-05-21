# Release Checklist

Run this before publishing:

```bash
npm run verify:rc
npm run verify:clean-clone
```

Checklist:

- Clean clone verification report generated.
- npm pack verification report generated.
- Consumer smoke tests generated.
- Adapter conformance report generated.
- CLI smoke-test report generated.
- Examples run report generated.
- Benchmark report generated.
- Package graph report generated.
- Security hardening report generated.
- No test files in package tarballs.
- README and license included in tarballs.
- `.d.ts` files included in tarballs.
- CI matrix passes on Linux, macOS, and Windows.
- Release dry-run workflow passes.
- Protected release environment approved.
- npm provenance is enabled.
