'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './ui';

interface AppHeaderProps {
  title?: string;
  showVoiceToggle?: boolean;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  showDemoBadge?: boolean;
}

export function AppHeader({ 
  title = "Zaman AI", 
  showVoiceToggle = false, 
  voiceEnabled = false, 
  onToggleVoice,
  showDemoBadge = false 
}: AppHeaderProps) {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/chat', label: 'Чат' },
    { href: '/home', label: 'Мой банк' },
    { href: '/spending', label: 'Анализ' },
    { href: '/products', label: 'Каталог' },
    { href: '/metrics', label: 'Метрики' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur border-b border-z-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: App title */}
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold text-z-ink">{title}</h1>
            {showDemoBadge && (
              <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-medium">
                DEMO
              </span>
            )}
          </div>

          {/* Center: Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    px-3 py-2 text-sm font-medium transition-colors
                    ${isActive 
                      ? 'text-[var(--z-green)] border-b-2 border-[var(--z-green)]' 
                      : 'text-z-ink-2 hover:text-[var(--z-green)]'
                    }
                  `}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Navigation */}
          <nav className="md:hidden flex items-center space-x-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    px-2 py-2 text-xs font-medium whitespace-nowrap transition-colors min-h-[40px] flex items-center
                    ${isActive 
                      ? 'text-[var(--z-green)] border-b-2 border-[var(--z-green)]' 
                      : 'text-z-ink-2 hover:text-[var(--z-green)]'
                    }
                  `}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Voice toggle + Avatar */}
          <div className="flex items-center space-x-3">
            {showVoiceToggle && onToggleVoice && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleVoice}
                className={voiceEnabled ? 'bg-[var(--z-solar)]/50' : ''}
              >
                🎤 Голос
              </Button>
            )}
            <div className="w-8 h-8 bg-z-muted rounded-full flex items-center justify-center text-lg">
              🧑‍🟩
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
