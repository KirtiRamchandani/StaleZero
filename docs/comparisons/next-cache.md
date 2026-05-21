# StaleZero vs Next Cache APIs

Next.js exposes `revalidateTag`, `revalidatePath`, and related server cache APIs. StaleZero does not replace them.

StaleZero makes Next cache revalidation one target in a larger graph. The Next adapter is server-only by default, and the docs treat edge/runtime support explicitly in the compatibility matrix.
