export type Product = {
  id: string;
  name: string;
  type: 'вклад' | 'мурабаха' | 'карта' | 'сервис';
  minAmount?: number;
  termMonths?: number;
  tags?: string[];
  halal?: boolean;
  description?: string;
};

export function filterProducts(list: Product[], q: string, type: string, min: number): Product[] {
  const needle = q.trim().toLowerCase();
  return (list ?? []).filter(p => {
    if (type && p.type !== decodeURIComponent(type)) return false;
    if (min && (p.minAmount ?? 0) < min) return false;
    if (!needle) return true;
    const hay = `${p.name} ${p.description ?? ''} ${(p.tags ?? []).join(' ')}`.toLowerCase();
    return hay.includes(needle);
  });
}
