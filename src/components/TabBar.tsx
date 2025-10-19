'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Home, 
  CreditCard, 
  Package, 
  BarChart3, 
  User 
} from 'lucide-react';

const tabs = [
  { href: '/home', icon: Home, label: 'Главная' },
  { href: '/pay', icon: CreditCard, label: 'Оплата' },
  { href: '/products', icon: Package, label: 'Продукты' },
  { href: '/spending', icon: BarChart3, label: 'Аналитика' },
  { href: '/profile', icon: User, label: 'Профиль' }
];

export function TabBar() {
  const pathname = usePathname();
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div 
        className="bg-white border-t border-z-border shadow-lg"
        style={{ paddingBottom: 'var(--safe-area-inset-bottom)' }}
      >
        <div className="flex justify-around py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center py-2 px-3 min-h-[44px] touch-manipulation"
              >
                <motion.div
                  className="relative"
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <Icon 
                    size={20}
                    className={`transition-colors ${
                      isActive ? 'text-[var(--z-green)]' : 'text-z-ink-2'
                    }`}
                  />
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-[var(--z-green)] rounded-full"
                      layoutId="activeTab"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </motion.div>
                <span 
                  className={`text-xs mt-1 font-medium transition-colors ${
                    isActive ? 'text-[var(--z-green)]' : 'text-z-ink-2'
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
