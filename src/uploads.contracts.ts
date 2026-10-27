import type { AdminApi } from "./admin";
import type { HeadlessApi, HeadlessDirectUploadOptions } from "./headless";
import type { DirectUploadInput, DirectUploadOptions, DirectUploadResult } from "./index";

// Compile only: verify both facade contracts independently of runtime fixtures.
export async function uploadContracts(admin: AdminApi, member: HeadlessApi) {
  const input: DirectUploadInput = new Uint8Array([1, 2, 3]);
  const options: DirectUploadOptions = {
    key: "",
    filename: "synthetic.bin",
    signal: new AbortController().signal,
  };
  const memberOptions: HeadlessDirectUploadOptions = { ...options, metadata: { identified: true } };
  const adminResult: DirectUploadResult = await admin.directUploads.upload(input, options);
  const memberResult: DirectUploadResult = await member.directUploads.upload(
    new Blob(),
    memberOptions,
  );
  const signed: string = adminResult.signed_id;
  const attachable: string = memberResult.attachable_sgid;
  void [signed, attachable];
  // @ts-expect-error key remains an explicit required Circle input
  member.directUploads.upload(input, { filename: "synthetic.bin" });
  // @ts-expect-error upload options cannot be omitted
  admin.directUploads.upload(input);
  // @ts-expect-error no undocumented Admin metadata
  admin.directUploads.upload(input, { ...options, metadata: { identified: true } });
  // @ts-expect-error identified is required when Member metadata is supplied
  member.directUploads.upload(input, { ...options, metadata: {} });
  // @ts-expect-error streams are deliberately unsupported even with checksum
  member.directUploads.upload(new ReadableStream(), {
    ...options,
    checksum: "kAFQmDzST7DWlj99KOF/cg==",
  });
  // @ts-expect-error no arbitrary storage headers/credentials
  member.directUploads.upload(input, { ...options, headers: { authorization: "synthetic" } });
  // @ts-expect-error storage URL is not exposed by the workflow result
  adminResult.direct_upload.url;
}
