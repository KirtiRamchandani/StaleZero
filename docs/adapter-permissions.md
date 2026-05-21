# Adapter Permissions Guide

Give every adapter the narrowest credential that can perform its target actions.

| Adapter | Minimum useful permission |
| --- | --- |
| Redis | Delete selected key prefixes, publish selected channels, append selected streams. |
| React Query/SWR/Redux/Zustand | In-process client access only. |
| Next cache | Server-only access to `revalidateTag`, `revalidatePath`, or `updateTag`. |
| Cloudflare KV | Delete or write selected namespace keys. |
| Search | Enqueue reindex jobs or update selected indexes. |
| WebSocket | Emit to selected rooms/events. |
| HTTP | POST to selected webhook endpoints. |
| Kafka/NATS/Redis buses | Publish and subscribe to selected topics/channels/streams. |

Do not share database write credentials with cache invalidation adapters unless the adapter truly needs them.
