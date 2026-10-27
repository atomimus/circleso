import { CircleConfigError, createAdmin, createAuth, createHeadless } from "circleso";

globalThis.guard = () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    throw new Error("Unexpected synthetic network call");
  };
  const factories = [
    () => createAdmin({ token: "synthetic", fetcher }),
    () => createAuth({ token: "synthetic", fetcher }),
    () => createHeadless({ accessToken: "synthetic", authToken: "synthetic", fetcher }),
    () =>
      createHeadless({
        accessToken: "synthetic",
        refreshToken: "synthetic",
        authToken: "synthetic",
        autoRefresh: true,
        fetcher,
      }),
  ];
  return {
    rejected: factories.map((factory) => {
      try {
        factory();
        return false;
      } catch (error) {
        return error instanceof CircleConfigError && /server/i.test(error.message);
      }
    }),
    calls,
  };
};
