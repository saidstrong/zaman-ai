'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { accounts, totalBalance, allocateSalary, simulateInvestment, type Account, type AllocationPlan, type Instrument, type InvestResult } from '../../lib/banking';
import { track } from '../../lib/telemetry';
import ConfirmModal from '../../components/ConfirmModal';
import { VoiceController } from '../../lib/voice';
import { AppHeader } from '../../components/AppHeader';
import { Card, Button, Badge, Stat, Progress, Pill } from '../../components/ui';

export default function HomePage() {
  const [userAccounts, setUserAccounts] = useState<Account[]>(accounts);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [voiceController] = useState(() => new VoiceController());
  const [isListening, setIsListening] = useState<boolean>(false);
  
  // Modal states
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    biometryHint?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  // AI Allocation states
  const [salary, setSalary] = useState<number>(600000);
  const [allocationPlan, setAllocationPlan] = useState<AllocationPlan | null>(null);

  // Investment states
  const [investmentAmount, setInvestmentAmount] = useState<number>(100000);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument>('sukuk');
  const [investmentResult, setInvestmentResult] = useState<InvestResult | null>(null);

  useEffect(() => {
    // Load voice setting from localStorage
    const savedVoiceEnabled = localStorage.getItem('voice_enabled');
    if (savedVoiceEnabled !== null) {
      setVoiceEnabled(savedVoiceEnabled === 'true');
    }

    // Track page view
    track('home_view', { timestamp: Date.now() });
  }, []);

  const handleTopup = () => {
    setModal({
      isOpen: true,
      title: 'Пополнение счета',
      description: 'Пополнить карту на 10,000 ₸?',
      onConfirm: () => {
        const cardAccount = userAccounts.find(a => a.type === 'card');
        if (cardAccount) {
          cardAccount.balance += 10000;
          setUserAccounts([...userAccounts]);
          track('topup', { amount: 10000, account: 'card' });
        }
        setModal({ isOpen: false, title: '', description: '', onConfirm: () => {} });
      }
    });
  };

  const handleTransfer = () => {
    setModal({
      isOpen: true,
      title: 'Перевод средств',
      description: 'Перевести 10,000 ₸ с карты на сберегательный счет?',
      biometryHint: true,
      onConfirm: () => {
        const cardAccount = userAccounts.find(a => a.type === 'card');
        const savingsAccount = userAccounts.find(a => a.type === 'savings');
        if (cardAccount && savingsAccount) {
          cardAccount.balance -= 10000;
          savingsAccount.balance += 10000;
          setUserAccounts([...userAccounts]);
          track('transfer', { amount: 10000, from: 'card', to: 'savings' });
        }
        setModal({ isOpen: false, title: '', description: '', onConfirm: () => {} });
      }
    });
  };

  const handleAllocateSalary = () => {
    const result = allocateSalary(salary);
    setAllocationPlan(result);
    track('ai_allocation_plan', { salary, plan: result });
  };

  const handleApplyPlan = () => {
    if (allocationPlan) {
      const savingsAccount = userAccounts.find(a => a.type === 'savings');
      if (savingsAccount) {
        savingsAccount.balance += allocationPlan.toSavings;
        setUserAccounts([...userAccounts]);
        track('ai_allocation_applied', { 
          salary, 
          toSavings: allocationPlan.toSavings,
          plan: allocationPlan.plan 
        });
        alert('План применён!');
      }
    }
  };

  const handleSimulateInvestment = () => {
    const result = simulateInvestment(investmentAmount, selectedInstrument);
    setInvestmentResult(result);
    track('invest_simulate', { 
      amount: investmentAmount, 
      instrument: selectedInstrument,
      result 
    });
  };

  const handleApplyInvestment = () => {
    setModal({
      isOpen: true,
      title: 'Оформление инвестиции',
      description: `Оформить инвестицию в ${getInstrumentName(selectedInstrument)} на сумму ${investmentAmount.toLocaleString()} ₸?`,
      biometryHint: true,
      onConfirm: () => {
        track('invest_apply', { 
          amount: investmentAmount, 
          instrument: selectedInstrument 
        });
        setModal({ isOpen: false, title: '', description: '', onConfirm: () => {} });
        alert('Инвестиционная программа оформлена!');
      }
    });
  };

  const getInstrumentName = (instrument: Instrument): string => {
    const names = {
      'sukuk': 'Сукук',
      'halal_equities': 'Halal-акции',
      'gold': 'Золото',
      'crypto': 'Крипто'
    };
    return names[instrument];
  };

  // Event handlers with proper types
  const onSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSalary(Number(e.target.value || 0));
  };

  const onInvestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInvestmentAmount(Number(e.target.value || 0));
  };

  const handleVoiceCommand = (command: { action: string; amount?: number; target?: string }) => {
    if (command.action === 'topup' && command.amount) {
      const amount = command.amount;
      setModal({
        isOpen: true,
        title: 'Пополнение счета',
        description: `Пополнить карту на ${amount.toLocaleString()} ₸?`,
        onConfirm: () => {
          const cardAccount = userAccounts.find(a => a.type === 'card');
          if (cardAccount) {
            cardAccount.balance += amount;
            setUserAccounts([...userAccounts]);
            track('topup', { amount, account: 'card', source: 'voice' });
          }
          setModal({ isOpen: false, title: '', description: '', onConfirm: () => {} });
        }
      });
    } else if (command.action === 'transfer' && command.amount) {
      const amount = command.amount;
      setModal({
        isOpen: true,
        title: 'Перевод средств',
        description: `Перевести ${amount.toLocaleString()} ₸ на ${command.target}?`,
        biometryHint: true,
        onConfirm: () => {
          // Implement transfer logic
          setModal({ isOpen: false, title: '', description: '', onConfirm: () => {} });
        }
      });
    }
  };

  const startVoiceListening = () => {
    if (!voiceController.isSupported()) {
      alert('Голосовое управление недоступно в вашем браузере');
      return;
    }

    setIsListening(true);
    voiceController.startListening(
      (command) => {
        setIsListening(false);
        handleVoiceCommand(command);
      },
      (error) => {
        setIsListening(false);
        alert(error);
      }
    );
  };

  const toggleVoice = () => {
    const newVoiceEnabled = !voiceEnabled;
    setVoiceEnabled(newVoiceEnabled);
    localStorage.setItem('voice_enabled', newVoiceEnabled.toString());
  };

  return (
    <div className="min-h-screen bg-z-cloud">
      <AppHeader 
        title="Zaman AI — Мой банк"
        showVoiceToggle={true}
        voiceEnabled={voiceEnabled}
        onToggleVoice={toggleVoice}
        showDemoBadge={process.env.NEXT_PUBLIC_DEMO_MODE === '1'}
      />

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Total Balance Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="bg-gradient-to-br from-[var(--z-green)]/10 to-[var(--z-solar)]/20 p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-4 text-z-ink">Итого</h2>
            <div className="text-4xl font-semibold tracking-tight text-[var(--z-green)] mb-6">
              {totalBalance().toLocaleString()}
              <span className="opacity-70"> ₸</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {userAccounts.map((account, index) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.1 }}
                  className="bg-white/80 rounded-xl p-4 shadow-sm hover:translate-y-[-1px] transition-transform"
                >
                  <div className="text-sm text-z-ink-2 mb-1">{account.name}</div>
                  <div className="font-semibold tabular-nums text-z-ink">{account.balance.toLocaleString()} ₸</div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
        >
          <Card className="p-5 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-3 text-z-ink">Быстрые действия</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Button onClick={handleTopup} className="w-full">
                  Пополнить
                </Button>
                <p className="text-xs text-z-ink-2 text-center">Добавить средства</p>
              </div>
              <div className="space-y-2">
                <Button onClick={handleTransfer} className="w-full">
                  Перевести
                </Button>
                <p className="text-xs text-z-ink-2 text-center">Между счетами</p>
              </div>
              <div className="space-y-2">
                <Button variant="secondary" asChild className="w-full">
                  <Link href="/spending">Анализ расходов</Link>
                </Button>
                <p className="text-xs text-z-ink-2 text-center">Просмотр трат</p>
              </div>
              <div className="space-y-2">
                <Button variant="secondary" asChild className="w-full">
                  <Link href="/products">Каталог продуктов</Link>
                </Button>
                <p className="text-xs text-z-ink-2 text-center">Банковские продукты</p>
              </div>
            </div>
            
            {/* Voice Control */}
            {voiceEnabled && (
              <div className="pt-4 border-t border-z-border">
                <Button
                  variant="ghost"
                  onClick={startVoiceListening}
                  disabled={isListening}
                  className={`w-full ${isListening ? 'animate-pulse' : ''}`}
                >
                  {isListening ? '🎤 Слушаю...' : '🎤 Голосовое управление'}
                </Button>
              </div>
            )}
          </Card>
        </motion.div>

        {/* AI Salary Allocation */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.2 }}
        >
          <Card className="p-5 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-3 text-z-ink">ИИ распределение зарплаты</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">
                  Сумма зарплаты
                </label>
                <input
                  type="number"
                  value={salary}
                  onChange={onSalaryChange}
                  className="w-full border border-z-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white"
                />
              </div>
              <Button onClick={handleAllocateSalary}>
                Распределить
              </Button>
            
            {allocationPlan && (
              <div className="mt-6 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-z-border">
                        <th className="text-left py-3 font-semibold text-z-ink">Категория</th>
                        <th className="text-right py-3 font-semibold text-z-ink">Сумма</th>
                        <th className="text-center py-3 font-semibold text-z-ink">Тип</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(allocationPlan.plan).map(([key, item], index) => (
                        <tr key={key} className={`border-b border-z-border ${index % 2 === 0 ? 'bg-z-muted/30' : ''}`}>
                          <td className="py-3 text-z-ink-2">{item.title}</td>
                          <td className="text-right py-3 font-medium tabular-nums text-z-ink">{item.allocated.toLocaleString()} ₸</td>
                          <td className="text-center py-3">
                            <Pill variant={item.type === 'fixed' ? 'default' : 'info'} size="sm">
                              {item.type === 'fixed' ? 'фикс' : '%'}
                            </Pill>
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold bg-[var(--z-solar)]/25">
                        <td className="py-3 text-z-ink">В сбережения</td>
                        <td className="text-right py-3 tabular-nums text-z-ink">{allocationPlan.toSavings.toLocaleString()} ₸</td>
                        <td className="text-center py-3">
                          <Pill variant="warning" size="sm">остаток</Pill>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Progress visualization */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-z-ink-2">Распределение по категориям:</div>
                  {Object.entries(allocationPlan.plan).map(([key, item]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-xs text-z-ink-2">
                        <span>{item.title}</span>
                        <span>{Math.round((item.allocated / salary) * 100)}%</span>
                      </div>
                      <Progress value={item.allocated} max={salary} className="h-1" />
                    </div>
                  ))}
                </div>
                
                <Button variant="secondary" onClick={handleApplyPlan} className="w-full">
                  Применить план
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Halal Investment */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.3 }}
        >
          <Card className="p-5 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-3 text-z-ink">Halal-инвест (симуляция)</h2>
            
            {/* Disclaimer */}
            <Card className="bg-yellow-50 border border-yellow-200 p-4 mb-4">
              <div className="flex items-start space-x-2">
                <div className="text-yellow-600 text-lg">⚠️</div>
                <div className="text-sm text-yellow-900">
                  <strong>Симуляция.</strong> Только халяль-совместимые активы; доход не гарантирован. Комиссия банка 0.1%.
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">
                  Сумма
                </label>
                <input
                  type="number"
                  value={investmentAmount}
                  onChange={onInvestChange}
                  className="w-full border border-z-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-z-ink-2 mb-2">
                  Инструмент
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['sukuk', 'halal_equities', 'gold', 'crypto'] as Instrument[]).map(instrument => (
                    <Button
                      key={instrument}
                      variant={selectedInstrument === instrument ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedInstrument(instrument)}
                      className="w-full"
                    >
                      {getInstrumentName(instrument)}
                      {instrument === 'crypto' && ' *'}
                    </Button>
                  ))}
                </div>
              </div>
              
              <Button onClick={handleSimulateInvestment}>
                Смоделировать
              </Button>
            
            {investmentResult && (
              <Card className="mt-4 p-4 bg-z-muted/50">
                <h3 className="font-semibold mb-3 text-z-ink">Результат симуляции</h3>
                <div className="space-y-3 text-sm">
                  <Stat label="Комиссия банка" value={`${investmentResult.fee.toLocaleString()} ₸ (0.1%)`} />
                  <Stat label="Ожидаемая стоимость через 12 мес" value={`${investmentResult.projected.toLocaleString()} ₸`} />
                  <div className={`font-semibold text-center p-2 rounded-lg ${
                    investmentResult.return >= 0 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                  }`}>
                    Доходность: {investmentResult.return >= 0 ? '+' : ''}{investmentResult.returnPercent}%
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleApplyInvestment}
                  className="mt-4 w-full"
                >
                  Оформить программу
                </Button>
              </Card>
            )}
            </div>
          </Card>
        </motion.div>
      </main>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, title: '', description: '', onConfirm: () => {} })}
        onConfirm={modal.onConfirm}
        title={modal.title}
        description={modal.description}
        biometryHint={modal.biometryHint}
      />
    </div>
  );
}
