export type LiveConfig = {
  baseUrl: string;
  token: string;
  communityId: number;
  spaceId: number;
  memberId: number;
  writes: boolean;
  postId?: number;
};

/** No ambient credentials, dotenv loading, production defaults or inferred authorization. */
export function liveConfig(env: NodeJS.ProcessEnv): LiveConfig | undefined {
  if (!env.CIRCLE_LIVE_TESTS) return undefined;
  if (env.CIRCLE_LIVE_TESTS !== "read-only") throw new Error("CIRCLE_LIVE_TESTS must be read-only");
  if (env.CIRCLE_TEST_COMMUNITY_ACK !== "dedicated-test-community")
    throw new Error("Dedicated test community acknowledgement required");
  const baseUrl = env.CIRCLE_TEST_BASE_URL;
  if (!baseUrl || !/^https:\/\/[^/?#\s\\@]+\/?$/.test(baseUrl))
    throw new Error("Explicit test HTTPS origin required");
  const origin = new URL(baseUrl);
  if (origin.username || origin.password || origin.origin === "https://app.circle.so")
    throw new Error("Use the dedicated community origin");
  const token = env.CIRCLE_TEST_MEMBER_TOKEN;
  if (!token || !/^[!-~]+$/.test(token)) throw new Error("Dedicated test member token required");
  const id = (name: string): number => {
    const value = env[name];
    if (!value || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
      throw new Error(`Positive ${name} required`);
    return Number(value);
  };
  const config: LiveConfig = {
    baseUrl: origin.origin,
    token,
    communityId: id("CIRCLE_TEST_COMMUNITY_ID"),
    spaceId: id("CIRCLE_TEST_SPACE_ID"),
    memberId: id("CIRCLE_TEST_MEMBER_ID"),
    writes: false,
  };
  if (env.CIRCLE_LIVE_WRITES) {
    if (
      env.CIRCLE_LIVE_WRITES !== "bookmark" ||
      env.CIRCLE_DISPOSABLE_ACCOUNT_ACK !== "authorized-disposable-account"
    )
      throw new Error("Explicit bookmark flag and authorized disposable account required");
    config.writes = true;
    config.postId = id("CIRCLE_TEST_POST_ID");
  }
  return config;
}

/** Exact origin/method/path allowlist. Ownership is supplied only after verified creation. */
export function allowLiveRequest(
  config: LiveConfig,
  request: Request,
  ownedBookmark?: number,
): boolean {
  const url = new URL(request.url);
  if (url.origin !== config.baseUrl || url.username || url.password) return false;
  const prefix = "/api/headless/v1";
  if (request.method === "GET") {
    if ([`${prefix}/community_member`, `${prefix}/spaces/${config.spaceId}`].includes(url.pathname))
      return !url.search;
    if (
      config.writes &&
      url.pathname === `${prefix}/spaces/${config.spaceId}/posts/${config.postId}`
    )
      return !url.search;
    return (
      config.writes && url.pathname === `${prefix}/bookmarks` && url.search === "?page=1&per_page=1"
    );
  }
  if (!config.writes || url.search) return false;
  return (
    (request.method === "POST" && url.pathname === `${prefix}/bookmarks`) ||
    (request.method === "DELETE" &&
      ownedBookmark !== undefined &&
      url.pathname === `${prefix}/bookmarks/${ownedBookmark}`)
  );
}
