export type DataPoint = {
  metric: string;
  value: number;
};

export const average = (points: readonly DataPoint[]): number => {
  if (points.length === 0) {
    return 0;
  }

  const total = points.reduce((sum, point) => sum + point.value, 0);
  return total / points.length;
};

export * from './prd.js';
export * from './html/sanitizer.js';
export * from './beehiiv/types.js';
export { BeehiivClient } from './beehiiv/client.js';
export { BeehiivWorker } from './beehiiv/worker.js';
export * from './issues/index.js';
export * from './search/issues.js';
