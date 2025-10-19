'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { QrCode, Plus, ArrowRightLeft, TrendingUp, History } from 'lucide-react';
import { accounts, totalBalance, getTransactions, getSalaryPlan, calculateAllocation, getGoal, monthlySaving, assert, type Goal } from '../../lib/banking';
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
  const [salaryPlan, setSalaryPlan] = useState(getSalaryPlan());
  const [goal, setGoal] = useState<Goal | null>(null);

  useEffect(() => {
    track('home_view');
    
    try {
      // Get recent transactions
      const transactions = getTransactions().slice(-5).reverse();
      setRecentTransactions(transactions);
      
      // Reload salary plan
      setSalaryPlan(getSalaryPlan());
      
      // Load goal safely
      setGoal(getGoal());
    } catch (error) {
      console.warn('Error loading home data:', error);
    }
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
          <header className="relative rounded-2xl p-6 bg-hero noise overflow-hidden">
            <div className="relative z-10">
              <p className="text-xs text-[color:var(--z-muted)]">Мой банк</p>
              <h1 className="text-2xl font-semibold text-[color:var(--z-ink)] mt-1 tabular-nums">
                {total.toLocaleString()} <span className="opacity-70">₸</span>
              </h1>
              <p className="text-xs text-[color:var(--z-muted)]">Общий баланс</p>
              
              {/* Account chips */}
              <div className="flex flex-wrap gap-2 mt-4">
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
            </div>
            <div className="absolute right-[-8px] bottom-[-14px] w-40 h-40 opacity-80 select-none pointer-events-none"
                 aria-hidden="true">
              <Image src="/brand/shield.png" alt="" fill className="object-contain drop-shadow-md" sizes="160px" />
            </div>
          </header>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.2, delay: 0.05 }}
          className="flex justify-around gap-3"
        >
          <Link href="/pay" className="flex-1">
            <button className="w-full rounded-xl px-4 py-3 text-white bg-cta shadow-soft active:scale-[.99] transition-transform">
              <div className="flex items-center justify-center gap-2">
                <Plus size={18} />
                <span className="text-sm font-medium">Пополнить</span>
              </div>
            </button>
          </Link>
          <Link href="/pay" className="flex-1">
            <button className="w-full rounded-xl px-4 py-3 text-white bg-cta shadow-soft active:scale-[.99] transition-transform">
              <div className="flex items-center justify-center gap-2">
                <ArrowRightLeft size={18} />
                <span className="text-sm font-medium">Перевести</span>
              </div>
            </button>
          </Link>
          <button className="flex-1 rounded-xl px-4 py-3 text-white bg-cta shadow-soft active:scale-[.99] transition-transform">
            <div className="flex items-center justify-center gap-2">
              <QrCode size={18} />
              <span className="text-sm font-medium">QR</span>
            </div>
          </button>
        </motion.div>


        {/* Goal Savings Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-z-ink">Цель накоплений</h2>
              <TrendingUp size={20} className="text-[var(--z-green)]" />
            </div>
            
            {goal && goal.sum && goal.dateISO ? (
              <>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-z-ink-2">Целевая сумма</span>
                    <span className="font-semibold text-z-ink tabular-nums">
                      {goal.sum.toLocaleString()} ₸
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-z-ink-2">Ежемесячно</span>
                    <span className="font-semibold text-z-ink tabular-nums">
                      {assert(monthlySaving(goal), 0).toLocaleString()} ₸
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-z-ink-2">Срок</span>
                    <span className="font-semibold text-z-ink">
                      {new Date(goal.dateISO).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
                
                <Button variant="secondary" className="w-full">
                  Изменить цель
                </Button>
              </>
            ) : (
              <>
                <div className="text-center py-6">
                  <div className="text-sm text-z-ink-2 mb-4">
                    Цель накоплений не настроена. Укажите сумму и дату, чтобы рассчитать ежемесячный план.
                  </div>
                  <Button variant="secondary" className="w-full">
                    Настроить цель
                  </Button>
                </div>
              </>
            )}
          </Card>
        </motion.div>

        {/* AI Allocation Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <section className="relative mt-4 rounded-2xl bg-white/85 backdrop-blur-md shadow-card border border-white/70 p-6">
            <div className="absolute right-2 top-1 w-16 h-16 opacity-70" aria-hidden="true">
              <Image src="/brand/coins.jpg" alt="" fill className="object-contain" sizes="64px" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-z-ink">ИИ-распределение</h2>
              <TrendingUp size={20} className="text-[var(--z-green)]" />
            </div>
            
            {salaryPlan ? (
              <>
                <div className="space-y-3 mb-4">
                  {(() => {
                    try {
                      const allocation = calculateAllocation(salaryPlan);
                      return Object.entries(allocation.categories)
                        .filter(([, data]) => data.amount > 0)
                        .slice(0, 4)
                        .map(([key, data]) => (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-z-ink-2">
                              {key === 'rent' ? 'Аренда' :
                               key === 'utilities' ? 'Ком. услуги' :
                               key === 'transport' ? 'Транспорт' :
                               key === 'food' ? 'Еда' :
                               key === 'savings' ? 'Накопления' :
                               key === 'other' ? 'Прочее' :
                               key === 'buffer' ? 'Буфер' : key}
                            </span>
                            <span className="font-semibold text-z-ink tabular-nums">
                              {data.amount.toLocaleString()} ₸
                            </span>
                          </div>
                        ));
                    } catch (error) {
                      console.warn('Error calculating allocation:', error);
                      return (
                        <div className="text-center py-4">
                          <p className="text-z-ink-2 text-sm">Ошибка расчета распределения</p>
                        </div>
                      );
                    }
                  })()}
                </div>
                
                <Link href="/salary-plan">
                  <Button variant="secondary" className="w-full">
                    Настроить план
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <div className="text-center py-6">
                  <TrendingUp size={32} className="mx-auto text-z-ink-2 mb-2" />
                  <p className="text-z-ink-2">ИИ-распределение не настроено</p>
                </div>
                
                <Link href="/salary-plan">
                  <Button variant="secondary" className="w-full">
                    Настроить
                  </Button>
                </Link>
              </>
            )}
          </section>
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
