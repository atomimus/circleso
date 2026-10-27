# CircleSo v1 research sources

Use official documentation and inspect the exact installed package versions when each task starts. These links are starting points, not a substitute for checking the relevant operation or current release requirements.

## Circle contracts

- [Documentation index](https://api.circle.so/llms.txt)
- [Admin V2 spec](https://api-headless.circle.so/api/admin/v2/swagger.yaml)
- [Member V1 spec](https://api-headless.circle.so/api/headless_client/v1/swagger.yaml)
- [Headless Auth spec](https://api-headless.circle.so/api/headless_auth/swagger.yaml)
- [Admin overview](https://api.circle.so/apis/admin-api)
- [Admin quick start](https://api.circle.so/apis/admin-api/quick-start)
- [Headless overview](https://api.circle.so/apis/headless)
- [Auth quick start](https://api.circle.so/apis/headless/quick-start)
- [Member search and cursors](https://api.circle.so/apis/headless/member-api/community-member-search)
- [Cookies](https://api.circle.so/apis/headless/member-api/cookies)
- [File uploads](https://api.circle.so/get-started/concepts/file-uploads)
- [Rich text](https://api.circle.so/get-started/concepts/rich-text-body)
- [TipTap format](https://api.circle.so/get-started/concepts/tiptap-editor)
- [Usage and limits](https://api.circle.so/apis/admin-api/usage-and-limits)
- [Usage optimization](https://api.circle.so/apis/admin-api/usage-and-limits/optimizing-usage)

## Runtime and tooling

- [Fetch standard](https://fetch.spec.whatwg.org/)
- [Streams standard](https://streams.spec.whatwg.org/)
- [Node package exports](https://nodejs.org/api/packages.html)
- [Node support schedule](https://nodejs.org/en/about/previous-releases)
- [TypeScript module reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- [openapi-fetch documentation](https://openapi-ts.dev/openapi-fetch/)
- [openapi-typescript documentation](https://openapi-ts.dev/)
- [Vitest](https://vitest.dev/guide/)
- [Playwright](https://playwright.dev/docs/intro)

As of the planning date, Node's official release page lists Node 18 and 20 as EOL and Node 22 and 24 as LTS. Task 01 records a deliberate v1 support policy; later tasks recheck the schedule before fixing CI versions.

## GitHub and npm release practices

- [Secure GitHub Actions use](https://docs.github.com/en/actions/reference/security/secure-use)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements/)
- [npm pack](https://docs.npmjs.com/cli/commands/npm-pack)
- [npm publish](https://docs.npmjs.com/cli/commands/npm-publish)
- [npm dist-tags](https://docs.npmjs.com/adding-dist-tags-to-packages)
- [Semantic versioning](https://docs.npmjs.com/about-semantic-versioning)

At planning time npm's trusted-publishing page requires npm CLI 11.5.1+ and Node 22.14.0+ and describes automatic provenance for trusted publishing. Task 24 must re-verify requirements, supported runners, package permissions and dist-tag behavior before authoring the actual workflow. Provenance establishes a source/build relationship; it does not establish that code has no defects.

## Chat launch behavior

- [Projects and chats](https://learn.chatgpt.com/docs/projects)

The app's available create_thread tool starts a chat asynchronously. Editing this plan does not call it. A direct user launch or the authorized handoff after verified full completion creates and opens a single project chat. Its initial prompt includes the full saved task, workflow and relevant completion evidence, and the new chat checks its dependencies before implementation.
