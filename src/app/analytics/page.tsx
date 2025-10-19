'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Trash2 } from 'lucide-react';
import { track } from '../../lib/telemetry';
import { Card } from '../../components/ui';

interface TelemetryEvent {
  t: number;
  event: string;
  payload?: Record<string, unknown>;
}

export default function AnalyticsPage() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [telemetryOptIn, setTelemetryOptIn] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Load telemetry opt-in setting
    const optIn = localStorage.getItem('telemetry_opt_in') === '1';
    setTelemetryOptIn(optIn);
    
    // Load telemetry events
    const loadEvents = () => {
      try {
        const stored = localStorage.getItem('zaman_telemetry');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setEvents(parsed);
          }
        }
      } catch (error) {
        console.error('Failed to load telemetry:', error);
      }
    };

    loadEvents();
    track('analytics_view');
  }, []);

  const toggleTelemetryOptIn = () => {
    const newValue = !telemetryOptIn;
    setTelemetryOptIn(newValue);
    localStorage.setItem('telemetry_opt_in', newValue ? '1' : '0');
    track('telemetry_toggle', { enabled: newValue });
  };

  const clearEvents = () => {
    localStorage.removeItem('zaman_telemetry');
    setEvents([]);
    track('telemetry_cleared');
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatPayload = (payload?: Record<string, unknown>) => {
    if (!payload) return '';
    const entries = Object.entries(payload).slice(0, 3);
    return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
  };

  // Group events by type
  const grouped = events.reduce((acc, event) => {
    if (!acc[event.event]) {
      acc[event.event] = [];
    }
    acc[event.event].push(event);
    return acc;
  }, {} as Record<string, TelemetryEvent[]>);

  // Calculate totals
  const totalEvents = events.length;
  const uniqueEventTypes = Object.keys(grouped).length;
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  if (!isClient) {
    return (
      <div className="min-h-screen bg-z-muted flex items-center justify-center">
        <div className="text-z-ink-2">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-z-muted">
      <main className="p-4 space-y-4">
        {/* Header */}
        <div className="pt-4">
          <h1 className="text-2xl font-bold text-z-ink">Аналитика</h1>
          <p className="text-z-ink-2 mt-1">Статистика и анализ данных</p>
        </div>

        {/* Telemetry Settings */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-z-ink mb-1">Настройки сбора данных</h3>
                <p className="text-sm text-z-ink-2">Собирать обезличённые события для улучшения сервиса</p>
              </div>
              <button
                onClick={toggleTelemetryOptIn}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  telemetryOptIn ? 'bg-[var(--z-green)]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    telemetryOptIn ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </Card>
        </motion.div>

        {/* Analytics Actions Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <BarChart3 className="text-[var(--z-green)] mr-3" size={20} />
              <h2 className="text-lg font-semibold text-z-ink">Аналитика действий</h2>
            </div>
            
            {events.length > 0 ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-z-muted/50 rounded-xl">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--z-green)] tabular-nums">{totalEvents}</div>
                    <div className="text-xs text-z-ink-2">Всего событий</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--z-green)] tabular-nums">{uniqueEventTypes}</div>
                    <div className="text-xs text-z-ink-2">Типов событий</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--z-green)] tabular-nums">
                      {lastEvent ? formatTime(lastEvent.t) : '—'}
                    </div>
                    <div className="text-xs text-z-ink-2">Последнее</div>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="space-y-2">
                  <h3 className="font-medium text-z-ink">Распределение событий</h3>
                  <div className="space-y-2">
                    {Object.entries(grouped).slice(0, 5).map(([event, items]) => {
                      const percentage = (items.length / totalEvents) * 100;
                      return (
                        <div key={event} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-z-ink">{event}</span>
                            <span className="text-[var(--z-green)] font-medium tabular-nums">{items.length}</span>
                          </div>
                          <div className="h-2 bg-z-border rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-[var(--z-green)] rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Events */}
                <div className="space-y-2">
                  <h3 className="font-medium text-z-ink">Последние события</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {events.slice(-5).reverse().map((event, index) => (
                      <div key={index} className="flex justify-between items-start p-2 bg-white rounded-lg text-sm">
                        <div className="flex-1">
                          <div className="font-medium text-z-ink">{event.event}</div>
                          {event.payload && (
                            <div className="text-z-ink-2 text-xs mt-1">{formatPayload(event.payload)}</div>
                          )}
                        </div>
                        <div className="text-z-ink-2 text-xs tabular-nums ml-2">
                          {formatTime(event.t)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clear Button */}
                <button
                  onClick={clearEvents}
                  className="w-full py-2 px-4 bg-z-muted text-z-ink-2 rounded-xl hover:bg-z-border transition-colors flex items-center justify-center space-x-2"
                >
                  <Trash2 size={16} />
                  <span>Очистить события</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 size={32} className="mx-auto text-z-ink-2 mb-2" />
                <p className="text-z-ink-2">Нет данных для анализа</p>
                <p className="text-xs text-z-ink-2 mt-1">Включите сбор данных выше</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Spending Analysis Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <TrendingUp className="text-[var(--z-green)] mr-3" size={20} />
              <h2 className="text-lg font-semibold text-z-ink">Анализ расходов</h2>
            </div>
            
            <p className="text-z-ink-2 mb-4">
              Загрузите CSV с транзакциями или используйте данные из приложения для анализа ваших расходов
            </p>
            
            <Link href="/spending">
              <button className="w-full py-3 px-4 bg-[var(--z-green)] text-white rounded-xl hover:bg-[var(--z-green-600)] transition-colors font-medium">
                Открыть анализ расходов
              </button>
            </Link>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
