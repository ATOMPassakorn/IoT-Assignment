export interface ChartBounds {
  min: number;
  max: number;
  range: number;
}

export function calculateChartBounds(points: Array<{ temperature: number | null | undefined }>): ChartBounds {
  const values = (points || [])
    .map((p) => p.temperature)
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (values.length === 0) {
    return { min: 0, max: 100, range: 100 };
  }
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const range = max - min || 1;
  return { min, max, range };
}
