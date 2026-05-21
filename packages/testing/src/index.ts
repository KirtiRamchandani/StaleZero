import {
  MemoryReceiptStore,
  createStaleZero,
  entity,
  target,
  type Adapter,
  type Receipt,
  type ReceiptStore,
  type TargetRef
} from "@stalezero/core";
import { memoryAdapter, memoryTarget, type MemoryAdapter } from "@stalezero/memory";
import { memoryBus, type MemoryBus } from "@stalezero/memory-bus";

export type TestStaleZero = {
  stale: ReturnType<typeof createStaleZero>;
  adapter: MemoryAdapter;
  bus: MemoryBus;
};

export function createTestStaleZero(): TestStaleZero {
  const adapter = memoryAdapter("memory");
  const bus = memoryBus();
  const stale = createStaleZero({ app: "test", distributed: { enabled: true, ignoreSelf: false } });
  stale.use(adapter).useBus(bus);
  return { stale, adapter, bus };
}

export function fakeReceiptStore(): ReceiptStore & { receipts: Receipt[]; clear: () => void } {
  const store = new MemoryReceiptStore();
  const receipts: Receipt[] = [];
  return {
    receipts,
    save: async (receipt) => {
      receipts.push(receipt);
      await store.save(receipt);
    },
    get: (id) => store.get(id),
    list: (options) => store.list(options),
    clear: () => {
      receipts.length = 0;
    }
  };
}

export function expectReceipt(receipt: Receipt) {
  return {
    toAffect: (type: string, id: string) => {
      if (!receipt.affected.some((ref) => ref.type === type && ref.id === id)) {
        throw new Error(`Expected receipt ${receipt.id} to affect ${type}:${id}`);
      }
    },
    toInvalidateAdapter: (adapter: string) => {
      if (!receipt.targets.some((target) => target.adapter === adapter)) {
        throw new Error(`Expected receipt ${receipt.id} to include adapter ${adapter}`);
      }
    },
    toInvalidateKey: (key: string) => {
      if (!receipt.targets.some((target) => target.key === key)) {
        throw new Error(`Expected receipt ${receipt.id} to include key ${key}`);
      }
    },
    toPublishEvent: (mutation: string) => {
      if (!receipt.results.some((result) => result.adapter === "bus" && result.status === "success") || receipt.mutation !== mutation) {
        throw new Error(`Expected receipt ${receipt.id} to publish ${mutation}`);
      }
    },
    toHaveNoFailures: () => {
      if (receipt.hasFailures()) {
        throw new Error(`Expected receipt ${receipt.id} to have no failures`);
      }
    },
    notToHaveFailures: () => {
      if (receipt.hasFailures()) {
        throw new Error(`Expected receipt ${receipt.id} to have no failures`);
      }
    }
  };
}

export function adapterSpy(name = "spy"): MemoryAdapter {
  return memoryAdapter(name);
}

export function createEcommerceFixture() {
  const { stale, adapter, bus } = createTestStaleZero();
  stale.use(adapter);
  stale.mutation("ProductPriceChanged", {
    affects: ({ productId, categoryId }: { productId: string; categoryId: string }) => [
      entity("Product", productId),
      entity("Category", categoryId)
    ]
  });
  stale.mirror("RedisProduct", {
    when: "ProductPriceChanged",
    target: ({ productId }: { productId: string }) => memoryTarget(`product:${productId}`)
  });
  return { stale, adapter, bus };
}

export type AdapterContractOptions = {
  adapter: Adapter;
  validTarget?: TargetRef;
  unsupportedTarget?: TargetRef;
};

export async function runAdapterContract(adapterOrOptions: Adapter | AdapterContractOptions): Promise<void> {
  const options = "adapter" in adapterOrOptions ? adapterOrOptions : { adapter: adapterOrOptions };
  const { stale } = createTestStaleZero();
  stale.use(options.adapter);
  const receipt = await stale
    .mutate("ContractMutation", {})
    .target(options.validTarget ?? target(options.adapter.name, "contract-key", "custom"))
    .run();
  expectReceipt(receipt).toHaveNoFailures();

  if (options.unsupportedTarget) {
    const unsupported = await stale.mutate("ContractUnsupported", {}).target(options.unsupportedTarget).run();
    if (!unsupported.hasFailures()) {
      throw new Error(`Expected adapter ${options.adapter.name} to reject unsupported target`);
    }
  }
}

export function adapterContractSuite(options: AdapterContractOptions): Array<{ name: string; run: () => Promise<void> }> {
  return [
    {
      name: `${options.adapter.name} accepts a valid target`,
      run: () => runAdapterContract({ adapter: options.adapter, validTarget: options.validTarget })
    },
    ...(options.unsupportedTarget
      ? [
          {
            name: `${options.adapter.name} rejects an unsupported target`,
            run: () => runAdapterContract(options)
          }
        ]
      : [])
  ];
}

export const vitestMatchers = {
  toAffect(receipt: Receipt, type: string, id: string) {
    try {
      expectReceipt(receipt).toAffect(type, id);
      return { pass: true, message: () => `expected receipt not to affect ${type}:${id}` };
    } catch (error) {
      return { pass: false, message: () => (error instanceof Error ? error.message : String(error)) };
    }
  },
  toInvalidateKey(receipt: Receipt, key: string) {
    try {
      expectReceipt(receipt).toInvalidateKey(key);
      return { pass: true, message: () => `expected receipt not to invalidate ${key}` };
    } catch (error) {
      return { pass: false, message: () => (error instanceof Error ? error.message : String(error)) };
    }
  },
  toHaveNoFailures(receipt: Receipt) {
    try {
      expectReceipt(receipt).toHaveNoFailures();
      return { pass: true, message: () => "expected receipt to have failures" };
    } catch (error) {
      return { pass: false, message: () => (error instanceof Error ? error.message : String(error)) };
    }
  }
};

export const jestMatchers = vitestMatchers;
