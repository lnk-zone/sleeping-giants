export interface ReaderBootstrapOptions {
  readonly version: string;
}

export const bootstrapReader = (options: ReaderBootstrapOptions): string => {
  return `Sleeping Giants Reader v${options.version}`;
};
