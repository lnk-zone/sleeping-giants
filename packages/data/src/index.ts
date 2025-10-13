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
