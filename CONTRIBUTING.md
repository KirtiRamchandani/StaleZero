# Contributing

The best contributions keep the core small and make adapters feel native to the ecosystem they touch.

Before opening a pull request:

1. Run `npm run check`.
2. Add a focused test for behavior that can break.
3. Keep optional integrations in adapter packages.
4. Avoid adding runtime dependencies to `@stalezero/core`.

Good first issues are usually target helpers, adapter examples, and receipt formatting improvements.

## Templates

- Adapter template: [docs/adapter-template.md](docs/adapter-template.md)
- Bus template: [docs/bus-template.md](docs/bus-template.md)
- Example template: [docs/example-template.md](docs/example-template.md)

## Recognition

Release notes should call out new adapters, examples, docs, and bug fixes by contributor name when the contributor wants that included.
