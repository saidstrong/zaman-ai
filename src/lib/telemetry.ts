import { once } from './once';

export function track(event: string, payload?: Record<string, unknown>, dedupeKey?: string) {
  if (typeof window !== 'undefined') {
    const optIn = localStorage.getItem('telemetry_opt_in') === '1';
    if (!optIn) return;
  }
  
  const run = () => {
    try {
      console.log("[telemetry]", event, payload ?? {});
      const key = "zaman_telemetry";
      const arr = JSON.parse(localStorage.getItem(key) || "[]");
      arr.push({ t: Date.now(), event, payload });
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {}
  };
  if (dedupeKey) {
    once(`telemetry:${dedupeKey}`, run);
  } else {
    run();
  }
}
