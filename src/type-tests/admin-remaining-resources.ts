// Compile only; no customer data, settings, leads or messages are changed.
import type { AdminApi } from "../admin";
import type { CircleSo } from "../index";

export async function adminRemainingContracts(admin: AdminApi, sdk: CircleSo) {
  sdk.admin.liveRooms.list();
  const lead = await admin.communityLeads.create({
    email: "synthetic@example.test",
    member_tag_ids: [],
  });
  await admin.communityLeads.delete(12);
  await admin.contactNotes.list("syntheticSqid", { page: 2 });
  await admin.contactNotes.create("12", { tiptap_body: { body: {} } });
  const preferences = await admin.paymentMethodPreferences.get();
  const tax = await admin.taxSettings.get();
  await admin.taxSettings.update();
  await admin.taxSettings.update({
    tax_setting: { platform_status: "disabled", default_tax_behavior: "inferred_by_currency" },
  });
  const connect = await admin.connectSettings.get();
  await admin.connectSettings.update();
  await admin.connectSettings.update({
    messaging: { enabled: false },
    member_directory: { public: false, sort: "alphabetical", view: "list" },
  });
  const rooms = await admin.liveRooms.list({ page: 1, per_page: 5 });
  const transcripts = await admin.liveRooms.transcripts(90);
  const locations = await admin.locations.search({ query: "Synthetic" });
  const imported = await admin.chatRoomMessageImports.create({
    chat_room_uuid: "synthetic-room",
    user_email: "synthetic@example.test",
    rich_text_body: {},
    sent_at: "2024-01-01T12:00:00Z",
    parent_message_id: null,
  });
  const email: string | null | undefined = lead?.email;
  const state: "pending_verification" | "active" | "disabled" | "unavailable" | undefined =
    preferences?.[0]?.normalized_state;
  const behavior: string | null | undefined = tax?.default_tax_behavior;
  const sort: "alphabetical" | "oldest" | "latest" | null | undefined =
    connect?.member_directory.sort;
  const liveAt: string | null | undefined = rooms?.records?.[0]?.live_at;
  const vtt: string[] | undefined = transcripts?.transcripts;
  const sourceId: string | null | undefined = locations?.results?.[0]?.source_id;
  void [email, state, behavior, sort, liveAt, vtt, sourceId, imported];
  // @ts-expect-error lead options are required
  admin.communityLeads.create();
  // @ts-expect-error lead email is required
  admin.communityLeads.create({ name: "Synthetic" });
  // @ts-expect-error lead IDs are numeric, unlike note contact IDs
  admin.communityLeads.delete("12");
  // @ts-expect-error contact identifier is required
  admin.contactNotes.list();
  // @ts-expect-error contact IDs are strings (ID or sqid)
  admin.contactNotes.list(12);
  // @ts-expect-error note body is required
  admin.contactNotes.create("12");
  // @ts-expect-error nested note body is required
  admin.contactNotes.create("12", { tiptap_body: {} });
  // @ts-expect-error only page is specified for notes, not per_page
  admin.contactNotes.list("12", { per_page: 5 });
  // @ts-expect-error tax fields must stay nested
  admin.taxSettings.update({ platform_status: "enabled" });
  // @ts-expect-error tax status is an enum
  admin.taxSettings.update({ tax_setting: { platform_status: "active" } });
  // @ts-expect-error behavior is an enum on input, although the response allows other strings
  admin.taxSettings.update({ tax_setting: { default_tax_behavior: "automatic" } });
  // @ts-expect-error nullable response does not imply nullable input
  admin.taxSettings.update({ tax_setting: { default_tax_behavior: null } });
  // @ts-expect-error settings booleans are not strings
  admin.connectSettings.update({ connect: { enabled: "false" } });
  // @ts-expect-error directory sort remains an enum
  admin.connectSettings.update({ member_directory: { sort: "newest" } });
  // @ts-expect-error null is not a valid directory view input
  admin.connectSettings.update({ member_directory: { view: null } });
  // @ts-expect-error live room ID is required
  admin.liveRooms.transcripts();
  // @ts-expect-error live rooms use numeric IDs
  admin.liveRooms.transcripts("90");
  // @ts-expect-error query is required
  admin.locations.search();
  // @ts-expect-error empty options still lack required query
  admin.locations.search({});
  // @ts-expect-error import body is required
  admin.chatRoomMessageImports.create();
  // @ts-expect-error all four import fields must be present
  admin.chatRoomMessageImports.create({
    chat_room_uuid: "synthetic-room",
    user_email: "synthetic@example.test",
    rich_text_body: {},
  });
  // @ts-expect-error rich_text_body is required
  admin.chatRoomMessageImports.create({
    chat_room_uuid: "synthetic-room",
    user_email: "synthetic@example.test",
    sent_at: "2024-01-01T12:00:00Z",
  });
  // @ts-expect-error user_email is required
  admin.chatRoomMessageImports.create({
    chat_room_uuid: "synthetic-room",
    rich_text_body: {},
    sent_at: "2024-01-01T12:00:00Z",
  });
  // @ts-expect-error chat_room_uuid is required
  admin.chatRoomMessageImports.create({
    user_email: "synthetic@example.test",
    rich_text_body: {},
    sent_at: "2024-01-01T12:00:00Z",
  });
  // @ts-expect-error import response must remain unknown, not a guessed message
  imported.id;
  // @ts-expect-error unknown must not become any
  const message: string = imported;
  // @ts-expect-error payment response is an array, not a list envelope
  preferences?.records;
  if (connect) {
    // @ts-expect-error nullable field stays nullable
    const nonNullSort: string = connect.member_directory.sort;
    void nonNullSort;
  }
  // @ts-expect-error normalized state remains an enum
  const wrongState: "pending" = preferences?.[0]?.normalized_state;
  // @ts-expect-error exact optional properties reject explicit undefined
  admin.taxSettings.update({ tax_setting: undefined });
  void [message, wrongState];
}
