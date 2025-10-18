'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { accounts, totalBalance, allocateSalary, simulateInvestment, type InvestmentInstrument } from '../../lib/banking';
import { track } from '../../lib/telemetry';
import ConfirmModal from '../../components/ConfirmModal';
import { VoiceController } from '../../lib/voice';

export default function HomePage() {
  const [userAccounts, setUserAccounts] = useState(accounts);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceController] = useState(() => new VoiceController());
  const [isListening, setIsListening] = useState(false);
  
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
  const [salary, setSalary] = useState(600000);
  const [allocationPlan, setAllocationPlan] = useState<any>(null);

  // Investment states
  const [investmentAmount, setInvestmentAmount] = useState(100000);
  const [selectedInstrument, setSelectedInstrument] = useState<InvestmentInstrument>('sukuk');
  const [investmentResult, setInvestmentResult] = useState<any>(null);

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

  const getInstrumentName = (instrument: InvestmentInstrument): string => {
    const names = {
      'sukuk': 'Сукук',
      'halal-stocks': 'Halal-акции',
      'gold': 'Золото',
      'crypto': 'Крипто'
    };
    return names[instrument];
  };

  const handleVoiceCommand = (command: any) => {
    if (command.action === 'topup' && command.amount) {
      setModal({
        isOpen: true,
        title: 'Пополнение счета',
        description: `Пополнить карту на ${command.amount.toLocaleString()} ₸?`,
        onConfirm: () => {
          const cardAccount = userAccounts.find(a => a.type === 'card');
          if (cardAccount) {
            cardAccount.balance += command.amount;
            setUserAccounts([...userAccounts]);
            track('topup', { amount: command.amount, account: 'card', source: 'voice' });
          }
          setModal({ isOpen: false, title: '', description: '', onConfirm: () => {} });
        }
      });
    } else if (command.action === 'transfer' && command.amount) {
      setModal({
        isOpen: true,
        title: 'Перевод средств',
        description: `Перевести ${command.amount.toLocaleString()} ₸ на ${command.target}?`,
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#2D9A86] text-white p-4 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold">Zaman AI — Мой банк</h1>
              {process.env.NEXT_PUBLIC_DEMO_MODE === '1' && (
                <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-medium">
                  DEMO
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleVoice}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  voiceEnabled 
                    ? 'bg-[#EEFE6D] text-[#2D9A86]' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                🎤 Голос
              </button>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-lg">
                🧑‍🟩
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-50 border-b p-4">
        <div className="max-w-6xl mx-auto flex space-x-4">
          <Link href="/chat" className="text-[#2D9A86] hover:text-[#248076] font-medium">
            Чат
          </Link>
          <span className="text-gray-600 font-medium">Мой банк</span>
          <Link href="/spending" className="text-[#2D9A86] hover:text-[#248076] font-medium">
            Анализ расходов
          </Link>
          <Link href="/products" className="text-[#2D9A86] hover:text-[#248076] font-medium">
            Каталог
          </Link>
          <Link href="/metrics" className="text-[#2D9A86] hover:text-[#248076] font-medium">
            Метрики
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Total Balance */}
        <div className="bg-gradient-to-br from-[#2D9A86]/10 to-[#EEFE6D]/10 rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Итого</h2>
          <div className="text-3xl font-bold text-[#2D9A86] mb-4">
            {totalBalance().toLocaleString()} ₸
          </div>
          <div className="grid grid-cols-3 gap-4">
            {userAccounts.map(account => (
              <div key={account.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">{account.name}</div>
                <div className="font-semibold">{account.balance.toLocaleString()} ₸</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Быстрые действия</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={handleTopup}
              className="bg-[#2D9A86] text-white rounded-2xl px-4 py-2 hover:opacity-90 transition"
            >
              Пополнить
            </button>
            <button
              onClick={handleTransfer}
              className="bg-[#2D9A86] text-white rounded-2xl px-4 py-2 hover:opacity-90 transition"
            >
              Перевести
            </button>
            <Link
              href="/spending"
              className="bg-[#EEFE6D] text-gray-900 rounded-2xl px-4 py-2 hover:opacity-90 transition text-center"
            >
              Анализ расходов
            </Link>
            <Link
              href="/products"
              className="bg-[#EEFE6D] text-gray-900 rounded-2xl px-4 py-2 hover:opacity-90 transition text-center"
            >
              Каталог продуктов
            </Link>
          </div>
          
          {/* Voice Control */}
          {voiceEnabled && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={startVoiceListening}
                disabled={isListening}
                className={`bg-gray-100 text-gray-700 rounded-2xl px-4 py-2 transition ${
                  isListening ? 'animate-pulse' : 'hover:bg-gray-200'
                }`}
              >
                {isListening ? '🎤 Слушаю...' : '🎤 Голосовое управление'}
              </button>
            </div>
          )}
        </div>

        {/* AI Salary Allocation */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">ИИ распределение зарплаты</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Сумма зарплаты
              </label>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D9A86] focus:border-transparent"
              />
            </div>
            <button
              onClick={handleAllocateSalary}
              className="bg-[#2D9A86] text-white rounded-2xl px-4 py-2 hover:opacity-90 transition"
            >
              Распределить
            </button>
            
            {allocationPlan && (
              <div className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2">Категория</th>
                        <th className="text-right py-2">Сумма</th>
                        <th className="text-center py-2">Тип</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(allocationPlan.plan).map(([key, item]: [string, any]) => (
                        <tr key={key} className="border-b border-gray-100">
                          <td className="py-2">{item.title}</td>
                          <td className="text-right py-2">{item.allocated.toLocaleString()} ₸</td>
                          <td className="text-center py-2">
                            <span className="px-2 py-1 rounded text-xs bg-gray-100">
                              {item.type === 'fixed' ? 'фикс' : '%'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold bg-[#EEFE6D]/20">
                        <td className="py-2">В сбережения</td>
                        <td className="text-right py-2">{allocationPlan.toSavings.toLocaleString()} ₸</td>
                        <td className="text-center py-2">
                          <span className="px-2 py-1 rounded text-xs bg-[#EEFE6D] text-gray-900">
                            остаток
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={handleApplyPlan}
                  className="mt-4 bg-[#EEFE6D] text-gray-900 rounded-2xl px-4 py-2 hover:opacity-90 transition"
                >
                  Применить план
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Halal Investment */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Halal-инвест (симуляция)</h2>
          
          {/* Disclaimer */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
            <div className="flex items-start space-x-2">
              <div className="text-yellow-600 text-lg">⚠️</div>
              <div className="text-sm text-yellow-800">
                <strong>Симуляция.</strong> Инвестирование возможно только в халяль-совместимые активы. 
                Доход не гарантирован. Криптовалюты могут вызывать шариатские споры.
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Сумма
              </label>
              <input
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D9A86] focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Инструмент
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(['sukuk', 'halal-stocks', 'gold', 'crypto'] as InvestmentInstrument[]).map(instrument => (
                  <button
                    key={instrument}
                    onClick={() => setSelectedInstrument(instrument)}
                    className={`px-3 py-2 rounded-xl text-sm transition ${
                      selectedInstrument === instrument
                        ? 'bg-[#2D9A86] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {getInstrumentName(instrument)}
                    {instrument === 'crypto' && ' *'}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={handleSimulateInvestment}
              className="bg-[#2D9A86] text-white rounded-2xl px-4 py-2 hover:opacity-90 transition"
            >
              Смоделировать
            </button>
            
            {investmentResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold mb-2">Результат симуляции</h3>
                <div className="space-y-2 text-sm">
                  <div>Комиссия банка: {investmentResult.fee.toLocaleString()} ₸ (0.1%)</div>
                  <div>Ожидаемая стоимость через 12 мес: {investmentResult.projectedValue.toLocaleString()} ₸</div>
                  <div className={`font-semibold ${
                    investmentResult.return >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    Доходность: {investmentResult.return >= 0 ? '+' : ''}{investmentResult.returnPercent}%
                  </div>
                </div>
                <button
                  onClick={handleApplyInvestment}
                  className="mt-3 bg-[#EEFE6D] text-gray-900 rounded-2xl px-4 py-2 hover:opacity-90 transition"
                >
                  Оформить программу
                </button>
              </div>
            )}
          </div>
        </div>
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
