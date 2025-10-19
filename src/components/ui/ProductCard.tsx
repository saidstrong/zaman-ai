'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Card, Button, Pill } from './index';

interface Product {
  id: number;
  name: string;
  type: string;
  halalTags: string[];
  minAmount: number;
  termMonths: number;
  description?: string;
  link?: string;
}

interface ProductCardProps {
  product: Product;
  onApply: (product: Product) => void;
  highlightTerm?: string;
}

export function ProductCard({ product, onApply, highlightTerm }: ProductCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const highlightSearchTerm = (text: string, term?: string) => {
    if (!term) return text;
    
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-[#EEFE6D]/60 rounded px-1">
          {part}
        </mark>
      ) : part
    );
  };

  // Get illustration based on product type
  const getIllustration = (type: string) => {
    switch (type.toLowerCase()) {
      case 'карта':
        return '/brand/card.png';
      case 'вклад':
        return '/brand/coins.jpg';
      case 'перевод':
        return '/brand/paper-planes.jpg';
      default:
        return '/brand/coin-duo.png';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="relative overflow-hidden rounded-2xl bg-card shadow-card border border-white/60 p-4 h-full">
        {/* Decorative illustration */}
        <div className="absolute -right-2 -bottom-2 w-24 h-24 opacity-80" aria-hidden="true">
          <Image src={getIllustration(product.type)} alt="" fill sizes="96px" className="object-contain" />
        </div>
        {/* Top: Name + Halal Badge */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-medium text-z-ink flex-1">
            {highlightSearchTerm(product.name, highlightTerm)}
          </h3>
          <Pill variant="success" size="sm" className="ml-2">
            Халяль • прозрачные условия
          </Pill>
        </div>

        {/* Middle: Key Parameters */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/60 rounded-lg p-2">
            <div className="text-xs text-z-ink-2">Минимум</div>
            <div className="text-sm font-semibold text-z-ink tabular-nums">
              {product.minAmount.toLocaleString()} ₸
            </div>
          </div>
          <div className="bg-white/60 rounded-lg p-2">
            <div className="text-xs text-z-ink-2">Срок</div>
            <div className="text-sm font-semibold text-z-ink">
              {product.termMonths > 0 ? `${product.termMonths} мес` : 'Не ограничен'}
            </div>
          </div>
        </div>

        {/* Tags */}
        {product.halalTags && product.halalTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {product.halalTags.slice(0, 3).map((tag, index) => (
              <Pill key={index} size="sm" variant="info">
                {tag}
              </Pill>
            ))}
          </div>
        )}

        {/* Description (Collapsible) */}
        {showDetails && product.description && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-white/60 rounded-lg"
          >
            <p className="text-sm text-z-ink-2">{product.description}</p>
          </motion.div>
        )}

        {/* Bottom: Action Buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={() => onApply(product)}
            className="flex-1"
            size="sm"
          >
            Оформить
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowDetails(!showDetails)}
            size="sm"
          >
            {showDetails ? 'Скрыть' : 'Подробнее'}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
