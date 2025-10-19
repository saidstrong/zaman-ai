'use client';

import { useState } from 'react';
import { BottomSheet } from '../BottomSheet';
import { Button } from './Button';

interface FilterOptions {
  type: string;
  term: string;
  minAmount: number;
  maxAmount: number;
  onlyHalal: boolean;
  withProfit: boolean;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export function FilterModal({ isOpen, onClose, onApply, currentFilters }: FilterModalProps) {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const resetFilters = () => {
    const resetFilters: FilterOptions = {
      type: '',
      term: '',
      minAmount: 0,
      maxAmount: 10000000,
      onlyHalal: false,
      withProfit: false
    };
    setFilters(resetFilters);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Фильтры">
      <div className="p-6 space-y-6">
        {/* Type Filter */}
        <div>
          <label className="block text-sm font-medium text-z-ink-2 mb-2">Тип продукта</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="w-full p-3 border border-z-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white"
          >
            <option value="">Все типы</option>
            <option value="мурабаха">Мурабаха</option>
            <option value="вклад">Вклад</option>
            <option value="карта">Карта</option>
            <option value="кредит">Кредит</option>
            <option value="лизинг">Лизинг</option>
          </select>
        </div>

        {/* Term Filter */}
        <div>
          <label className="block text-sm font-medium text-z-ink-2 mb-2">Срок</label>
          <select
            value={filters.term}
            onChange={(e) => setFilters(prev => ({ ...prev, term: e.target.value }))}
            className="w-full p-3 border border-z-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white"
          >
            <option value="">Любой срок</option>
            <option value="0">Без срока</option>
            <option value="3">До 3 месяцев</option>
            <option value="6">До 6 месяцев</option>
            <option value="12">До 12 месяцев</option>
            <option value="24">До 24 месяцев</option>
            <option value="36">До 36 месяцев</option>
          </select>
        </div>

        {/* Amount Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-z-ink-2 mb-2">Мин. сумма (₸)</label>
            <input
              type="number"
              value={filters.minAmount}
              onChange={(e) => setFilters(prev => ({ ...prev, minAmount: Number(e.target.value) }))}
              className="w-full p-3 border border-z-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white tabular-nums"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-z-ink-2 mb-2">Макс. сумма (₸)</label>
            <input
              type="number"
              value={filters.maxAmount}
              onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: Number(e.target.value) }))}
              className="w-full p-3 border border-z-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white tabular-nums"
              placeholder="10,000,000"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-z-ink">Только халяль</div>
              <div className="text-sm text-z-ink-2">Показать только исламские продукты</div>
            </div>
            <button
              onClick={() => setFilters(prev => ({ ...prev, onlyHalal: !prev.onlyHalal }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                filters.onlyHalal ? 'bg-[var(--z-green)]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  filters.onlyHalal ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-z-ink">С доходом</div>
              <div className="text-sm text-z-ink-2">Продукты с ожидаемой прибылью</div>
            </div>
            <button
              onClick={() => setFilters(prev => ({ ...prev, withProfit: !prev.withProfit }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                filters.withProfit ? 'bg-[var(--z-green)]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  filters.withProfit ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <Button
            variant="ghost"
            onClick={resetFilters}
            className="flex-1"
          >
            Сбросить
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1"
          >
            Применить
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
