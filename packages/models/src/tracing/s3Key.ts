import { TracingFromS3KeyPathDto } from "../queue/messages.js";

export function parseTracingS3Key(key: string): TracingFromS3KeyPathDto {
  const parsed = TracingFromS3KeyPathDto.safeParse(
    decodeURIComponent(key)
      .split("/")
      .map((part) => {
        const [k, v] = decodeURIComponent(part).split("=");
        return { [k]: v };
      })
      .reduce((acc, obj) => ({ ...acc, ...obj }), {}),
  );

  if (!parsed.success) {
    throw new Error(`Error parsing S3 key: ${JSON.stringify(parsed.error)}`);
  }

  return parsed.data;
}
