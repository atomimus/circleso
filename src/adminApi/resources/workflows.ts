import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createWorkflowsResource(request: AdminRequester) {
  return {
    /** List lean summaries, newest first. Omitted status includes archived; "all" excludes them. */
    list: (options?: RequestOptions<"/api/admin/v2/workflows", "get">) =>
      request.get("/api/admin/v2/workflows", options),
    /** Get a workflow's trigger and actions in execution order by UUID. */
    get: (id: string, options?: RequestOptions<"/api/admin/v2/workflows/{id}", "get">) =>
      request.get("/api/admin/v2/workflows/{id}", { ...options, path: { id } }),
    /** Immediately activate an eligible automation; Circle validates triggers, actions and plan limits. */
    activate: (
      id: string,
      options?: RequestOptions<"/api/admin/v2/workflows/{id}/activate", "put">,
    ) => request.put("/api/admin/v2/workflows/{id}/activate", { ...options, path: { id } }),
    /** Immediately deactivate an active automation. Bulk action and scheduled workflows are ineligible. */
    deactivate: (
      id: string,
      options?: RequestOptions<"/api/admin/v2/workflows/{id}/deactivate", "put">,
    ) => request.put("/api/admin/v2/workflows/{id}/deactivate", { ...options, path: { id } }),
    /** Copy a workflow to draft, including its configuration, without triggering a run. */
    duplicate: (
      id: string,
      options?: RequestOptions<"/api/admin/v2/workflows/{id}/duplicate", "post">,
    ) => request.post("/api/admin/v2/workflows/{id}/duplicate", { ...options, path: { id } }),
  };
}
