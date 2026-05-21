import type { StaleZero } from "@stalezero/core";

export function authPack(stale: StaleZero): void {
  stale.resource("Session", { id: "sessionId", cache: { prefix: "session:" }, query: true, socket: true });
  stale.resource("User", { id: "userId", cache: true, query: true, next: true, socket: true });
  stale.resource("Role", { id: "roleId", cache: true, query: true, next: true });
  stale.mutation("UserLoggedOut", {
    affects: (input: { userId: string; sessionId?: string }) => [
      { type: "User", id: input.userId },
      ...(input.sessionId ? [{ type: "Session", id: input.sessionId }] : [])
    ],
    targets: (input: { userId: string; sessionId?: string }) => [
      { adapter: "redis", key: `user:${input.userId}`, action: "delete" },
      ...(input.sessionId ? [{ adapter: "redis", key: `session:${input.sessionId}`, action: "delete" as const }] : []),
      { adapter: "socket", key: `user:${input.userId}`, action: "notify", meta: { event: "auth.changed" } }
    ]
  });
}

export default authPack;
