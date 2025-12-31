import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createQuizzesResource(request: HeadlessRequester) {
  return {
    attempts: {
      create: (
        quizId: number,
        options: RequestOptionsWithBody<"/api/headless/v1/quizzes/{quiz_id}/attempts", "post">,
      ) =>
        request.post("/api/headless/v1/quizzes/{quiz_id}/attempts", {
          ...options,
          path: { quiz_id: quizId },
        }),
      get: (
        quizId: number,
        id: number,
        options?: RequestOptions<"/api/headless/v1/quizzes/{quiz_id}/attempts/{id}", "get">,
      ) =>
        request.get("/api/headless/v1/quizzes/{quiz_id}/attempts/{id}", {
          ...options,
          path: { quiz_id: quizId, id },
        }),
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
