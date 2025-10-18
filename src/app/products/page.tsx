'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { track } from '../../lib/telemetry';
import { AppHeader } from '../../components/AppHeader';
import { Card, Button, Badge, Stat, Pill } from '../../components/ui';

interface Product {
  id: number;
  name: string;
  type: string;
  halalTags: string[];
  minAmount: number;
  termMonths: number;
  link?: string;
}

function ProductsPageComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [minAmountFilter, setMinAmountFilter] = useState(0);
  
  // Button submission guard
  const [submittingId, setSubmittingId] = useState<string | number | null>(null);
  
  // Ref guards for telemetry deduplication
  const didFilterFromUrl = useRef(false);
  
  // Function to apply filters from URL parameters
  const applyFiltersFromUrl = (data: Product[], normalizedType: string, normalizedMin: number, normalizedQuery: string) => {
    let filtered = data;
    
    if (normalizedQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(normalizedQuery.toLowerCase())
      );
    }
    
    if (normalizedType) {
      filtered = filtered.filter(product => product.type === normalizedType);
    }
    
    if (normalizedMin > 0) {
      filtered = filtered.filter(product => product.minAmount <= normalizedMin);
    }
    
    setFilteredProducts(filtered);
    
    // Track auto-filter from URL parameters only once
    if (!didFilterFromUrl.current) {
      didFilterFromUrl.current = true;
      track("products_filter", {
        type: normalizedType,
        min: normalizedMin,
        q: normalizedQuery,
        resultsCount: filtered.length,
        source: "url_params"
      }, `products_filter:url:${normalizedType}:${normalizedMin}:${normalizedQuery}`);
    }
    
    // Scroll to results after a short delay
    setTimeout(() => {
      document.getElementById("product-results")?.scrollIntoView({ behavior: "smooth" });
    }, 500);
  };

  // Load products data
  useEffect(() => {
    const loadProducts = async (): Promise<Product[]> => {
      // Try main products file first
      const res = await fetch('/data/products.json', { cache: 'no-store' });
      if (!res.ok) {
        // Fallback to local demo products
        console.log('Main products.json failed, using local fallback');
        const fallbackRes = await fetch('/data/products.local.json', { cache: 'no-store' });
        if (!fallbackRes.ok) throw new Error(`Failed to load fallback products: ${fallbackRes.status}`);
        const fallbackData = await fallbackRes.json();
        if (!Array.isArray(fallbackData)) throw new Error('Invalid fallback products format: expected an array');
        return fallbackData;
      }
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Invalid products format: expected an array');
      return data;
    };

    const initializeProducts = async () => {
      try {
        const data = await loadProducts();
        setProducts(data);
        
        // Read URL parameters
        const urlType = searchParams.get('type');
        const urlMin = searchParams.get('min');
        const urlQuery = searchParams.get('q');
        
        // Normalize type value and map synonyms
        const typeMapping: Record<string, string> = {
          "мурабаха": "мурабаха",
          "вклад": "вклад", 
          "карта": "карта",
          "кредит": "кредит",
          "лизинг": "лизинг"
        };
        
        const normalizedType = urlType ? typeMapping[urlType.toLowerCase().trim()] || urlType : '';
        const normalizedMin = urlMin ? (isNaN(Number(urlMin)) ? 0 : Number(urlMin)) : 0;
        const normalizedQuery = urlQuery || '';
        
        // Pre-fill filters from URL parameters
        if (normalizedType) setSelectedType(normalizedType);
        if (normalizedMin > 0) setMinAmountFilter(normalizedMin);
        if (normalizedQuery) setSearchTerm(normalizedQuery);
        
        // Apply filters if URL parameters exist
        if (normalizedType || normalizedMin > 0 || normalizedQuery) {
          applyFiltersFromUrl(data, normalizedType, normalizedMin, normalizedQuery);
        } else {
          setFilteredProducts(data);
        }
      } catch (error) {
        console.error('Error loading products:', error);
        // Set empty array on error to show friendly message
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    initializeProducts();
  }, [searchParams]);

  // Track page view only once
  useEffect(() => {
    const urlType = searchParams.get('type');
    const urlMin = searchParams.get('min');
    const urlQuery = searchParams.get('q');
    
    const normalizedType = urlType || '';
    const normalizedMin = urlMin ? (isNaN(Number(urlMin)) ? 0 : Number(urlMin)) : 0;
    const normalizedQuery = urlQuery || '';
    
    track("products_view", { 
      fromUrl: { 
        type: normalizedType, 
        min: normalizedMin, 
        q: normalizedQuery 
      } 
    }, 'products_view:init');
  }, [searchParams]);

  // Apply filters
  const applyFilters = () => {
    let filtered = products;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (selectedType) {
      filtered = filtered.filter(product => product.type === selectedType);
    }

    // Min amount filter
    if (minAmountFilter > 0) {
      filtered = filtered.filter(product => product.minAmount <= minAmountFilter);
    }

    setFilteredProducts(filtered);
    
    // Track filter application
    track("products_filter", {
      type: selectedType,
      min: minAmountFilter > 0 ? minAmountFilter : 0,
      q: searchTerm,
      resultsCount: filtered.length,
      source: "manual_filter"
    });
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedType('');
    setMinAmountFilter(0);
    setFilteredProducts(products);
  };

  // Get unique product types
  const productTypes = [...new Set(products.map(p => p.type))];

  // Format amount
  const formatAmount = (amount: number) => {
    if (amount === 0) return 'Без ограничений';
    return `${amount.toLocaleString('ru-RU')} ₸`;
  };

  // Highlight search term in product name
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? <mark key={index} className="bg-[var(--z-solar)]/60 rounded px-1">{part}</mark> : part
    );
  };

  // Format term
  const formatTerm = (months: number) => {
    if (months === 0) return '';
    return `${months} мес`;
  };

  // Handle product click with debouncing
  const handleProductClick = (product: Product) => {
    if (submittingId === product.id) return; // guard against double clicks
    setSubmittingId(product.id);
    
    console.log("product_click", product.name);
    
    // Track product click with deduplication
    track("product_click", {
      id: product.id,
      name: product.name,
      type: product.type,
      minAmount: product.minAmount,
      termMonths: product.termMonths
    }, `product_click:${product.id}`);
    
    // Navigate to chat with product parameters
    const url = `/?apply_product=1&id=${product.id}&name=${encodeURIComponent(product.name)}&type=${encodeURIComponent(product.type)}&min=${product.minAmount ?? 0}&term=${product.termMonths ?? 0}`;
    router.push(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D9A86]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-z-cloud">
      <AppHeader title="Каталог продуктов Zaman Bank" />

      <main className="max-w-7xl mx-auto p-6">
        {/* Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="p-5 md:p-6 mb-6">
            <h2 className="text-lg md:text-xl font-semibold mb-3 text-z-ink">Фильтры</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Search Input */}
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">
                  Поиск по названию
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Введите название продукта..."
                  className="w-full border border-z-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white"
                />
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">
                  Тип продукта
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full border border-z-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white"
                >
                  <option value="">Все типы</option>
                  {productTypes.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min Amount Filter */}
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">
                  Минимальная сумма (до)
                </label>
                <input
                  type="number"
                  value={minAmountFilter || ''}
                  onChange={(e) => setMinAmountFilter(Number(e.target.value) || 0)}
                  placeholder="Введите сумму..."
                  className="w-full border border-z-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col justify-end space-y-2">
                <Button onClick={applyFilters} className="w-full">
                  Применить
                </Button>
                <Button variant="ghost" onClick={resetFilters} className="w-full">
                  Сбросить
                </Button>
              </div>
            </div>

            {/* Filter Summary */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-z-ink-2">
                Найдено {filteredProducts.length} продуктов
              </div>
              <Badge>{filteredProducts.length} продуктов</Badge>
            </div>
          </Card>
        </motion.div>

        {/* Products Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.1 }}
        >
          <div id="product-results" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.1 }}
              >
                <Card className="p-6 hover:outline hover:outline-[var(--z-green)]/20 hover:scale-[101%] transition-all duration-200">
                  {/* Product Name */}
                  <h3 className="text-lg font-medium text-z-ink mb-3">
                    {highlightSearchTerm(product.name, searchTerm)}
                  </h3>

                  {/* Type and Halal Tags */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Pill variant="info">{product.type}</Pill>
                    {product.halalTags.map((tag, tagIndex) => (
                      <Pill key={tagIndex} variant="success" size="sm">
                        {tag}
                      </Pill>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 mb-4">
                    <Stat label="Минимум" value={formatAmount(product.minAmount)} />
                    {product.termMonths > 0 && (
                      <Stat label="Срок" value={formatTerm(product.termMonths)} />
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleProductClick(product)}
                      disabled={submittingId === product.id}
                      className="flex-1"
                    >
                      {submittingId === product.id ? 'Загрузка...' : 'Оформить'}
                    </Button>
                    {product.link && (
                      <Button variant="ghost" asChild className="flex-1">
                        <a href={product.link} target="_blank" rel="noopener noreferrer">
                          Подробнее
                        </a>
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* No Results */}
        {filteredProducts.length === 0 && products.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="text-center py-12"
          >
            <Card className="p-8 bg-red-50 border-red-200">
              <div className="text-red-600 text-lg mb-2 font-medium">
                Не удалось загрузить каталог
              </div>
              <div className="text-red-500 text-sm">
                Проверьте /public/data/products.json
              </div>
            </Card>
          </motion.div>
        )}
        
        {filteredProducts.length === 0 && products.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="text-center py-12"
          >
            <Card className="p-8">
              <div className="text-z-ink-2 text-lg">
                Нет результатов. Попробуйте изменить фильтры.
              </div>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D9A86]"></div>
    </div>}>
      <ProductsPageComponent />
    </Suspense>
  );
}
