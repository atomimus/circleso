import { CircleConfigError, CircleNetworkError } from "../core/errors";
import {
  type PaginationLimits,
  paginateByIdWindow,
  paginateSearchAfter,
  paginationRequestOptions,
  type SearchAfterCursor,
  toAsyncIterator,
} from "../core/pagination";
import { createHeadlessOffsetIterators } from "./iterators";
import type { HeadlessRequester } from "./request";
import type { RequestOptions } from "./types";

export type ChatRoomMessagesIteratorOptions = PaginationLimits & {
  direction?: "previous" | "next";
  id?: number;
  perPage?: number;
};
type MemberOptions = Omit<RequestOptions<"/api/headless/v1/community_members", "get">, "page"> &
  PaginationLimits;
type SearchOptions = Omit<
  RequestOptions<"/api/headless/v1/search/community_members", "post">,
  "page"
> &
  PaginationLimits;

export function createHeadlessIterators(request: HeadlessRequester) {
  return {
    ...createHeadlessOffsetIterators(request),
    /** Member directory cursor scan. Tuples retain numeric/string values and order. */
    communityMembers: (options: MemberOptions = {}) => {
      const snapshot = { ...paginationRequestOptions(options) };
      return toAsyncIterator(
        paginateSearchAfter({
          ...options,
          ...(snapshot.per_page !== undefined ? { perPage: snapshot.per_page } : {}),
          ...(snapshot.search_after !== undefined ? { searchAfter: snapshot.search_after } : {}),
          fetchPage: ({ searchAfter, perPage, ...meta }) =>
            request.get("/api/headless/v1/community_members", {
              ...paginationRequestOptions(snapshot),
              ...meta,
              per_page: perPage,
              ...(searchAfter !== undefined ? { search_after: [...searchAfter] } : {}),
            }),
        }),
        { ...(options.signal !== undefined ? { signal: options.signal } : {}) },
      );
    },
    /** POST search preserves filters. A numeric next cursor exposes an upstream schema conflict. */
    communityMemberSearch: (options: SearchOptions) => {
      paginationRequestOptions(options);
      if (options.filters !== undefined && !Array.isArray(options.filters))
        throw new CircleConfigError("Search filters must be an array.");
      const snapshot = {
        ...paginationRequestOptions(options),
        ...(options.filters !== undefined
          ? { filters: options.filters.map((filter) => ({ ...filter })) }
          : {}),
      };
      return toAsyncIterator(
        paginateSearchAfter({
          ...options,
          ...(snapshot.per_page !== undefined ? { perPage: snapshot.per_page } : {}),
          ...(snapshot.search_after !== undefined ? { searchAfter: snapshot.search_after } : {}),
          fetchPage: ({ searchAfter, perPage, ...meta }) =>
            request.post("/api/headless/v1/search/community_members", {
              ...paginationRequestOptions(snapshot),
              ...meta,
              per_page: perPage,
              ...(searchAfter !== undefined ? { search_after: stringCursor(searchAfter) } : {}),
            }),
        }),
        { ...(options.signal !== undefined ? { signal: options.signal } : {}) },
      );
    },
    /** Chat history in server order, advancing first_id for previous and last_id for next. */
    chatRoomMessages: (chatRoomUuid: string, options: ChatRoomMessagesIteratorOptions = {}) =>
      toAsyncIterator(
        paginateByIdWindow({
          ...options,
          fetchPage: ({ id, previousPerPage, nextPerPage, ...meta }) =>
            request.get("/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages", {
              ...meta,
              path: { chat_room_uuid: chatRoomUuid },
              ...(id !== undefined ? { id } : {}),
              ...(previousPerPage !== undefined ? { previous_per_page: previousPerPage } : {}),
              ...(nextPerPage !== undefined ? { next_per_page: nextPerPage } : {}),
            }),
        }),
        { ...(options.signal !== undefined ? { signal: options.signal } : {}) },
      ),
  };
}

export type HeadlessIterators = ReturnType<typeof createHeadlessIterators>;

function stringCursor(cursor: SearchAfterCursor): string[] {
  if (!cursor.every((value): value is string => typeof value === "string")) {
    throw new CircleNetworkError(
      "POST community member search returned a numeric cursor, but its request schema only accepts strings. Use paginateSearchAfter with an explicit caller adapter if Circle confirms numeric request support; no cursor was coerced or request sent.",
      undefined,
      { method: "POST", url: "/api/headless/v1/search/community_members" },
    );
  }
  return [...cursor];
}
