'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { track } from '../../lib/telemetry';

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
      const res = await fetch('/data/products.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load products: ${res.status}`);
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
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="bg-[#2D9A86] text-white p-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">Каталог продуктов Zaman Bank</h1>
          <div className="flex space-x-4">
            <Link href="/" className="hover:text-[#EEFE6D] transition-colors">
              ← В чат
            </Link>
            <Link href="/spending" className="hover:text-[#EEFE6D] transition-colors">
              Анализ расходов
            </Link>
            <span className="text-[#EEFE6D]">Каталог продуктов</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {/* Filters Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Фильтры</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Поиск по названию
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Введите название продукта..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D9A86] focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип продукта
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D9A86] focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Минимальная сумма (до)
              </label>
              <input
                type="number"
                value={minAmountFilter || ''}
                onChange={(e) => setMinAmountFilter(Number(e.target.value) || 0)}
                placeholder="Введите сумму..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D9A86] focus:border-transparent"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col justify-end space-y-2">
              <button
                onClick={applyFilters}
                className="bg-[#2D9A86] text-white px-4 py-2 rounded-lg hover:bg-[#248076] transition-colors"
              >
                Применить
              </button>
              <button
                onClick={resetFilters}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Сбросить
              </button>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Найдено {filteredProducts.length} продуктов
            </div>
            <div className="bg-[#EEFE6D] text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
              {filteredProducts.length} продуктов
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div id="product-results" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              {/* Product Name */}
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                {product.name}
              </h3>

              {/* Type and Halal Tags */}
              <div className="mb-4">
                <span className="inline-block bg-[#EEFE6D] text-gray-800 px-3 py-1 rounded-full text-sm font-medium mr-2 mb-2">
                  {product.type}
                </span>
                {product.halalTags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-block bg-[#2D9A86] text-white px-3 py-1 rounded-full text-sm mr-2 mb-2"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Term and Min Amount */}
              <div className="text-sm text-gray-600 mb-4">
                <div>Минимум: {formatAmount(product.minAmount)}</div>
                {product.termMonths > 0 && (
                  <div>Срок: {formatTerm(product.termMonths)}</div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleProductClick(product)}
                  disabled={submittingId === product.id}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    submittingId === product.id 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-[#2D9A86] text-white hover:bg-[#248076]'
                  }`}
                >
                  {submittingId === product.id ? 'Загрузка...' : 'Оформить'}
                </button>
                {product.link && (
                  <a
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-[#EEFE6D] text-gray-800 px-4 py-2 rounded-lg hover:bg-[#D9E55A] transition-colors text-center"
                  >
                    Подробнее
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredProducts.length === 0 && products.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-red-500 text-lg mb-2">
              Не удалось загрузить каталог
            </div>
            <div className="text-gray-500 text-sm">
              Проверьте /public/data/products.json
            </div>
          </div>
        )}
        
        {filteredProducts.length === 0 && products.length > 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">
              Нет результатов. Попробуйте изменить фильтры.
            </div>
          </div>
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
