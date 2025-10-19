'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Product, filterProducts } from '../../lib/products';
import { track } from '../../lib/telemetry';

const DEBOUNCE = 250;

function ProductsPageContent() {
  const sp = useSearchParams();
  const router = useRouter();

  // URL → state
  const q0    = decodeURIComponent(sp.get('q')   ?? '');
  const type0 = decodeURIComponent(sp.get('type')?? '');
  const min0  = Number(sp.get('min') ?? 0);

  const [query, setQuery] = useState(q0);
  const [type, setType]   = useState(type0);
  const [min, setMin]     = useState<number>(isNaN(min0) ? 0 : min0);
  const [open, setOpen]   = useState(false); // filter sheet

  // data
  const [all, setAll] = useState<Product[]>([]);
  useEffect(() => {
    fetch('/data/products.json', { cache: 'force-cache' })
      .then(r => r.json())
      .then(setAll)
      .catch(() => setAll([]));
    track('products_view', { fromUrl: { q: q0, type: type0, min: min0 } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // filtering
  const list = useMemo(() => filterProducts(all, query, type, min), [all, query, type, min]);

  // debounce URL sync on query
  useEffect(() => {
    const t = setTimeout(() => {
      const url = `/products?type=${encodeURIComponent(type)}&min=${isNaN(min)?0:min}&q=${encodeURIComponent(query)}`;
      router.replace(url);
      track('products_filter', { type, min, q: query, resultsCount: list.length, source: 'manual_filter' });
    }, DEBOUNCE);
    return () => clearTimeout(t);
  }, [query, type, min, list.length, router]);

  // helpers
  const reset = () => { setQuery(''); setType(''); setMin(0); };

  return (
    <div className="min-h-screen bg-white">
      {/* sticky search */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="relative flex-1">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Поиск продукта..."
              className="w-full rounded-full border border-neutral-200 pl-11 pr-12 py-2.5 text-[15px] outline-none
                         focus:ring-2 focus:ring-emerald-300"
              aria-label="Поиск по каталогу"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">🔎</span>
            {/* filter button */}
            <button
              onClick={() => setOpen(true)}
              aria-label="Фильтры"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 size-9 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50"
            >⚙️</button>
          </div>
          <button onClick={reset} className="text-sm text-neutral-600 hover:text-emerald-700">Сброс</button>
        </div>
      </header>

      {/* results info */}
      <div className="max-w-4xl mx-auto px-4 py-3 text-sm text-neutral-600">
        Найдено <b>{list.length}</b> продуктов
      </div>

      {/* grid */}
      <main className="max-w-4xl mx-auto px-4 pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(p => <ProductCard key={p.id} p={p} />)}
        {list.length === 0 && (
          <EmptyState onReset={reset} />
        )}
      </main>

      {/* filter sheet / modal */}
      {open && (
        <FilterSheet
          type={type} min={min}
          onClose={() => setOpen(false)}
          onApply={(t, m) => { setType(t); setMin(m); setOpen(false); }}
        />
      )}
    </div>
  );
}

function EmptyState({ onReset }:{onReset:()=>void}) {
  return (
    <div className="col-span-full rounded-2xl border border-neutral-200 bg-white p-8 text-center">
      <div className="mx-auto relative w-32 h-32 mb-4 opacity-90" aria-hidden="true">
        <Image src="/brand/coin-duo.png" alt="" fill className="object-contain" sizes="128px"/>
      </div>
      <div className="text-neutral-800 font-medium">Ничего не найдено</div>
      <div className="text-neutral-500 text-sm mt-1">Попробуйте изменить фильтры или запрос</div>
      <button onClick={onReset} className="mt-4 rounded-full px-4 py-2 bg-emerald-600 text-white">Сбросить фильтры</button>
    </div>
  );
}

function ProductCard({ p }:{ p: Product }) {
  const minTxt = p.minAmount != null ? new Intl.NumberFormat('ru-RU').format(p.minAmount) + ' ₸' : 'Без ограничений';
  return (
    <article className="relative overflow-hidden rounded-2xl bg-white shadow-[0_8px_28px_rgba(0,0,0,.06)] border border-white">
      <div className="p-4 pr-20">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-neutral-900 leading-snug">{p.name}</h3>
          {p.halal !== false && <span className="badge-halal">Халяль</span>}
        </div>
        <div className="mt-2 text-sm text-neutral-600 space-y-1">
          <div>Минимум: <b className="text-neutral-800">{minTxt}</b></div>
          {p.termMonths ? <div>Срок: <b className="text-neutral-800">{p.termMonths} мес</b></div> : null}
        </div>
        <div className="mt-3 flex gap-2">
          <Link href={`/apply/${p.id}`} onClick={() => track('product_applied', { id: p.id, name: p.name, type: p.type, min: p.minAmount, term: p.termMonths })}
                className="rounded-xl px-3.5 py-2 bg-emerald-600 text-white text-sm">Оформить</Link>
          <Link href={`/products/${p.id}`} onClick={() => track('product_click', { id: p.id, name: p.name, type: p.type })}
                className="rounded-xl px-3.5 py-2 bg-neutral-100 text-neutral-800 text-sm">Подробнее</Link>
        </div>
      </div>
      {/* subtle illustration */}
      <div className="absolute -right-2 -bottom-2 w-24 h-24 opacity-80" aria-hidden="true">
        <Image
          src={p.type === 'карта' ? '/brand/card.png'
               : p.type === 'вклад' ? '/brand/coins.jpg'
               : p.type === 'мурабаха' ? '/brand/paper-planes.jpg'
               : '/brand/coin-duo.png'}
          alt="" fill sizes="96px" className="object-contain" />
      </div>
    </article>
  );
}

type SheetProps = {
  type: string; min: number;
  onClose: () => void;
  onApply: (type: string, min: number) => void;
};

function FilterSheet({ type, min, onClose, onApply }: SheetProps) {
  const [t, setT] = useState(type);
  const [m, setM] = useState(min);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 shadow-[0_-12px_40px_rgba(0,0,0,.14)]">
        <div className="mx-auto h-1 w-10 rounded-full bg-neutral-200 mb-3" />
        <h2 className="text-base font-semibold">Фильтры</h2>

        <label className="block mt-4 text-sm text-neutral-600">Тип продукта</label>
        <select value={t} onChange={e => setT(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2">
          <option value="">Все типы</option>
          <option value="вклад">Вклад</option>
          <option value="мурабаха">Мурабаха</option>
          <option value="карта">Карта</option>
          <option value="сервис">Сервис</option>
        </select>

        <label className="block mt-4 text-sm text-neutral-600">Минимальная сумма (до)</label>
        <input type="number" inputMode="numeric" value={m}
               onChange={e => setM(Number(e.target.value) || 0)}
               className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="Напр. 1000000" />

        <div className="flex gap-2 mt-5">
          <button onClick={() => { setT(''); setM(0); }}
                  className="flex-1 rounded-xl bg-neutral-100 text-neutral-800 py-2">Сброс</button>
          <button onClick={() => onApply(t, m)}
                  className="flex-1 rounded-xl bg-emerald-600 text-white py-2">Применить</button>
        </div>
        <button onClick={onClose} className="block mx-auto mt-3 text-sm text-neutral-600">Закрыть</button>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
    </div>}>
      <ProductsPageContent />
    </Suspense>
  );
}