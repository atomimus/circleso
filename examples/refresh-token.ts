import { createAuth } from "circleso/auth";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

const refreshToken = requireEnv("CIRCLE_HEADLESS_REFRESH_TOKEN");
const authToken = requireEnv("CIRCLE_HEADLESS_AUTH_TOKEN");

const auth = createAuth({
  token: authToken,
});

try {
  const data = await auth.accessToken.refresh({
    refresh_token: refreshToken,
  });

  console.log(data?.access_token ? "Access token refreshed." : "No access token returned.");
} catch {
  console.error("Token refresh failed.");
  process.exit(1);
}
