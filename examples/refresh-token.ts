import { createAuth } from "circleso/auth";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

const refreshToken = requireEnv("CIRCLE_HEADLESS_REFRESH_TOKEN");

const auth = createAuth({
  token: refreshToken,
});

try {
  const data = await auth.accessToken.refresh({
    body: { refresh_token: refreshToken },
  });

  console.log(JSON.stringify(data, null, 2));
} catch (error) {
  console.error(error);
  process.exit(1);
}
