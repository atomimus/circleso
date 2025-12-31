import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createQuizzesResource(request: HeadlessRequester) {
  return {
    attempts: {
      /**
       * Create a quiz attempt.
       * @param quizId Quiz ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Created quiz attempt response.
       */
      create: (
        quizId: number,
        options: RequestOptionsWithBody<"/api/headless/v1/quizzes/{quiz_id}/attempts", "post">,
      ) =>
        request.post("/api/headless/v1/quizzes/{quiz_id}/attempts", {
          ...options,
          path: { quiz_id: quizId },
        }),
      /**
       * Get a quiz attempt by ID.
       * @param quizId Quiz ID.
       * @param id Attempt ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Quiz attempt response.
       */
      get: (
        quizId: number,
        id: number,
        options?: RequestOptions<"/api/headless/v1/quizzes/{quiz_id}/attempts/{id}", "get">,
      ) =>
        request.get("/api/headless/v1/quizzes/{quiz_id}/attempts/{id}", {
          ...options,
          path: { quiz_id: quizId, id },
        }),
      /**
       * Update a quiz attempt.
       * @param quizId Quiz ID.
       * @param id Attempt ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Updated quiz attempt response.
       */
      update: (
        quizId: number,
        id: number,
        options: RequestOptionsWithBody<"/api/headless/v1/quizzes/{quiz_id}/attempts/{id}", "put">,
      ) =>
        request.put("/api/headless/v1/quizzes/{quiz_id}/attempts/{id}", {
          ...options,
          path: { quiz_id: quizId, id },
        }),
    },
  };
}
