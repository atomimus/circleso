import type { SpecEntry } from "./spec-tools";

export const fixtureSpec: SpecEntry = {
  name: "fixture",
  url: "https://api-headless.circle.so/fixture.yaml",
  title: "Fixture API",
  version: "v1",
  pathPrefix: "/api/fixture",
  module: "fixtureApi",
};
export const fixtureSource = `openapi: 3.0.1
info: {title: Fixture API, version: v1}
paths:
  /api/fixture/items:
    get:
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: {type: string}
`;
