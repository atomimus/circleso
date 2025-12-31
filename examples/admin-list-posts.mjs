import { createAdmin } from "circleso/admin";

const token = "PASTE_ADMIN_TOKEN_HERE";
const spaceId = 123;

const perPage = 50;

const admin = createAdmin({
  token,
});

async function run() {
  let page = 1;
  let total = 0;
  const allPosts = [];

  while (true) {
    const data = await admin.posts.list({
      space_id: spaceId,
      page,
      per_page: perPage,
    });

    const records = Array.isArray(data?.records) ? data.records : [];
    allPosts.push(...records);
    total += records.length;

    if (!data?.has_next_page || records.length === 0) {
      break;
    }

    page += 1;
  }

  console.log(`Fetched ${total} posts for space ${spaceId}`);
  for (const post of allPosts) {
    console.log(`${post.id} ${post.status} ${post.name}`);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
