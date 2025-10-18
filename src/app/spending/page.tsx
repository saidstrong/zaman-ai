'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { motion } from 'framer-motion';
import { analyzeSpending, Transaction, SpendingAnalysis } from '../../lib/spending-analysis';
import { AppHeader } from '../../components/AppHeader';
import { Card } from '../../components/ui';

export default function SpendingPage() {
  const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeHeaders = (headers: string[]): string[] => {
    return headers.map(header => {
      const lower = header.toLowerCase().trim();
      if (lower.includes('date') || lower.includes('дата')) return 'date';
      if (lower.includes('amount') || lower.includes('сумма')) return 'amount';
      if (lower.includes('merchant') || lower.includes('место') || lower.includes('магазин')) return 'merchant';
      if (lower.includes('category') || lower.includes('категория')) return 'category';
      return header;
    });
  };

  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return '';
    
    // Handle formats like "17.10.25" or "17.10.2025"
    const dotMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (dotMatch) {
      const [, day, month, year] = dotMatch;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Handle formats like "2025-10-17" (already correct)
    const dashMatch = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
    if (dashMatch) {
      return dateStr;
    }
    
    // Handle formats like "10/17/2025" or "17/10/2025"
    const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const [, first, second, year] = slashMatch;
      // Assume MM/DD/YYYY format for now
      return `${year}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`;
    }
    
    return dateStr;
  };

  const normalizeAmount = (amountStr: string): number => {
    if (!amountStr) return 0;
    
    // Remove spaces and replace comma with dot
    const cleaned = amountStr.toString().replace(/\s/g, '').replace(',', '.');
    
    // Parse as float
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            throw new Error('Ошибка при парсинге CSV файла');
          }

          const data = results.data as Record<string, string>[];
          if (data.length === 0) {
            throw new Error('Файл пустой или не содержит данных');
          }

          // Normalize headers
          const originalHeaders = Object.keys(data[0]);
          const normalizedHeaders = normalizeHeaders(originalHeaders);
          
          // Check if category column exists
          const hasCategoryColumn = normalizedHeaders.includes('category');
          
          // Transform data to our Transaction format
          const transactions: Transaction[] = data.map(row => {
            const normalizedRow: Record<string, string> = {};
            originalHeaders.forEach((header, index) => {
              normalizedRow[normalizedHeaders[index]] = row[header];
            });

            return {
              date: normalizeDate(normalizedRow.date || ''),
              amount: normalizeAmount(normalizedRow.amount || '0'),
              merchant: normalizedRow.merchant || '',
              category: hasCategoryColumn ? (normalizedRow.category || '').trim() : ''
            };
          }).filter(t => t.date && t.amount !== 0);

          if (transactions.length === 0) {
            throw new Error('Не найдено валидных транзакций в файле');
          }

          const spendingAnalysis = analyzeSpending(transactions, hasCategoryColumn);
          setAnalysis(spendingAnalysis);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Произошла ошибка при обработке файла');
        } finally {
          setIsLoading(false);
        }
      },
      error: (error) => {
        setError('Ошибка при чтении файла: ' + error.message);
        setIsLoading(false);
      }
    });
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ru-RU', { 
      style: 'currency', 
      currency: 'KZT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  return (
    <div className="min-h-screen bg-z-cloud">
      <AppHeader title="Анализ расходов" />

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* File Upload */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="p-5 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-3 text-z-ink">Загрузите CSV файл с транзакциями</h2>
            <p className="text-z-ink-2 mb-4">
              Поддерживаемые заголовки: date/дата, amount/сумма, merchant/место/магазин
            </p>
            
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isLoading}
              className="block w-full text-sm text-z-ink-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--z-green)] file:text-white hover:file:bg-[var(--z-green-600)] disabled:opacity-50"
            />
            
            {isLoading && (
              <div className="mt-4 flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--z-green)]"></div>
                <span className="text-z-ink-2">Обработка файла...</span>
              </div>
            )}
            
            {error && (
              <Card className="mt-4 p-4 bg-red-50 border-red-200">
                <div className="text-red-700 text-sm">{error}</div>
              </Card>
            )}
          </Card>
        </motion.div>

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Summary Table */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
            >
              <Card className="p-5 md:p-6">
                <h3 className="text-lg md:text-xl font-semibold mb-3 text-z-ink">Итого по категориям</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-z-border">
                    <thead className="bg-z-muted">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-z-ink-2 uppercase tracking-wider">
                          Категория
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-z-ink-2 uppercase tracking-wider">
                          Сумма
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-z-border">
                      {Object.entries(analysis.totalsByCategory)
                        .sort(([, a], [, b]) => b - a)
                        .map(([category, amount], index) => (
                          <tr key={category} className={index % 2 === 0 ? 'bg-z-muted/30' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-z-ink">
                              {category}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-z-ink tabular-nums">
                              {formatAmount(amount)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>

            {/* Monthly Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.2 }}
            >
              <Card className="p-5 md:p-6">
                <h3 className="text-lg md:text-xl font-semibold mb-3 text-z-ink">Месячная статистика</h3>
                <div className="space-y-4">
                  {Object.entries(analysis.monthly)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([month, data], index) => (
                      <motion.div
                        key={month}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.1 }}
                        className="border border-z-border rounded-xl p-4 bg-z-muted/30"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-z-ink">{month}</h4>
                          <span className="text-sm text-z-ink-2 tabular-nums">{formatAmount(data.total)}</span>
                        </div>
                        <div className="text-sm text-z-ink-2">
                          Топ категории: {data.topCategories.map(c => `${c.category} (${formatAmount(c.amount)})`).join(', ')}
                        </div>
                      </motion.div>
                    ))}
                </div>
              </Card>
            </motion.div>

            {/* Advice */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.3 }}
            >
              <Card className="p-5 md:p-6 bg-[var(--z-solar)]/50 border-[var(--z-solar)]">
                <h3 className="text-lg md:text-xl font-semibold mb-3 text-z-ink">Рекомендации</h3>
                <ul className="space-y-2">
                  {analysis.advices.map((advice, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: 0.3 + index * 0.1 }}
                      className="text-sm text-z-ink"
                    >
                      • {advice}
                    </motion.li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
