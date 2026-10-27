import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createContactNotesResource(request: AdminRequester) {
  return {
    /** List internal notes, newest first, using a contact ID or sqid string. Only page is specified. */
    list: (
      contactId: string,
      options?: RequestOptions<"/api/admin/v2/contacts/{contact_id}/contact_notes", "get">,
    ) =>
      request.get("/api/admin/v2/contacts/{contact_id}/contact_notes", {
        ...options,
        path: { contact_id: contactId },
      }),
    /** Add an internal note. Circle requires tiptap_body.body but does not describe its properties. */
    create: (
      contactId: string,
      options: RequestOptionsWithBody<"/api/admin/v2/contacts/{contact_id}/contact_notes", "post">,
    ) =>
      request.post("/api/admin/v2/contacts/{contact_id}/contact_notes", {
        ...options,
        path: { contact_id: contactId },
      }),
  };
}
