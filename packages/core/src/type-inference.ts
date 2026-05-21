import { createStaleZero, entity } from "./index.js";

const schema = {
  parse(input: unknown): { userId: string; teamId: string } {
    return input as { userId: string; teamId: string };
  }
};

const stale = createStaleZero().mutation("UserUpdated", {
  schema,
  affects: ({ userId, teamId }) => [entity("User", userId), entity("Team", teamId)]
});

void stale.changed("UserUpdated", { userId: "123", teamId: "456" });

// @ts-expect-error userId is required by the registered mutation schema.
void stale.changed("UserUpdated", { teamId: "456" });

// @ts-expect-error teamId is required by the registered mutation schema.
void stale.preview("UserUpdated", { userId: "123" });
