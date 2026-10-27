import type { AdminApi } from "circleso/admin";

// Compile-only recipe: pass a server Admin client configured with retries: { retries: 0 }.
// IDs are illustrative. Invoke each operation only for an intended community change.
export async function paywallOperations(admin: AdminApi) {
  const paywalls = await admin.paywalls.search({ status: "draft,active", page: 1, per_page: 20 });
  const affiliates = await admin.paywallAffiliates.list({
    filters: { status: "enrolled", campaign_id: 1 },
  });
  const group = await admin.paywallGroups.create({ name: "Premium", currency_id: 1 });
  await admin.paywallGroups.update(2, { name: "Premium memberships" });
  await admin.paywalls.publish(3);
  await admin.paywalls.archive(3); // Permanently discards this paywall's kept upsell offers.
  await admin.paywalls.unarchive(3); // Discarded offers stay discarded.
  await admin.paywalls.delete(4); // Circle rejects paywalls with real transactions.
  const scheduled = await admin.paywalls.syncMemberAccess(5); // Legacy paywalls only.
  await admin.paywallCoupons.delete(6); // Also invalidates offers referencing the coupon.
  const invitations = await admin.paywallAffiliates.invite({ existing_member_ids: [7, 8] });
  await admin.paywallAffiliates.update(9, { status: "disabled" }); // Affiliate ID.
  const processing = await admin.paywallAffiliatePayouts.start({ community_member_ids: [7, 8] });
  const exported = await admin.paywallAffiliatePayouts.export({ community_member_ids: [7, 8] });
  const paid = await admin.paywallAffiliatePayouts.markPaid({ community_member_ids: [7, 8] });
  return { paywalls, affiliates, group, scheduled, invitations, processing, exported, paid };
}
