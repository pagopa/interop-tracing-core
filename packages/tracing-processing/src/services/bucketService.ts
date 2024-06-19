export const bucketServiceBuilder = () => {
  return {
    async writeObject(file: unknown): Promise<unknown> {
      return Promise.resolve(file);
    },
    async readObject(_s3KeyFile: string): Promise<unknown[]> {
      const data = [{}];
      return Promise.resolve(data);
    },
  };
};

export type BucketService = ReturnType<typeof bucketServiceBuilder>;
