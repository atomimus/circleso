import { createAuth } from "./auth";
import { type CircleResponse, createHeadless, createSessionCookiesUrl } from "./headless";

// Compile-only public contracts; never execute credential-backed requests.
export async function authCookieContracts() {
  const auth = createAuth({ token: "synthetic-application" });
  await auth.authToken.create({ email: "synthetic@example.test" });
  await auth.authToken.create({ community_member_id: 42 });
  await auth.authToken.create({ sso_user_id: "synthetic-sso" });
  // @ts-expect-error One selector is required by the generated schema.
  await auth.authToken.create({});
  // @ts-expect-error Member IDs are numbers.
  await auth.authToken.create({ community_member_id: "42" });
  // @ts-expect-error Refresh token belongs in JSON, not a query field.
  await auth.accessToken.refresh({ access_token: "synthetic" });
  await auth.accessToken.revoke({ access_token: "synthetic" });
  await auth.refreshToken.revoke({ refresh_token: "synthetic" });
  const member = createHeadless({ accessToken: "synthetic-member" });
  const result: CircleResponse<{ message?: string } | undefined> =
    await member.cookies.createWithResponse({ credentials: "include" });
  const deleted: typeof result = await member.cookies.deleteWithResponse({ credentials: "omit" });
  const legacy: typeof result.data = await member.cookies.create();
  const header: string[] = deleted.response.headers.getSetCookie();
  // @ts-expect-error This method parses JSON; use raw for parseAs.
  await member.cookies.createWithResponse({ parseAs: "stream" });
  // @ts-expect-error Credentials must use the Fetch enum.
  await member.cookies.deleteWithResponse({ credentials: "cookies" });
  // @ts-expect-error Cookie calls have no body schema.
  await member.cookies.createWithResponse({ access_token: "synthetic" });
  // @ts-expect-error URL helper requires a member access token.
  createSessionCookiesUrl({ communityUrl: "https://example.test" });
  const url: string = createSessionCookiesUrl({
    communityUrl: "https://example.test",
    accessToken: "synthetic",
  });
  return { legacy, header, url };
}
