import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createGamificationResource(request: AdminRequester) {
  return {
    leaderboard: (options?: RequestOptions<"/api/admin/v2/gamification/leaderboard", "get">) =>
      request.get("/api/admin/v2/gamification/leaderboard", options),
  };
}
