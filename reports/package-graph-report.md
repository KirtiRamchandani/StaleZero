# Package Graph Report

| Package | Path | Internal dependencies |
| --- | --- | --- |
| @stalezero/apollo | packages\adapters\apollo | @stalezero/core |
| @stalezero/cloudflare-kv | packages\adapters\cloudflare-kv | @stalezero/core |
| @stalezero/graphql | packages\adapters\graphql | @stalezero/core |
| @stalezero/http | packages\adapters\http | @stalezero/core |
| @stalezero/memory | packages\adapters\memory | @stalezero/core |
| @stalezero/next | packages\adapters\next | @stalezero/core |
| @stalezero/react-query | packages\adapters\react-query | @stalezero/core |
| @stalezero/redis | packages\adapters\redis | @stalezero/core |
| @stalezero/redux | packages\adapters\redux | @stalezero/core |
| @stalezero/rtk-query | packages\adapters\rtk-query | @stalezero/core |
| @stalezero/search | packages\adapters\search | @stalezero/core |
| @stalezero/swr | packages\adapters\swr | @stalezero/core |
| @stalezero/trpc | packages\adapters\trpc | @stalezero/core |
| @stalezero/websocket | packages\adapters\websocket | @stalezero/core |
| @stalezero/zustand | packages\adapters\zustand | @stalezero/core |
| @stalezero/http-bus | packages\bus\http | @stalezero/core |
| @stalezero/kafka-bus | packages\bus\kafka | @stalezero/core |
| @stalezero/memory-bus | packages\bus\memory | @stalezero/core |
| @stalezero/nats-bus | packages\bus\nats | @stalezero/core |
| @stalezero/postgres-bus | packages\bus\postgres | @stalezero/core |
| @stalezero/redis-bus | packages\bus\redis | @stalezero/core |
| @stalezero/cli | packages\cli | @stalezero/core |
| @stalezero/core | packages\core | none |
| create-stalezero-adapter-template | packages\create-stalezero-adapter-template | @stalezero/core |
| @stalezero/devtools | packages\devtools | @stalezero/core |
| @stalezero/github-action | packages\github-action | @stalezero/core |
| @stalezero/otel | packages\otel | @stalezero/core |
| @stalezero/pack-auth | packages\pack-auth | @stalezero/core |
| @stalezero/pack-commerce | packages\pack-commerce | @stalezero/core |
| @stalezero/pack-saas | packages\pack-saas | @stalezero/core |
| @stalezero/recipes | packages\recipes | @stalezero/core |
| @stalezero/snapshot | packages\snapshot | @stalezero/core |
| stalezero | packages\stalezero | @stalezero/core, @stalezero/memory, @stalezero/redis, @stalezero/redux, @stalezero/react-query, @stalezero/rtk-query, @stalezero/swr, @stalezero/trpc, @stalezero/next, @stalezero/apollo, @stalezero/zustand, @stalezero/graphql, @stalezero/cloudflare-kv, @stalezero/http, @stalezero/websocket, @stalezero/search, @stalezero/memory-bus, @stalezero/redis-bus, @stalezero/postgres-bus, @stalezero/http-bus, @stalezero/kafka-bus, @stalezero/nats-bus, @stalezero/devtools, @stalezero/otel, @stalezero/snapshot, @stalezero/github-action, @stalezero/recipes, @stalezero/pack-saas, @stalezero/pack-commerce, @stalezero/pack-auth |
| @stalezero/testing | packages\testing | @stalezero/core, @stalezero/memory, @stalezero/memory-bus |

Circular dependencies: none