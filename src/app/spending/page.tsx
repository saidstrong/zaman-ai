'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import Link from 'next/link';
import { analyzeSpending, Transaction, SpendingAnalysis } from '../../lib/spending-analysis';

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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#2D9A86] text-white p-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">Анализ расходов</h1>
          <div className="flex space-x-4">
            <Link href="/chat" className="text-white hover:text-[#EEFE6D] transition-colors">
              Чат
            </Link>
            <Link href="/home" className="text-white hover:text-[#EEFE6D] transition-colors">
              Мой банк
            </Link>
            <span className="text-[#EEFE6D]">Анализ расходов</span>
            <Link href="/products" className="text-white hover:text-[#EEFE6D] transition-colors">
              Каталог
            </Link>
            <Link href="/metrics" className="text-white hover:text-[#EEFE6D] transition-colors">
              Метрики
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* File Upload */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Загрузите CSV файл с транзакциями</h2>
          <p className="text-gray-600 mb-4">
            Поддерживаемые заголовки: date/дата, amount/сумма, merchant/место/магазин
          </p>
          
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isLoading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#2D9A86] file:text-white hover:file:bg-[#248076] disabled:opacity-50"
          />
          
          {isLoading && (
            <div className="mt-4 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#2D9A86]"></div>
              <span className="text-gray-600">Обработка файла...</span>
            </div>
          )}
          
          {error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Summary Table */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Итого по категориям</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Категория
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Сумма
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(analysis.totalsByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount]) => (
                        <tr key={category}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatAmount(amount)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monthly Analysis */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Месячная статистика</h3>
              <div className="space-y-4">
                {Object.entries(analysis.monthly)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([month, data]) => (
                    <div key={month} className="border border-gray-200 rounded p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-900">{month}</h4>
                        <span className="text-sm text-gray-600">{formatAmount(data.total)}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Топ категории: {data.topCategories.map(c => `${c.category} (${formatAmount(c.amount)})`).join(', ')}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Advice */}
            <div className="bg-[#EEFE6D] border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Рекомендации</h3>
              <ul className="space-y-2">
                {analysis.advices.map((advice, index) => (
                  <li key={index} className="text-sm text-gray-800">
                    • {advice}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
