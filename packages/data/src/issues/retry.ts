export interface RetryOptions {
  retries?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  onRetry?: (error: unknown, attempt: number) => void;
}

const sleep = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));

export const withBackoff = async <T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> => {
  const retries = options.retries ?? 3;
  const factor = options.factor ?? 2;
  const minDelay = options.minDelayMs ?? 250;
  const maxDelay = options.maxDelayMs ?? 5_000;

  let attempt = 0;
  let delay = minDelay;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await operation(attempt + 1);
    } catch (error) {
      attempt += 1;
      if (attempt > retries) {
        throw error;
      }
      options.onRetry?.(error, attempt);
      await sleep(delay);
      delay = Math.min(delay * factor, maxDelay);
    }
  }
};
