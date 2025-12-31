import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCoursesResource(request: AdminRequester) {
  return {
    sections: {
      list: (options?: RequestOptions<"/api/admin/v2/course_sections", "get">) =>
        request.get("/api/admin/v2/course_sections", options),
      create: (options: RequestOptionsWithBody<"/api/admin/v2/course_sections", "post">) =>
        request.post("/api/admin/v2/course_sections", options),
      get: (id: number, options?: RequestOptions<"/api/admin/v2/course_sections/{id}", "get">) =>
        request.get("/api/admin/v2/course_sections/{id}", {
          ...options,
          path: { id },
        }),
      update: (
        id: number,
        options: RequestOptionsWithBody<"/api/admin/v2/course_sections/{id}", "put">,
      ) =>
        request.put("/api/admin/v2/course_sections/{id}", {
          ...options,
          path: { id },
        }),
      delete: (
        id: number,
        options?: RequestOptions<"/api/admin/v2/course_sections/{id}", "delete">,
      ) =>
        request.delete("/api/admin/v2/course_sections/{id}", {
          ...options,
          path: { id },
        }),
    },
    lessons: {
      list: (options?: RequestOptions<"/api/admin/v2/course_lessons", "get">) =>
        request.get("/api/admin/v2/course_lessons", options),
      create: (options: RequestOptionsWithBody<"/api/admin/v2/course_lessons", "post">) =>
        request.post("/api/admin/v2/course_lessons", options),
      get: (id: number, options?: RequestOptions<"/api/admin/v2/course_lessons/{id}", "get">) =>
        request.get("/api/admin/v2/course_lessons/{id}", {
          ...options,
          path: { id },
        }),
      update: (
        id: number,
        options: RequestOptionsWithBody<"/api/admin/v2/course_lessons/{id}", "patch">,
      ) =>
        request.patch("/api/admin/v2/course_lessons/{id}", {
          ...options,
          path: { id },
        }),
      delete: (
        id: number,
        options?: RequestOptions<"/api/admin/v2/course_lessons/{id}", "delete">,
      ) =>
        request.delete("/api/admin/v2/course_lessons/{id}", {
          ...options,
          path: { id },
        }),
    },
    lessonProgress: {
      update: (options: RequestOptionsWithBody<"/api/admin/v2/course_lesson_progress", "put">) =>
        request.put("/api/admin/v2/course_lesson_progress", options),
    },
  };
}
