export function planGoal(sum: number, dateISO: string) {
  const ms = new Date(dateISO).getTime() - Date.now();
  const months = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24 * 30)));
  return { months, monthly: Math.ceil(sum / months) };
}
