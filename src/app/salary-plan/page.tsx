'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { track } from '../../lib/telemetry';
import { Card, Button, ChartMini } from '../../components/ui';
import { SalaryPlan, calculateAllocation, saveSalaryPlan, getSalaryPlan, type AllocationResult } from '../../lib/banking';

const COLORS = {
  rent: '#EF4444',
  utilities: '#F59E0B', 
  transport: '#3B82F6',
  food: '#10B981',
  savings: '#8B5CF6',
  other: '#6B7280',
  buffer: '#F3F4F6'
};

export default function SalaryPlanPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<SalaryPlan>({
    salary: 600000,
    rent: 200000,
    utilities: 40000,
    transport: 30000,
    food: 90000,
    savings: 100000,
    other: [],
    lastUpdated: new Date().toISOString()
  });
  
  const [allocation, setAllocation] = useState<AllocationResult | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedPlan = getSalaryPlan();
    if (savedPlan) {
      setPlan(savedPlan);
    }
    track('salary_plan_view');
  }, []);

  const handleChange = (field: keyof SalaryPlan, value: number | string) => {
    setPlan(prev => ({
      ...prev,
      [field]: value,
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleOtherChange = (index: number, field: 'label' | 'amount', value: string | number) => {
    setPlan(prev => ({
      ...prev,
      other: prev.other.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
      lastUpdated: new Date().toISOString()
    }));
  };

  const addOtherExpense = () => {
    setPlan(prev => ({
      ...prev,
      other: [...prev.other, { label: '', amount: 0 }],
      lastUpdated: new Date().toISOString()
    }));
  };

  const removeOtherExpense = (index: number) => {
    setPlan(prev => ({
      ...prev,
      other: prev.other.filter((_, i) => i !== index),
      lastUpdated: new Date().toISOString()
    }));
  };

  const calculateDistribution = () => {
    const result = calculateAllocation(plan);
    setAllocation(result);
    
    if (!result.isValid && result.error) {
      alert(result.error);
    }
    
    track('salary_allocation_calculated', { 
      salary: plan.salary, 
      isValid: result.isValid 
    });
  };

  const savePlan = () => {
    saveSalaryPlan(plan);
    track('salary_plan_saved', { 
      salary: plan.salary,
      categories: Object.keys(plan).length 
    });
    alert('План сохранен!');
    router.push('/home');
  };

  const getChartData = () => {
    if (!allocation) return [];
    
    return Object.entries(allocation.categories)
      .filter(([, data]) => data.amount > 0)
      .map(([key, data]) => ({
        label: key,
        value: data.amount,
        percentage: data.percentage,
        color: COLORS[key as keyof typeof COLORS] || '#6B7280'
      }));
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-z-muted flex items-center justify-center">
        <div className="text-z-ink-2">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-z-muted">
      {/* Header */}
      <div className="pt-4 px-4">
        <h1 className="text-2xl font-bold text-z-ink">Настройка плана зарплаты</h1>
        <p className="text-z-ink-2 mt-1">ИИ поможет распределить ваш доход</p>
      </div>

      <main className="p-4 space-y-4">
        {/* Salary Input */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-z-ink mb-4">Зарплата</h2>
            <input
              type="number"
              value={plan.salary}
              onChange={(e) => handleChange('salary', Number(e.target.value))}
              className="w-full p-4 border border-z-border rounded-xl text-2xl font-semibold text-z-ink tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white"
              placeholder="Введите сумму зарплаты"
            />
          </Card>
        </motion.div>

        {/* Fixed Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-z-ink mb-4">Обязательные расходы</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">Аренда жилья (₸)</label>
                <input
                  type="number"
                  value={plan.rent}
                  onChange={(e) => handleChange('rent', Number(e.target.value))}
                  className="w-full p-3 border border-z-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white tabular-nums"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">Коммунальные услуги (₸)</label>
                <input
                  type="number"
                  value={plan.utilities}
                  onChange={(e) => handleChange('utilities', Number(e.target.value))}
                  className="w-full p-3 border border-z-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white tabular-nums"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">Транспорт (₸)</label>
                <input
                  type="number"
                  value={plan.transport}
                  onChange={(e) => handleChange('transport', Number(e.target.value))}
                  className="w-full p-3 border border-z-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white tabular-nums"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">Еда (₸)</label>
                <input
                  type="number"
                  value={plan.food}
                  onChange={(e) => handleChange('food', Number(e.target.value))}
                  className="w-full p-3 border border-z-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white tabular-nums"
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Savings Goal */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        >
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-z-ink mb-4">Цель накоплений</h2>
            <div>
              <label className="block text-sm font-medium text-z-ink-2 mb-2">Сумма (₸)</label>
              <input
                type="number"
                value={plan.savings}
                onChange={(e) => handleChange('savings', Number(e.target.value))}
                className="w-full p-3 border border-z-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white tabular-nums"
              />
            </div>
          </Card>
        </motion.div>

        {/* Other Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-z-ink">Прочие расходы</h2>
              <Button onClick={addOtherExpense} size="sm">Добавить</Button>
            </div>
            
            <div className="space-y-3">
              {plan.other.map((expense, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={expense.label}
                    onChange={(e) => handleOtherChange(index, 'label', e.target.value)}
                    placeholder="Название"
                    className="flex-1 p-3 border border-z-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white"
                  />
                  <input
                    type="number"
                    value={expense.amount}
                    onChange={(e) => handleOtherChange(index, 'amount', Number(e.target.value))}
                    placeholder="Сумма"
                    className="w-24 p-3 border border-z-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white tabular-nums"
                  />
                  <Button 
                    onClick={() => removeOtherExpense(index)}
                    variant="ghost" 
                    size="sm"
                  >
                    🗑️
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Calculate Button */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.4 }}
        >
          <Button onClick={calculateDistribution} className="w-full py-4 text-lg">
            Рассчитать распределение
          </Button>
        </motion.div>

        {/* Allocation Results */}
        {allocation && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-z-ink mb-4">Распределение</h2>
              
              <div className="flex items-center justify-center mb-6">
                <ChartMini data={getChartData()} />
              </div>
              
              <div className="space-y-3">
                {Object.entries(allocation.categories).map(([key, data]) => (
                  data.amount > 0 && (
                    <div key={key} className="flex justify-between items-center p-3 bg-z-muted/50 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[key as keyof typeof COLORS] }}
                        />
                        <span className="font-medium text-z-ink capitalize">
                          {key === 'rent' ? 'Аренда' :
                           key === 'utilities' ? 'Комуслуги' :
                           key === 'transport' ? 'Транспорт' :
                           key === 'food' ? 'Еда' :
                           key === 'savings' ? 'Накопления' :
                           key === 'other' ? 'Прочее' :
                           key === 'buffer' ? 'Буфер' : key}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-z-ink tabular-nums">
                          {data.amount.toLocaleString()} ₸
                        </div>
                        <div className="text-sm text-z-ink-2 tabular-nums">
                          {data.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Save Button */}
        {allocation && allocation.isValid && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Button onClick={savePlan} className="w-full py-4 text-lg">
              Сохранить план
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}