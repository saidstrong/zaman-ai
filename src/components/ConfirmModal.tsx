'use client';

import { useState, useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description: string;
  biometryHint?: boolean;
  requireSecondFactorSum?: number;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Подтверждение личности',
  description,
  biometryHint = false,
  requireSecondFactorSum,
  confirmText = 'Подтвердить',
  cancelText = 'Отменить'
}: ConfirmModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [biometryComplete, setBiometryComplete] = useState(false);
  const [secondFactorInput, setSecondFactorInput] = useState('');

  useEffect(() => {
    if (biometryHint && isOpen) {
      setBiometryComplete(false);
      setIsConfirming(true);
      
      // Simulate biometry confirmation
      const timer = setTimeout(() => {
        setBiometryComplete(true);
        setIsConfirming(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [biometryHint, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSecondFactorInput('');
    }
  }, [isOpen]);

  const isSecondFactorValid = requireSecondFactorSum 
    ? Number(secondFactorInput) === requireSecondFactorSum
    : true;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        <p className="text-gray-600 mb-6">{description}</p>
        
        {biometryHint && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-center">
              {isConfirming ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2D9A86]"></div>
                  <span className="text-sm text-gray-600">В реальном банке здесь будет биометрия/3-D Secure. В демо — подтвердите кликом.</span>
                </div>
              ) : biometryComplete ? (
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-green-600">Биометрия подтверждена</span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {requireSecondFactorSum && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Повторите сумму: {requireSecondFactorSum.toLocaleString()} ₸
            </label>
            <input
              type="number"
              value={secondFactorInput}
              onChange={(e) => setSecondFactorInput(e.target.value)}
              placeholder="Введите сумму"
              className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D9A86] focus:border-transparent"
            />
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 rounded-2xl px-4 py-2 hover:bg-gray-300 transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={(biometryHint && !biometryComplete) || !isSecondFactorValid}
            className="flex-1 bg-[#2D9A86] text-white rounded-2xl px-4 py-2 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
