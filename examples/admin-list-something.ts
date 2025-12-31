import { createAdmin } from "circleso/admin";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

const communityHost = process.env.CIRCLE_COMMUNITY_HOST;

const admin = createAdmin({
  token: requireEnv("CIRCLE_ADMIN_TOKEN"),
  ...(communityHost ? { communityHost } : {}),
});

try {
  const data = await admin.accessGroups.list({ page: 1, per_page: 50 });

  for (const group of data?.records ?? []) {
    console.log(`${group.id} ${group.name}`);
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}
