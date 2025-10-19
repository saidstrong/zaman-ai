'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { QrCode, Plus, ArrowRightLeft, TrendingUp, History } from 'lucide-react';
import { accounts, totalBalance, getTransactions } from '../../lib/banking';
import { track } from '../../lib/telemetry';
import { Card, Button } from '../../components/ui';

export default function HomeMobilePage() {
  const [userAccounts] = useState(accounts);
  const [recentTransactions, setRecentTransactions] = useState<Array<{
    date: string;
    amount: number;
    merchant: string;
    category?: string;
  }>>([]);

  useEffect(() => {
    track('home_view');
    
    // Get recent transactions
    const transactions = getTransactions().slice(-5).reverse();
    setRecentTransactions(transactions);
  }, []);

  const total = totalBalance();

  return (
    <div className="min-h-screen bg-z-muted">
      {/* Header */}
      <div className="bg-white border-b border-z-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-z-ink">Мой банк</h1>
            <p className="text-sm text-z-ink-2">Добро пожаловать!</p>
          </div>
          <div className="w-10 h-10 bg-[var(--z-green)] rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">А</span>
          </div>
        </div>
      </div>

      <main className="p-4 space-y-4">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="p-6 bg-gradient-to-br from-[var(--z-green)]/10 to-[var(--z-solar)]/20">
            <h2 className="text-lg font-semibold text-z-ink mb-4">Баланс</h2>
            
            <div className="mb-6">
              <div className="text-2xl font-bold text-z-ink tabular-nums">
                {total.toLocaleString()} ₸
              </div>
              <div className="text-sm text-z-ink-2 mt-1">Общий баланс</div>
            </div>

            {/* Account chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {userAccounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2"
                >
                  <div className="text-xs text-z-ink-2">{account.name}</div>
                  <div className="text-sm font-semibold text-z-ink tabular-nums">
                    {account.balance.toLocaleString()} ₸
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
              <Link href="/pay">
                <Button className="w-full py-3 text-sm">
                  <Plus size={16} className="mr-1" />
                  Пополнить
                </Button>
              </Link>
              <Link href="/pay">
                <Button className="w-full py-3 text-sm">
                  <ArrowRightLeft size={16} className="mr-1" />
                  Перевести
                </Button>
              </Link>
              <Button variant="secondary" className="w-full py-3 text-sm">
                <QrCode size={16} className="mr-1" />
                QR
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* AI Allocation Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-z-ink">ИИ-распределение</h2>
              <TrendingUp size={20} className="text-[var(--z-green)]" />
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-z-ink-2">Аренда жилья</span>
                <span className="font-semibold text-z-ink tabular-nums">200 000 ₸</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-z-ink-2">Ком. услуги</span>
                <span className="font-semibold text-z-ink tabular-nums">40 000 ₸</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-z-ink-2">Еда</span>
                <span className="font-semibold text-z-ink tabular-nums">90 000 ₸</span>
              </div>
              <div className="flex justify-between items-center bg-[var(--z-solar)]/25 rounded-lg px-3 py-2">
                <span className="text-z-ink-2">Остаток в сбережения</span>
                <span className="font-semibold text-z-ink tabular-nums">270 000 ₸</span>
              </div>
            </div>
            
            <Link href="/salary-plan">
              <Button variant="secondary" className="w-full">
                Открыть план
              </Button>
            </Link>
          </Card>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-z-ink">Последние операции</h2>
              <Link href="/spending">
                <Button variant="ghost" size="sm">
                  <History size={16} className="mr-1" />
                  Все
                </Button>
              </Link>
            </div>
            
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <div className="font-medium text-z-ink text-sm">
                        {transaction.merchant}
                      </div>
                      <div className="text-xs text-z-ink-2">
                        {new Date(transaction.date).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className={`font-semibold tabular-nums ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-z-ink'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()} ₸
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <History size={32} className="mx-auto text-z-ink-2 mb-2" />
                <p className="text-z-ink-2">Нет операций</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Quick Access */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.3 }}
        >
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-z-ink mb-4">Быстрый доступ</h2>
            
            <div className="grid grid-cols-2 gap-3">
              <Link href="/products">
                <Button variant="secondary" className="w-full py-4">
                  <div className="text-center">
                    <div className="text-sm font-medium">Продукты</div>
                    <div className="text-xs text-z-ink-2 mt-1">Кредиты и карты</div>
                  </div>
                </Button>
              </Link>
              
              <Link href="/spending">
                <Button variant="secondary" className="w-full py-4">
                  <div className="text-center">
                    <div className="text-sm font-medium">Аналитика</div>
                    <div className="text-xs text-z-ink-2 mt-1">Расходы и статистика</div>
                  </div>
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
