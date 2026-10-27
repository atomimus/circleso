import { createAdmin } from "../admin";
import { createAuth } from "../auth";
import { createHeadless } from "../headless";
import { CircleSo } from "../index";

// Compile-only public configuration contracts; never executed.
export function configurations(fetcher: typeof fetch): void {
  createAdmin({
    token: "admin",
    baseUrl: "https://app.circle.so",
    communityHost: "community.example.test",
    fetcher,
  });
  createAuth({ token: "application", fetcher });
  createHeadless({
    getAccessToken: async () => "member",
    setAccessToken: async (_token) => {},
    fetcher,
  });
  new CircleSo({
    admin: { token: "admin" },
    headless: { accessToken: "member" },
    auth: { token: "application" },
    fetcher,
  });
  // @ts-expect-error Admin still requires its credential
  createAdmin({ communityHost: "community.example.test" });
  // @ts-expect-error Auth still requires its application credential
  createAuth({});
  // @ts-expect-error token getters return strings or undefined
  createHeadless({ getAccessToken: () => 1 });
  // @ts-expect-error token setters receive strings or undefined
  createHeadless({ accessToken: "member", setAccessToken: (_token: number) => {} });
  // @ts-expect-error custom fetchers must implement Fetch
  createHeadless({ accessToken: "member", fetcher: {} });
}
