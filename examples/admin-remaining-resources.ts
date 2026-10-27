import type { AdminApi } from "circleso/admin";

// Compile-only recipes. Configure the server client with retries: { retries: 0 }.
// Invoke writes only for an intended audience, settings or historical-message change.
export async function readRemainingResources(admin: AdminApi, roomId: number) {
  const notes = await admin.contactNotes.list("syntheticSqid", { page: 1 });
  const paymentMethods = await admin.paymentMethodPreferences.get();
  const tax = await admin.taxSettings.get();
  const connect = await admin.connectSettings.get();
  const rooms = await admin.liveRooms.list({ page: 1, per_page: 20 });
  const transcripts = await admin.liveRooms.transcripts(roomId);
  const locations = await admin.locations.search({ query: "Cairo" });
  return { notes, paymentMethods, tax, connect, rooms, transcripts, locations };
}

export async function changeAudienceAndSettings(admin: AdminApi, leadId: number) {
  const lead = await admin.communityLeads.create({ email: "synthetic@example.test" });
  await admin.communityLeads.delete(leadId);
  await admin.taxSettings.update({ tax_setting: { platform_status: "disabled" } });
  await admin.connectSettings.update({ messaging: { group_messaging_enabled: false } });
  return lead;
}

export async function writeRichText(admin: AdminApi, contactId: string, chatRoomUuid: string) {
  // These are the forms in Circle's official TipTap and import documentation.
  const document = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Synthetic history" }] }],
  };
  // Upstream objects have no property schema and generate Record<string, never>.
  // Localized assertions preserve the generated API; they perform no validation.
  // Validate caller-supplied content before making equivalent assertions.
  type NoteBody = Parameters<AdminApi["contactNotes"]["create"]>[1]["tiptap_body"]["body"];
  type ImportBody = Parameters<AdminApi["chatRoomMessageImports"]["create"]>[0]["rich_text_body"];
  const note = await admin.contactNotes.create(contactId, {
    tiptap_body: { body: document as unknown as NoteBody },
  });
  const imported: unknown = await admin.chatRoomMessageImports.create({
    chat_room_uuid: chatRoomUuid,
    user_email: "synthetic@example.test",
    rich_text_body: { body: document } as unknown as ImportBody,
    sent_at: "2024-01-01T12:00:00Z",
    parent_message_id: null,
  });
  return { note, imported }; // No import response fields are assumed.
}
