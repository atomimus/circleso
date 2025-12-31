import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCoursesResource(request: HeadlessRequester) {
  return {
    sections: {
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
      get: (
        courseId: number,
        id: number,
        options?: RequestOptions<"/api/headless/v1/courses/{course_id}/lessons/{id}", "get">,
      ) =>
        request.get("/api/headless/v1/courses/{course_id}/lessons/{id}", {
          ...options,
          path: { course_id: courseId, id },
        }),
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
      list: (options?: RequestOptions<"/api/headless/v1/course_topics", "get">) =>
        request.get("/api/headless/v1/course_topics", options),
    },
    quizAttempts: {
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
