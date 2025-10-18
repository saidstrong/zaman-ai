export function planGoal(targetAmount: number, targetDateISO: string) {
  const now = Date.now();
  const months = Math.max(1, Math.ceil((new Date(targetDateISO).getTime() - now) / (1000 * 60 * 60 * 24 * 30)));
  return { monthlyPlan: Math.ceil(targetAmount / months), months };
}
