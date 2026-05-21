# Testing Guide

```ts
import { createTestStaleZero, expectReceipt } from "@stalezero/testing";

const { stale } = createTestStaleZero();

const receipt = await stale
  .mutate("UserUpdated", { userId: "123" })
  .target(memoryTarget("user:123"))
  .run();

expectReceipt(receipt).toInvalidateKey("user:123");
expectReceipt(receipt).toHaveNoFailures();
```

The testing package includes:

- `createTestStaleZero()`
- `adapterSpy()`
- `fakeReceiptStore()`
- `vitestMatchers`
- `jestMatchers`
- `createEcommerceFixture()`
- `runAdapterContract()`
