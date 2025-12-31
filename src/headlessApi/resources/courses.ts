import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCoursesResource(request: HeadlessRequester) {
  return {
    sections: {
      /**
       * List course sections.
       * @param courseId Course ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Course section list response.
       */
      list: (
        courseId: number,
        options?: RequestOptions<"/api/headless/v1/courses/{course_id}/sections", "get">,
      ) =>
        request.get("/api/headless/v1/courses/{course_id}/sections", {
          ...options,
          path: { course_id: courseId },
        }),
    },
    lessons: {
      /**
       * Get a course lesson.
       * @param courseId Course ID.
       * @param id Lesson ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Lesson response.
       */
      get: (
        courseId: number,
        id: number,
        options?: RequestOptions<"/api/headless/v1/courses/{course_id}/lessons/{id}", "get">,
      ) =>
        request.get("/api/headless/v1/courses/{course_id}/lessons/{id}", {
          ...options,
          path: { course_id: courseId, id },
        }),
      /**
       * List files for a lesson.
       * @param courseId Course ID.
       * @param lessonId Lesson ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Lesson files response.
       */
      files: (
        courseId: number,
        lessonId: number,
        options?: RequestOptions<
          "/api/headless/v1/courses/{course_id}/lessons/{lesson_id}/files",
          "get"
        >,
      ) =>
        request.get("/api/headless/v1/courses/{course_id}/lessons/{lesson_id}/files", {
          ...options,
          path: { course_id: courseId, lesson_id: lessonId },
        }),
      /**
       * Update lesson progress.
       * @param courseId Course ID.
       * @param lessonId Lesson ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Progress update response.
       */
      updateProgress: (
        courseId: number,
        lessonId: number,
        options: RequestOptionsWithBody<
          "/api/headless/v1/courses/{course_id}/lessons/{lesson_id}/progress",
          "patch"
        >,
      ) =>
        request.patch("/api/headless/v1/courses/{course_id}/lessons/{lesson_id}/progress", {
          ...options,
          path: { course_id: courseId, lesson_id: lessonId },
        }),
    },
    topics: {
      /**
       * List course topics.
       * @param options Query params (flat) plus request metadata.
       * @returns Course topics response.
       */
      list: (options?: RequestOptions<"/api/headless/v1/course_topics", "get">) =>
        request.get("/api/headless/v1/course_topics", options),
    },
    quizAttempts: {
      /**
       * List quiz attempts for a course.
       * @param courseId Course ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Quiz attempt list response.
       */
      list: (
        courseId: number,
        options?: RequestOptions<"/api/headless/v1/courses/{course_id}/quiz_attempts", "get">,
      ) =>
        request.get("/api/headless/v1/courses/{course_id}/quiz_attempts", {
          ...options,
          path: { course_id: courseId },
        }),
    },
  };
}
