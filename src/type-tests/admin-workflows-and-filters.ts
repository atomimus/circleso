// Compile only; never invoke automation or directory mutations against a community.
import type { AdminApi } from "../admin";
import type { CircleSo } from "../index";

export async function workflowsAndFilters(admin: AdminApi, sdk: CircleSo) {
  const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  sdk.admin.workflows.list();
  admin.workflows.list({ query: "Synthetic", status: "archived", workflow_type: "bulk_action" });
  admin.workflows.get(id);
  admin.workflows.activate(id);
  admin.workflows.deactivate(id);
  admin.workflows.duplicate(id);
  admin.filterKit.controls.list();
  admin.filterKit.controls.create({ key: "online", enabled: false });
  admin.filterKit.controls.get(1);
  admin.filterKit.controls.update(1);
  admin.filterKit.controls.update(1, { enabled: false, sort_key: 0 });
  admin.filterKit.controls.delete(1);
  admin.filterKit.configuration({ context: "member_space", space_id: 2 });
  const response = await admin.filterKit.configuration({ context: "members" });
  type Configuration = NonNullable<typeof response>["filter_configurations"][number];
  type ArrayConfiguration = Extract<Configuration, { input_type: "array" }>;
  const preset: Extract<Configuration, { input_type: "preset" }>["payload"] = {
    preset_params: { arbitrary: { nested: [1, false] } },
  };
  const array: ArrayConfiguration["payload"] = {
    options: [{ text: "Synthetic", value: 1 }],
    filter_types: ["is_not"],
    mode: "inline",
    additional_params: { arbitrary: null },
  };
  void [preset, array];
  for (const filter of response?.filter_configurations ?? []) {
    if (filter.input_type === "array") {
      const mode: "inline" | "popover" = filter.payload.mode;
      const open: unknown = filter.payload.additional_params?.arbitrary;
      void [mode, open];
      // @ts-expect-error open data remains unknown, never any
      const unsafe: string = filter.payload.additional_params?.arbitrary;
      void unsafe;
    }
    if (filter.input_type === "boolean") {
      // @ts-expect-error boolean payload can be null
      const nonNull: object = filter.payload;
      void nonNull;
    }
  }
  // @ts-expect-error context is required
  admin.filterKit.configuration();
  // @ts-expect-error context enum must stay precise
  admin.filterKit.configuration({ context: "customize_members" });
  // @ts-expect-error numeric space ID required
  admin.filterKit.configuration({ context: "member_space", space_id: "2" });
  // @ts-expect-error workflow IDs are UUID strings
  admin.workflows.activate(1);
  // @ts-expect-error workflow ID required
  admin.workflows.duplicate();
  // @ts-expect-error workflow statuses are enumerated
  admin.workflows.list({ status: "enabled" });
  // @ts-expect-error workflow type is the API value, not its label
  admin.workflows.list({ workflow_type: "Automation" });
  // @ts-expect-error duplicate has no rename body or query
  admin.workflows.duplicate(id, { name: "Renamed" });
  // @ts-expect-error control IDs remain numeric
  admin.filterKit.controls.get("1");
  // @ts-expect-error create body required
  admin.filterKit.controls.create();
  // @ts-expect-error key required
  admin.filterKit.controls.create({ enabled: true });
  // @ts-expect-error enabled required, including when false
  admin.filterKit.controls.create({ key: "online" });
  // @ts-expect-error filter operators are not control keys
  admin.filterKit.controls.create({ key: "contains", enabled: true });
  // @ts-expect-error no bulk replacement list on this endpoint
  admin.filterKit.controls.update(1, { filters: [] });
  // @ts-expect-error input does not allow null to move back to directory
  admin.filterKit.controls.update(1, { space_id: null });
  // @ts-expect-error boolean fields remain boolean
  admin.filterKit.controls.list({ enabled: "false" });
  // @ts-expect-error exact optional inputs reject undefined
  admin.filterKit.controls.update(1, { enabled: undefined });
  // @ts-expect-error array configuration must include options and mode
  const missingArray: ArrayConfiguration["payload"] = { filter_types: ["is"] };
  const wrongOperator: ArrayConfiguration["payload"] = {
    options: [],
    // @ts-expect-error filter operators depend on the discriminator
    filter_types: ["contains"],
    mode: "inline",
  };
  // @ts-expect-error base metadata and payload remain required
  const missingBase: Configuration = { input_type: "boolean", payload: null };
  // @ts-expect-error nullable boolean payload is nevertheless required
  const missingBoolean: Extract<Configuration, { input_type: "boolean" }> = {
    type: "standard",
    key: "online",
    label: "Online",
    icon: null,
    allow_multiple: false,
    pinned: false,
    visible_by_default: true,
    filter_group: "profile",
    input_type: "boolean",
  };
  // @ts-expect-error near-me fields remain required even when their values can be null
  const missingNearMe: Extract<Configuration, { input_type: "near_me" }>["payload"] = {
    location_search_options: { key: "location", source: "mapbox_v6" },
  };
  const wrongLocation: Extract<Configuration, { input_type: "location" }>["payload"] = {
    // @ts-expect-error location source stays the documented literal
    location_search_options: { key: "location", source: "invented" },
  };
  const wrongDays: Extract<Configuration, { input_type: "days_ago" }>["payload"] = {
    // @ts-expect-error days-ago operators differ from array operators
    filter_types: ["is"],
  };
  void [
    missingArray,
    wrongOperator,
    missingBase,
    missingBoolean,
    missingNearMe,
    wrongLocation,
    wrongDays,
  ];
}
