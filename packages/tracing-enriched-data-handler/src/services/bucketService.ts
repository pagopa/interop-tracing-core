export const bucketServiceBuilder = () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async readObject(_s3KeyFile: string): Promise<unknown[]> {
      const data = [{}];
      return Promise.resolve(data);
    },
  };
};

export type BucketService = ReturnType<typeof bucketServiceBuilder>;
