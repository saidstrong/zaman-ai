'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { track } from '../../lib/telemetry';
import { Button, ProductCard, FilterModal } from '../../components/ui';

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
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    term: '',
    minAmount: 0,
    maxAmount: 10000000,
    onlyHalal: false,
    withProfit: false
  });
  
  // Button submission guard
  const [submittingId, setSubmittingId] = useState<string | number | null>(null);
  
  // Ref guards for telemetry deduplication
  // const didFilterFromUrl = useRef(false);
  
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
  };

  useEffect(() => {
    const initializeProducts = async () => {
      setLoading(true);
      try {
        // Load products from JSON file
        const response = await fetch('/data/products.json');
        if (!response.ok) {
          throw new Error('Failed to load products');
        }
        const data: Product[] = await response.json();
        setProducts(data);
        
        // Apply URL filters if present
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
        if (normalizedType) setFilters(prev => ({ ...prev, type: normalizedType }));
        if (normalizedMin > 0) setFilters(prev => ({ ...prev, minAmount: normalizedMin }));
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

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = products;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filters.type) {
      filtered = filtered.filter(product => product.type === filters.type);
    }

    // Term filter
    if (filters.term) {
      const termMonths = Number(filters.term);
      filtered = filtered.filter(product => {
        if (termMonths === 0) return product.termMonths === 0;
        return product.termMonths <= termMonths;
      });
    }

    // Amount range filter
    if (filters.minAmount > 0) {
      filtered = filtered.filter(product => product.minAmount >= filters.minAmount);
    }
    if (filters.maxAmount < 10000000) {
      filtered = filtered.filter(product => product.minAmount <= filters.maxAmount);
    }

    // Halal filter
    if (filters.onlyHalal) {
      filtered = filtered.filter(product => product.halalTags && product.halalTags.length > 0);
    }

    setFilteredProducts(filtered);
    
    // Track filter application
    track("products_filter", {
      type: filters.type,
      term: filters.term,
      min: filters.minAmount,
      max: filters.maxAmount,
      q: searchTerm,
      resultsCount: filtered.length,
      source: "manual_filter"
    });
  }, [products, searchTerm, filters]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

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

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilters({
      type: '',
      term: '',
      minAmount: 0,
      maxAmount: 10000000,
      onlyHalal: false,
      withProfit: false
    });
    setFilteredProducts(products);
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
      <div className="min-h-screen bg-z-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--z-green)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-z-muted">
      <main className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-z-ink">Каталог продуктов</h1>
          <p className="text-z-ink-2 mt-1">Halal банковские продукты</p>
        </div>

               {/* Sticky Search Bar */}
               <motion.div
                 initial={{ opacity: 0, y: 8 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.25 }}
                 className="sticky top-0 z-10 mb-4"
               >
                 <div className="flex items-center space-x-3 glass rounded-full p-2">
                   {/* Search Input */}
                   <div className="flex-1 relative">
                     <input
                       type="text"
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       placeholder="Поиск продуктов..."
                       className="w-full pl-10 pr-4 py-3 border-0 rounded-full focus:outline-none focus:ring-0 bg-transparent text-z-ink placeholder:text-z-muted"
                     />
                     <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-z-ink-2">
                       🔍
                     </div>
                   </div>

                   {/* Filter Button */}
                   <button
                     onClick={() => setIsFilterModalOpen(true)}
                     className="p-3 bg-white/60 hover:bg-white/80 rounded-full transition-colors"
                   >
                     ⚙️
                   </button>
                 </div>
               </motion.div>

        {/* Results Count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="mb-4"
        >
          <div className="bg-[var(--z-green)]/10 text-[var(--z-green)] px-3 py-1 rounded-full inline-block text-sm font-medium">
            Найдено: {filteredProducts.length}
          </div>
        </motion.div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-z-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-z-ink mb-2">Ничего не найдено</h3>
            <p className="text-z-ink-2 mb-4">
              Попробуйте изменить параметры поиска или сбросить фильтры
            </p>
            <Button onClick={resetFilters} variant="secondary">
              Сбросить фильтры
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onApply={handleProductClick}
                highlightTerm={searchTerm}
              />
            ))}
          </div>
        )}

        {/* Filter Modal */}
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={(newFilters) => {
            setFilters(newFilters);
            setIsFilterModalOpen(false);
          }}
          currentFilters={filters}
        />
      </main>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-z-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--z-green)]"></div>
      </div>
    }>
      <ProductsPageComponent />
    </Suspense>
  );
}