'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TelemetryEvent {
  t: number;
  event: string;
  payload?: Record<string, unknown>;
}

interface EventStats {
  count: number;
  events: TelemetryEvent[];
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Record<string, EventStats>>({});
  const [totalEvents, setTotalEvents] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    loadMetrics();
  }, []);

  const loadMetrics = () => {
    try {
      const data = localStorage.getItem('zaman_telemetry');
      if (!data) return;

      const events: TelemetryEvent[] = JSON.parse(data);
      const grouped: Record<string, EventStats> = {};

      events.forEach(event => {
        if (!grouped[event.event]) {
          grouped[event.event] = { count: 0, events: [] };
        }
        grouped[event.event].count++;
        grouped[event.event].events.push(event);
      });

      setMetrics(grouped);
      setTotalEvents(events.length);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const clearMetrics = () => {
    if (confirm('Очистить все метрики?')) {
      localStorage.removeItem('zaman_telemetry');
      setMetrics({});
      setTotalEvents(0);
    }
  };

  const getBarWidth = (count: number, maxCount: number) => {
    return maxCount > 0 ? (count / maxCount) * 100 : 0;
  };

  const maxCount = Math.max(...Object.values(metrics).map(stats => stats.count));

  // SSR Safety Guard
  if (!isClient) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D9A86] mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#2D9A86] text-white p-4 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold">Метрики Zaman AI</h1>
            <button
              onClick={clearMetrics}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Очистить события
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-50 border-b p-4">
        <div className="max-w-6xl mx-auto flex space-x-4">
          <Link href="/" className="text-[#2D9A86] hover:text-[#248076] font-medium">
            ← В чат
          </Link>
          <Link href="/spending" className="text-[#2D9A86] hover:text-[#248076] font-medium">
            Анализ расходов
          </Link>
          <Link href="/products" className="text-[#2D9A86] hover:text-[#248076] font-medium">
            Каталог продуктов
          </Link>
          <span className="text-gray-600 font-medium">Метрики</span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {/* Summary */}
        <div className="bg-[#EEFE6D] rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Общая статистика</h2>
          <p className="text-gray-700">
            Всего событий: <span className="font-bold text-[#2D9A86]">{totalEvents}</span>
          </p>
          <p className="text-gray-700">
            Уникальных типов событий: <span className="font-bold text-[#2D9A86]">{Object.keys(metrics).length}</span>
          </p>
        </div>

        {/* SVG Bar Chart */}
        {Object.keys(metrics).length > 0 && (
          <div className="bg-white border rounded-xl p-6 mb-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">График событий</h2>
            <div className="w-full h-64">
              <svg width="100%" height="100%" viewBox="0 0 800 200" className="overflow-visible">
                {/* Y-axis */}
                <line x1="50" y1="20" x2="50" y2="180" stroke="#e5e7eb" strokeWidth="2"/>
                
                {/* Y-axis labels */}
                {Array.from({ length: 6 }, (_, i) => {
                  const value = Math.round((maxCount / 5) * i);
                  const y = 180 - (i * 32);
                  return (
                    <g key={i}>
                      <text x="45" y={y + 5} textAnchor="end" className="text-xs fill-gray-600">
                        {value}
                      </text>
                      <line x1="48" y1={y} x2="52" y2={y} stroke="#e5e7eb" strokeWidth="1"/>
                    </g>
                  );
                })}
                
                {/* Bars */}
                {Object.entries(metrics).map(([eventType, stats], index) => {
                  const barWidth = 60;
                  const barSpacing = 80;
                  const x = 70 + (index * barSpacing);
                  const height = (stats.count / maxCount) * 160;
                  const y = 180 - height;
                  
                  return (
                    <g key={eventType}>
                      {/* Bar */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={height}
                        fill="#2D9A86"
                        rx="4"
                      />
                      
                      {/* Value label on top of bar */}
                      <text
                        x={x + barWidth / 2}
                        y={y - 5}
                        textAnchor="middle"
                        className="text-xs fill-gray-700 font-medium"
                      >
                        {stats.count}
                      </text>
                      
                      {/* Event name below bar */}
                      <text
                        x={x + barWidth / 2}
                        y="195"
                        textAnchor="middle"
                        className="text-xs fill-gray-600"
                        transform={`rotate(-45 ${x + barWidth / 2} 195)`}
                      >
                        {eventType.replace(/_/g, ' ')}
                      </text>
                    </g>
                  );
                })}
                
                {/* X-axis */}
                <line x1="50" y1="180" x2="750" y2="180" stroke="#e5e7eb" strokeWidth="2"/>
              </svg>
            </div>
          </div>
        )}

        {/* Event Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(metrics).map(([eventType, stats]) => (
            <div key={eventType} className="bg-white border rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3 capitalize">
                {eventType.replace(/_/g, ' ')}
              </h3>
              
              {/* Count */}
              <div className="text-2xl font-bold text-[#2D9A86] mb-2">
                {stats.count}
              </div>

              {/* Bar Chart */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className="bg-[#2D9A86] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getBarWidth(stats.count, maxCount)}%` }}
                ></div>
              </div>

              {/* Recent Events */}
              <div className="text-sm text-gray-600">
                Последние события:
              </div>
              <div className="space-y-1 mt-1">
                {stats.events.slice(-5).map((event, index) => (
                  <div key={index} className="text-xs text-gray-500">
                    <div className="font-mono">
                      {new Date(event.t).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                    {event.payload && Object.keys(event.payload).length > 0 && (
                      <div className="text-gray-400 truncate mt-1">
                        {JSON.stringify(event.payload).substring(0, 50)}
                        {JSON.stringify(event.payload).length > 50 && '...'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Business Insights */}
        {Object.keys(metrics).length > 0 && (
          <div className="mt-8 bg-gray-50 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Бизнес-инсайты</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Product Interest */}
              {metrics.products_view && (
                <div className="bg-white rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">Интерес к продуктам</h3>
                  <p className="text-sm text-gray-600">
                    Просмотров каталога: <span className="font-semibold">{metrics.products_view.count}</span>
                  </p>
                  {metrics.product_click && (
                    <p className="text-sm text-gray-600">
                      Кликов по продуктам: <span className="font-semibold">{metrics.product_click.count}</span>
                    </p>
                  )}
                  {metrics.product_applied && (
                    <p className="text-sm text-gray-600">
                      Заявок оформлено: <span className="font-semibold">{metrics.product_applied.count}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Goal Planning */}
              {metrics.goal_created && (
                <div className="bg-white rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">Планирование целей</h3>
                  <p className="text-sm text-gray-600">
                    Создано планов: <span className="font-semibold">{metrics.goal_created.count}</span>
                  </p>
                </div>
              )}

              {/* Engagement */}
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">Вовлеченность</h3>
                <p className="text-sm text-gray-600">
                  Общая активность: <span className="font-semibold">{totalEvents} событий</span>
                </p>
                {metrics.products_filter && (
                  <p className="text-sm text-gray-600">
                    Поисковых запросов: <span className="font-semibold">{metrics.products_filter.count}</span>
                  </p>
                )}
              </div>

              {/* Conversion Funnel */}
              {metrics.products_view && metrics.product_click && metrics.product_applied && (
                <div className="bg-white rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">Воронка конверсии</h3>
                  <p className="text-sm text-gray-600">
                    Просмотр → Клик: <span className="font-semibold">
                      {Math.round((metrics.product_click.count / metrics.products_view.count) * 100)}%
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Клик → Заявка: <span className="font-semibold">
                      {Math.round((metrics.product_applied.count / metrics.product_click.count) * 100)}%
                    </span>
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Empty State */}
        {Object.keys(metrics).length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-gray-600 mb-2">Нет данных</h2>
            <p className="text-gray-500 mb-4">
              Начните использовать Zaman AI, чтобы увидеть метрики здесь.
            </p>
            <Link
              href="/"
              className="bg-[#2D9A86] text-white px-6 py-2 rounded-lg hover:bg-[#248076] transition-colors"
            >
              Начать чат
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t p-4 mt-8">
        <div className="max-w-6xl mx-auto text-center text-gray-600 text-sm">
          Zaman AI (MVP) — demo build
        </div>
      </footer>
    </div>
  );
}
