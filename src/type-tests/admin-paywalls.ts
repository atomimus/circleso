// Compile only; never invoke mutations against a community.
import type { AdminApi } from "../admin";
import type { CircleSo } from "../index";

export function paywalls(admin: AdminApi, sdk: CircleSo) {
  sdk.admin.paywalls.search();
  admin.paywalls.search({ status: "draft,active", paywall_id: "1,2", sort: "title" });
  admin.paywalls.delete(1);
  admin.paywalls.archive(1);
  admin.paywalls.publish(1);
  admin.paywalls.unarchive(1);
  admin.paywalls.syncMemberAccess(1);
  admin.paywallGroups.create({ name: "Synthetic group", currency_id: 1 });
  admin.paywallGroups.update(2, {});
  admin.paywallCoupons.delete(3);
  admin.paywallAffiliates.list({ filters: { status: "inactive", campaign_id: 4 } });
  admin.paywallAffiliates.invite({ existing_member_ids: [5] });
  admin.paywallAffiliates.update(6, { status: "disabled" });
  // The schema requires an update body but does not require the status property.
  admin.paywallAffiliates.update(6, {});
  admin.paywallAffiliatePayouts.start();
  admin.paywallAffiliatePayouts.markPaid({ community_member_ids: [5] });
  admin.paywallAffiliatePayouts.export({ community_member_ids: [5] });
  // @ts-expect-error numeric Circle ID is required
  admin.paywalls.delete("paywall");
  // @ts-expect-error paywall ID is required
  admin.paywalls.syncMemberAccess();
  // @ts-expect-error search filters are comma-separated strings
  admin.paywalls.search({ paywall_id: [1, 2] });
  // @ts-expect-error create options are required
  admin.paywallGroups.create();
  // @ts-expect-error currency_id is required for creation
  admin.paywallGroups.create({ name: "Synthetic group" });
  // @ts-expect-error name is required for creation
  admin.paywallGroups.create({ currency_id: 1 });
  // @ts-expect-error update requires a body even when empty
  admin.paywallGroups.update(2);
  // @ts-expect-error there is no group membership replacement field
  admin.paywallGroups.update(2, { paywall_ids: [1] });
  // @ts-expect-error no currency code alias for the numeric ID
  admin.paywallGroups.update(2, { currency_id: "usd" });
  // @ts-expect-error numeric coupon ID is required
  admin.paywallCoupons.delete("coupon");
  // @ts-expect-error affiliate filters must remain nested
  admin.paywallAffiliates.list({ status: "enrolled" });
  // @ts-expect-error inactive is a list status, not an update transition
  admin.paywallAffiliates.update(6, { status: "inactive" });
  // @ts-expect-error an update body is required
  admin.paywallAffiliates.update(6);
  // @ts-expect-error invite options are required
  admin.paywallAffiliates.invite();
  // @ts-expect-error member IDs are required
  admin.paywallAffiliates.invite({});
  // @ts-expect-error invitations take numeric existing member IDs
  admin.paywallAffiliates.invite({ existing_member_ids: ["member"] });
  // @ts-expect-error exact optional fields reject undefined
  admin.paywallAffiliatePayouts.start({ community_member_ids: undefined });
  // @ts-expect-error scope is a numeric array, not comma-separated query filters
  admin.paywallAffiliatePayouts.markPaid({ community_member_ids: "1,2" });
  // @ts-expect-error no undocumented CSV fields filter
  admin.paywallAffiliatePayouts.export({ fields: "amount" });
  // @ts-expect-error request arrays are not nullable
  admin.paywallAffiliatePayouts.export({ community_member_ids: null });
}
