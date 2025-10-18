'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppHeader } from '../../components/AppHeader';
import { Card, Button } from '../../components/ui';
import { saveSalaryPlan, getSalaryPlan, type SalaryPlan } from '../../lib/banking';
import { track } from '../../lib/telemetry';

export default function SalaryPlanPage() {
  const [plan, setPlan] = useState<SalaryPlan>({
    rent: 200000,
    utilities: 40000,
    transport: 50000,
    food: 80000,
    savingsGoal: 500000,
    savingsDeadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
    otherExpenses: []
  });

  const [newExpense, setNewExpense] = useState({ name: '', amount: 0 });

  useEffect(() => {
    // Load existing plan from localStorage
    const existingPlan = getSalaryPlan();
    if (existingPlan) {
      setPlan(existingPlan);
    }
  }, []);

  const handleSave = () => {
    saveSalaryPlan(plan);
    track('salary_plan_saved', plan);
    alert('План сохранен!');
  };

  const addOtherExpense = () => {
    if (newExpense.name && newExpense.amount > 0) {
      setPlan(prev => ({
        ...prev,
        otherExpenses: [...prev.otherExpenses, { ...newExpense }]
      }));
      setNewExpense({ name: '', amount: 0 });
    }
  };

  const removeOtherExpense = (index: number) => {
    setPlan(prev => ({
      ...prev,
      otherExpenses: prev.otherExpenses.filter((_, i) => i !== index)
    }));
  };

  const totalFixedExpenses = plan.rent + plan.utilities + plan.transport + plan.food + 
    plan.otherExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="min-h-screen bg-z-cloud">
      <AppHeader title="Настройка плана зарплаты" />

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="p-6">
            <h1 className="text-2xl font-semibold text-z-ink mb-2">Настройка плана зарплаты</h1>
            <p className="text-z-ink-2">
              Настройте ваши ежемесячные расходы для автоматического распределения зарплаты
            </p>
          </Card>
        </motion.div>

        {/* Fixed Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-z-ink mb-4">Основные расходы</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">
                  Аренда жилья (₸)
                </label>
                <input
                  type="number"
                  value={plan.rent}
                  onChange={(e) => setPlan(prev => ({ ...prev, rent: Number(e.target.value) }))}
                  className="w-full border border-z-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--z-green)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">
                  Коммунальные услуги (₸)
                </label>
                <input
                  type="number"
                  value={plan.utilities}
                  onChange={(e) => setPlan(prev => ({ ...prev, utilities: Number(e.target.value) }))}
                  className="w-full border border-z-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--z-green)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">
                  Транспорт (₸)
                </label>
                <input
                  type="number"
                  value={plan.transport}
                  onChange={(e) => setPlan(prev => ({ ...prev, transport: Number(e.target.value) }))}
                  className="w-full border border-z-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--z-green)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">
                  Еда (₸)
                </label>
                <input
                  type="number"
                  value={plan.food}
                  onChange={(e) => setPlan(prev => ({ ...prev, food: Number(e.target.value) }))}
                  className="w-full border border-z-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--z-green)]"
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Other Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.2 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-z-ink mb-4">Другие расходы</h2>
            
            {/* Add new expense */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">
                  Название
                </label>
                <input
                  type="text"
                  value={newExpense.name}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Например: Страхование"
                  className="w-full border border-z-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--z-green)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">
                  Сумма (₸)
                </label>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  placeholder="0"
                  className="w-full border border-z-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--z-green)]"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addOtherExpense} className="w-full">
                  Добавить
                </Button>
              </div>
            </div>

            {/* List of other expenses */}
            {plan.otherExpenses.length > 0 && (
              <div className="space-y-2">
                {plan.otherExpenses.map((expense, index) => (
                  <div key={index} className="flex items-center justify-between bg-z-muted/50 rounded-lg p-3">
                    <span className="font-medium text-z-ink">{expense.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-z-ink-2">{expense.amount.toLocaleString()} ₸</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOtherExpense(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Savings Goal */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.3 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-z-ink mb-4">Цель накоплений</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">
                  Сумма (₸)
                </label>
                <input
                  type="number"
                  value={plan.savingsGoal}
                  onChange={(e) => setPlan(prev => ({ ...prev, savingsGoal: Number(e.target.value) }))}
                  className="w-full border border-z-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--z-green)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">
                  Срок достижения
                </label>
                <input
                  type="date"
                  value={plan.savingsDeadline}
                  onChange={(e) => setPlan(prev => ({ ...prev, savingsDeadline: e.target.value }))}
                  className="w-full border border-z-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--z-green)]"
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.4 }}
        >
          <Card className="p-6 bg-[var(--z-solar)]/20">
            <h2 className="text-xl font-semibold text-z-ink mb-4">Сводка плана</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-z-ink-2">Общие фиксированные расходы:</span>
                <span className="font-semibold text-z-ink">{totalFixedExpenses.toLocaleString()} ₸</span>
              </div>
              <div className="flex justify-between">
                <span className="text-z-ink-2">Цель накоплений:</span>
                <span className="font-semibold text-z-ink">{plan.savingsGoal.toLocaleString()} ₸</span>
              </div>
              <div className="flex justify-between">
                <span className="text-z-ink-2">Срок достижения:</span>
                <span className="font-semibold text-z-ink">
                  {new Date(plan.savingsDeadline).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.5 }}
        >
          <Button onClick={handleSave} className="w-full" size="lg">
            Сохранить план
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
