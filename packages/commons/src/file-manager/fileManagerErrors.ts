import { InternalError, parseErrorMessage } from "pagopa-interop-tracing-models";

type FileManagerErrorCode =
  | "fileManagerWriteError"
  | "fileManagerBucketS3NameReadError"
  | "fileManagerBucketS3NameWriteError"
  | "fileManagerMissingTenantIdError"
  | "fileManagerMissingBodyError"
  | "fileManagerReadError";

export class FileManagerError extends InternalError<FileManagerErrorCode> {
  constructor({
    code,
    detail,
  }: {
    code: FileManagerErrorCode;
    detail: string;
  }) {
    super({ code, detail });
  }
}

export function fileManagerWriteError(
  detail: unknown,
): FileManagerError {
  return new FileManagerError({
    detail: `${detail}`,
    code: "fileManagerWriteError",
  });
}

export function fileManagerReadError(
  detail: unknown,
): FileManagerError {
  return new FileManagerError({
    detail: `${detail}`,
    code: "fileManagerReadError",
  });
}

export function fileManagerBucketS3NameReadError(
  detail: unknown,
): FileManagerError {
  return new FileManagerError({
    detail: `${detail}`,
    code: "fileManagerBucketS3NameReadError",
  });
}

export function fileManagerBucketS3NameWriteError(
  detail: unknown,
): FileManagerError {
  return new FileManagerError({
    detail: `${detail}`,
    code: "fileManagerBucketS3NameWriteError",
  });
}

export function fileManagerMissingTenantIdError(
  detail: unknown,
): FileManagerError {
  return new FileManagerError({
    detail: `${detail}`,
    code: "fileManagerMissingTenantIdError",
  });
}

export function fileManagerMissingBodyError(
  detail: unknown,
): FileManagerError {
  return new FileManagerError({
    detail: `${detail}`,
    code: "fileManagerMissingBodyError",
  });
}