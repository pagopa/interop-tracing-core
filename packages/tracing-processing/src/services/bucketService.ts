export const bucketServiceBuilder = () => {
  return {
    async writeObject(file: unknown): Promise<unknown> {
      return Promise.resolve(file);
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async readObject(_s3KeyFile: string): Promise<unknown[]> {
      const data = [{}];
      return Promise.resolve(data);
    },
  };
};

export type BucketService = ReturnType<typeof bucketServiceBuilder>;
