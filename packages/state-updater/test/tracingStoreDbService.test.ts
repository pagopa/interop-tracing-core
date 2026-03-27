import {
  describe,
  expect,
  it,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import {
  addTenant,
  addTracing,
  dbInstance,
  fileManager,
  findPurposeErrors,
  findTracingById,
  truncatePurposeErrors,
  startedMinioContainer,
  startedPostgreSqlContainer,
  tracingStoreService,
  writePurposeErrorsCsv,
} from "./utils.js";
import {
  TenantId,
  TracingId,
  generateId,
  tracingState,
} from "pagopa-interop-tracing-models";
import { DateUnit, truncatedTo } from "pagopa-interop-tracing-commons";
import { Readable } from "node:stream";

describe("Tracing store DB service test", () => {
  let s3Key: string;

  const tenantId: TenantId = generateId<TenantId>();
  const tracingId: TracingId = generateId<TracingId>();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayTruncated = truncatedTo(yesterday, DateUnit.DAYS);
  afterAll(async () => {
    await startedPostgreSqlContainer.stop();
    await startedMinioContainer.stop();
  });

  afterEach(async () => {
    await truncatePurposeErrors(dbInstance);
  });

  beforeAll(async () => {
    s3Key = fileManager.buildS3Key(
      generateId(),
      "2024-01-01",
      tracingId,
      1,
      generateId(),
    );

    await addTenant(dbInstance, {
      id: tenantId,
      name: "tenant",
      origin: "origin",
      external_id: tenantId,
      deleted: false,
    });

    await addTracing(dbInstance, {
      id: tracingId,
      tenant_id: tenantId,
      state: tracingState.pending,
      date: new Date(),
      version: 1,
      errors: false,
    });
  }, 120000);

  describe("copyPurposeErrorsFromS3", () => {
    it("should copy CSV from S3 and insert purpose errors", async () => {
      const expectedErrors = 10_000;
      await writePurposeErrorsCsv(
        tracingId,
        fileManager,
        s3Key,
        expectedErrors,
      );

      await expect(
        tracingStoreService.copyPurposeErrorsFromS3(s3Key),
      ).resolves.not.toThrow();

      const errors = await findPurposeErrors(dbInstance, tracingId);
      expect(errors.length).toBe(expectedErrors);
    }, 30000);

    it("should read object with key from errorsCsvPath", async () => {
      await writePurposeErrorsCsv(tracingId, fileManager, s3Key);
      const readSpy = vi.spyOn(fileManager, "readObject");

      await expect(
        tracingStoreService.copyPurposeErrorsFromS3(s3Key),
      ).resolves.not.toThrow();

      expect(readSpy).toHaveBeenCalledWith(s3Key);
      readSpy.mockRestore();
    });

    it("should throw an error when copy fails", async () => {
      const failingStream = new Readable({
        read() {
          this.destroy(new Error("copy failed"));
        },
      });
      const readSpy = vi
        .spyOn(fileManager, "readObject")
        .mockResolvedValueOnce(failingStream);

      await expect(
        tracingStoreService.copyPurposeErrorsFromS3(s3Key),
      ).rejects.toMatchObject({
        code: "errorProcessingCopyPurposeErrors",
        message: expect.stringContaining("Error copying purpose errors"),
      });

      readSpy.mockRestore();
    });
  });

  describe("updateTracingState", () => {
    it("should update a tracing by tracingId with new state 'COMPLETED' successfully", async () => {
      const newTracingId = generateId<TracingId>();
      await addTracing(dbInstance, {
        id: newTracingId,
        tenant_id: tenantId,
        state: tracingState.pending,
        date: yesterdayTruncated,
        version: 1,
        errors: false,
      });

      await expect(
        tracingStoreService.updateTracingState({
          tracingId: newTracingId,
          version: 1,
          state: tracingState.completed,
        }),
      ).resolves.not.toThrow();

      const result = await findTracingById(dbInstance, newTracingId);
      expect(result.id).toBe(newTracingId);
      expect(result.state).toBe(tracingState.completed);
    });

    it("should throw an error when attempting to update the state with a tracingId that is not found", async () => {
      const newTracingId = generateId<TracingId>();
      await addTracing(dbInstance, {
        id: newTracingId,
        tenant_id: tenantId,
        state: tracingState.pending,
        date: yesterdayTruncated,
        version: 1,
        errors: false,
      });

      await expect(
        tracingStoreService.updateTracingState({
          tracingId: generateId<TracingId>(),
          version: 1,
          state: tracingState.completed,
        }),
      ).rejects.toMatchObject({
        code: "errorProcessingUpdateTracingState",
        message: expect.stringContaining("queryResultErrorCode.noData"),
      });
    });
  });
});
