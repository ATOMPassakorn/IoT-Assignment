export function formatSensorValue(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return "--";
  }
  return val.toFixed(1);
}
