'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '../../components/BottomSheet';
import ConfirmModal from '../../components/ConfirmModal';
import { Card, Button } from '../../components/ui';
import { addTransaction } from '../../lib/banking';
import { track } from '../../lib/telemetry';

type TabType = 'topup' | 'transfer';

export default function PayPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('topup');
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [fromAccount, setFromAccount] = useState<string>('card');
  const [toAccount, setToAccount] = useState<string>('savings');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const presets = [5000, 10000, 50000];

  const handlePresetClick = (presetAmount: number) => {
    setAmount(presetAmount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseInt(value) || 0;
    setAmount(numValue);
  };

  const handleConfirm = async () => {
    if (amount <= 0) return;
    
    setIsProcessing(true);
    
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Add transaction to localStorage
      if (activeTab === 'topup') {
        addTransaction({
          date: new Date().toISOString(),
          amount: amount,
          merchant: 'Zaman • Пополнение',
          category: 'пополнения'
        });
        
        track('topup', { amount, account: fromAccount });
      } else {
        addTransaction({
          date: new Date().toISOString(),
          amount: -amount,
          merchant: `Zaman • Перевод на ${toAccount}`,
          category: 'переводы'
        });
        
        track('transfer', { amount, from: fromAccount, to: toAccount });
      }
      
      setIsConfirmOpen(false);
      
      // Show success toast (you could implement a toast system here)
      alert('Готово!');
      
      // Return to home
      router.push('/home');
      
    } catch (error) {
      console.error('Transaction failed:', error);
      alert('Ошибка при выполнении операции');
    } finally {
      setIsProcessing(false);
    }
  };

  const requiresSecondFactor = amount > 100000;

  return (
    <div className="min-h-screen bg-z-muted">
      <BottomSheet 
        isOpen={true} 
        onClose={() => router.push('/home')}
        title="Платежи"
      >
        <div className="p-6 space-y-6">
          {/* Tabs */}
          <div className="flex bg-z-muted rounded-xl p-1">
            <button
              onClick={() => setActiveTab('topup')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'topup'
                  ? 'bg-white text-[var(--z-green)] shadow-sm'
                  : 'text-z-ink-2'
              }`}
            >
              Пополнить
            </button>
            <button
              onClick={() => setActiveTab('transfer')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'transfer'
                  ? 'bg-white text-[var(--z-green)] shadow-sm'
                  : 'text-z-ink-2'
              }`}
            >
              Перевести
            </button>
          </div>

          {/* Amount Section */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-z-ink mb-4">Сумма</h3>
            
            {/* Presets */}
            <div className="flex gap-2 mb-4">
              {presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                    amount === preset
                      ? 'bg-[var(--z-green)] text-white'
                      : 'bg-z-muted text-z-ink-2 hover:bg-z-border'
                  }`}
                >
                  +{preset.toLocaleString()} ₸
                </button>
              ))}
            </div>
            
            {/* Custom Amount */}
            <input
              type="number"
              placeholder="Введите сумму"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              className="w-full p-4 border border-z-border rounded-xl text-lg font-semibold text-z-ink focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent"
            />
          </Card>

          {/* Account Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-z-ink mb-4">
              {activeTab === 'topup' ? 'Пополнить счёт' : 'Перевести со счёта'}
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center p-3 border border-z-border rounded-xl cursor-pointer hover:bg-z-muted/50">
                <input
                  type="radio"
                  name="account"
                  value="card"
                  checked={activeTab === 'topup' ? fromAccount === 'card' : fromAccount === 'card'}
                  onChange={(e) => setFromAccount(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-z-ink">Карта</div>
                  <div className="text-sm text-z-ink-2">320 000 ₸</div>
                </div>
              </label>
              
              <label className="flex items-center p-3 border border-z-border rounded-xl cursor-pointer hover:bg-z-muted/50">
                <input
                  type="radio"
                  name="account"
                  value="savings"
                  checked={activeTab === 'topup' ? fromAccount === 'savings' : fromAccount === 'savings'}
                  onChange={(e) => setFromAccount(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-z-ink">Сберегательный</div>
                  <div className="text-sm text-z-ink-2">780 000 ₸</div>
                </div>
              </label>
            </div>
          </Card>

          {activeTab === 'transfer' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-z-ink mb-4">Перевести на счёт</h3>
              
              <div className="space-y-3">
                <label className="flex items-center p-3 border border-z-border rounded-xl cursor-pointer hover:bg-z-muted/50">
                  <input
                    type="radio"
                    name="toAccount"
                    value="savings"
                    checked={toAccount === 'savings'}
                    onChange={(e) => setToAccount(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium text-z-ink">Сберегательный</div>
                    <div className="text-sm text-z-ink-2">780 000 ₸</div>
                  </div>
                </label>
                
                <label className="flex items-center p-3 border border-z-border rounded-xl cursor-pointer hover:bg-z-muted/50">
                  <input
                    type="radio"
                    name="toAccount"
                    value="buffer"
                    checked={toAccount === 'buffer'}
                    onChange={(e) => setToAccount(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium text-z-ink">Буфер</div>
                    <div className="text-sm text-z-ink-2">50 000 ₸</div>
                  </div>
                </label>
              </div>
            </Card>
          )}

          {/* Confirm Button */}
          <Button
            onClick={() => setIsConfirmOpen(true)}
            disabled={amount <= 0}
            className="w-full py-4 text-lg"
          >
            {activeTab === 'topup' ? 'Пополнить' : 'Перевести'} {amount.toLocaleString()} ₸
          </Button>
        </div>
      </BottomSheet>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Подтверждение операции"
        description={`${activeTab === 'topup' ? 'Пополнение' : 'Перевод'} на сумму ${amount.toLocaleString()} ₸`}
        biometryHint={true}
        requireSecondFactorSum={requiresSecondFactor ? amount : undefined}
        confirmText={isProcessing ? "Обработка..." : "Подтвердить"}
      />
    </div>
  );
}
