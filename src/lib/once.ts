const flags = new Map<string, boolean>();

export function once(key: string, fn: () => void) {
  if (flags.get(key)) return;
  flags.set(key, true);
  fn();
}

export function resetOnce(key?: string) {
  if (!key) { 
    flags.clear(); 
    return; 
  }
  flags.delete(key);
}
