import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCoursesResource(request: AdminRequester) {
  return {
    sections: {
      /**
       * List course sections.
       * @param options Query params (flat) plus request metadata.
       * @returns Course section list response.
       */
      list: (options?: RequestOptions<"/api/admin/v2/course_sections", "get">) =>
        request.get("/api/admin/v2/course_sections", options),
      /**
       * Create a course section.
       * @param options Body fields (flat) plus request metadata.
       * @returns Created course section response.
       */
      create: (options: RequestOptionsWithBody<"/api/admin/v2/course_sections", "post">) =>
        request.post("/api/admin/v2/course_sections", options),
      /**
       * Get a course section by ID.
       * @param id Course section ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Course section response.
       */
      get: (id: number, options?: RequestOptions<"/api/admin/v2/course_sections/{id}", "get">) =>
        request.get("/api/admin/v2/course_sections/{id}", {
          ...options,
          path: { id },
        }),
      /**
       * Update a course section.
       * @param id Course section ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Updated course section response.
       */
      update: (
        id: number,
        options: RequestOptionsWithBody<"/api/admin/v2/course_sections/{id}", "put">,
      ) =>
        request.put("/api/admin/v2/course_sections/{id}", {
          ...options,
          path: { id },
        }),
      /**
       * Delete a course section.
       * @param id Course section ID.
       * @param options Request metadata.
       * @returns Delete response.
       */
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
      /**
       * List course lessons.
       * @param options Query params (flat) plus request metadata.
       * @returns Course lesson list response.
       */
      list: (options?: RequestOptions<"/api/admin/v2/course_lessons", "get">) =>
        request.get("/api/admin/v2/course_lessons", options),
      /**
       * Create a course lesson.
       * @param options Body fields (flat) plus request metadata.
       * @returns Created course lesson response.
       */
      create: (options: RequestOptionsWithBody<"/api/admin/v2/course_lessons", "post">) =>
        request.post("/api/admin/v2/course_lessons", options),
      /**
       * Get a course lesson by ID.
       * @param id Course lesson ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Course lesson response.
       */
      get: (id: number, options?: RequestOptions<"/api/admin/v2/course_lessons/{id}", "get">) =>
        request.get("/api/admin/v2/course_lessons/{id}", {
          ...options,
          path: { id },
        }),
      /**
       * Update a course lesson.
       * @param id Course lesson ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Updated course lesson response.
       */
      update: (
        id: number,
        options: RequestOptionsWithBody<"/api/admin/v2/course_lessons/{id}", "patch">,
      ) =>
        request.patch("/api/admin/v2/course_lessons/{id}", {
          ...options,
          path: { id },
        }),
      /**
       * Delete a course lesson.
       * @param id Course lesson ID.
       * @param options Request metadata.
       * @returns Delete response.
       */
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
      /**
       * Update course lesson progress.
       * @param options Body fields (flat) plus request metadata.
       * @returns Update progress response.
       */
      update: (options: RequestOptionsWithBody<"/api/admin/v2/course_lesson_progress", "put">) =>
        request.put("/api/admin/v2/course_lesson_progress", options),
    },
  };
}
