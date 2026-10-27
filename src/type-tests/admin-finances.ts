// Compile only; never invoke financial operations against a community.
import type { AdminApi } from "../admin";

export function finances(admin: AdminApi) {
  admin.communityMemberCharges.list();
  admin.communityMemberCharges.export({ fields: "processor_id,amount", amount_gte: 0 });
  admin.communityMemberCharges.refund(1, { reason_details: "Synthetic refund" });
  admin.communityMemberSubscriptions.list({ scheduled_to_cancel: false });
  admin.communityMemberSubscriptions.export();
  admin.communityMemberSubscriptions.cancel(2, { ends_at: "now", refund_type: "full" });
  admin.communityMemberSubscriptions.resume(2);
  admin.communityMemberSubscriptions.changeBillingDate(2, {
    operation: "change_billing_date",
    billing_date: "2026-11-15",
  });
  admin.communityMemberSubscriptions.changeBillingDate(2, {
    operation: "extend_trial",
    days_to_extend: 7,
  });
  // @ts-expect-error numeric charge ID is required
  admin.communityMemberCharges.refund("charge", { reason_details: "Synthetic" });
  // @ts-expect-error refund options are required
  admin.communityMemberCharges.refund(1);
  // @ts-expect-error refund reason is required
  admin.communityMemberCharges.refund(1, { amount: 100 });
  // @ts-expect-error request amounts are not nullable
  admin.communityMemberCharges.refund(1, { reason_details: "Synthetic", amount: null });
  // @ts-expect-error charge sorting follows the schema enum
  admin.communityMemberCharges.list({ sort: "not-a-field" });
  // @ts-expect-error schema expects comma-separated strings
  admin.communityMemberCharges.export({ fields: ["amount"] });
  // @ts-expect-error cancellation options are required
  admin.communityMemberSubscriptions.cancel(2);
  // @ts-expect-error cancellation timing is required
  admin.communityMemberSubscriptions.cancel(2, {});
  // @ts-expect-error subscription ID is required
  admin.communityMemberSubscriptions.resume();
  // @ts-expect-error billing operation/options are required
  admin.communityMemberSubscriptions.changeBillingDate(2);
  // @ts-expect-error billing operation is required
  admin.communityMemberSubscriptions.changeBillingDate(2, { billing_date: "2026-11-15" });
  // @ts-expect-error operation is an enum
  admin.communityMemberSubscriptions.changeBillingDate(2, { operation: "refund" });
  admin.communityMemberSubscriptions.changeBillingDate(2, {
    operation: "extend_trial",
    // @ts-expect-error extension days are numeric
    days_to_extend: "7",
  });
  // @ts-expect-error exact optional input remains checked
  admin.communityMemberSubscriptions.changeBillingDate(2, {
    operation: "extend_trial",
    days_to_extend: undefined,
  });
  // @ts-expect-error scheduled_to_cancel is boolean
  admin.communityMemberSubscriptions.export({ scheduled_to_cancel: "false" });
}
