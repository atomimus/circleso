import type { AdminApi } from "circleso/admin";
import type { HeadlessApi } from "circleso/headless";

// Compile only. Each exported function is a separate recipe, never run by validation.
// Pass a server Admin client with retries: { retries: 0 } for deliberate mutations.
export async function inspectWorkflows(admin: AdminApi, workflowId: string) {
  const summaries = await admin.workflows.list({ status: "all", workflow_type: "dynamic" });
  const detail = await admin.workflows.get(workflowId);
  return { summaries, detail };
}

export function activateAutomation(admin: AdminApi, workflowId: string) {
  return admin.workflows.activate(workflowId); // Takes effect immediately if eligible.
}

export function deactivateAutomation(admin: AdminApi, workflowId: string) {
  return admin.workflows.deactivate(workflowId); // Only active dynamic workflows.
}

export function copyWorkflow(admin: AdminApi, workflowId: string) {
  return admin.workflows.duplicate(workflowId); // Draft copy; triggers no workflow run.
}

export async function configureDirectory(admin: AdminApi) {
  const saved = await admin.filterKit.controls.create({
    key: "profile_field",
    profile_field_id: 34,
    enabled: true,
    sort_key: 0,
  });
  const resolved = await admin.filterKit.configuration({ context: "members" });
  return { saved, resolved }; // Saved customizations and resolved runtime filters differ.
}

export async function inspectSpaceFilters(admin: AdminApi, spaceId: number) {
  const controls = await admin.filterKit.controls.list({ space_id: spaceId, enabled: false });
  const resolved = await admin.filterKit.configuration({
    context: "member_space",
    space_id: spaceId,
  });
  for (const filter of resolved?.filter_configurations ?? []) {
    if (filter.input_type === "array") {
      const options = filter.payload.options; // string | number option values
      const extra: unknown = filter.payload.additional_params?.future_field;
      void [options, extra];
    }
  }
  return { controls, resolved };
}

export async function hideControl(admin: AdminApi, controlId: number) {
  await admin.filterKit.controls.update(controlId, { enabled: false });
  return admin.filterKit.controls.get(controlId);
}

export function removeCustomization(admin: AdminApi, controlId: number) {
  return admin.filterKit.controls.delete(controlId); // Re-read configuration for visibility.
}

export function searchMembers(member: HeadlessApi) {
  // Predicates select members for this search. They do not save a directory control.
  return member.communityMembers.search({
    filters: [{ key: "name", filter_type: "contains", value: "Synthetic" }],
    per_page: 20,
  });
}
