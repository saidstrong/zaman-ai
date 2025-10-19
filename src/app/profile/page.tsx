'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppHeader } from '../../components/AppHeader';
import { Card } from '../../components/ui';
import { track } from '../../lib/telemetry';

export default function ProfilePage() {
  const [telemetryOptIn, setTelemetryOptIn] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const telemetry = localStorage.getItem('telemetry_opt_in') === '1';
    const voice = localStorage.getItem('voice_enabled') === 'true';
    
    setTelemetryOptIn(telemetry);
    setVoiceEnabled(voice);
    
    track('profile_view');
  }, []);

  const toggleTelemetry = () => {
    const newValue = !telemetryOptIn;
    setTelemetryOptIn(newValue);
    localStorage.setItem('telemetry_opt_in', newValue ? '1' : '0');
    track('telemetry_toggle', { enabled: newValue });
  };

  const toggleVoice = () => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    localStorage.setItem('voice_enabled', newValue.toString());
    track('voice_toggle', { enabled: newValue });
  };

  return (
    <div className="min-h-screen bg-z-muted">
      <AppHeader title="Профиль" />
      
      <main className="p-4 space-y-4">
        {/* Profile Info */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-[var(--z-green)] rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-semibold">А</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-z-ink">Аманжол М.</h2>
                <p className="text-z-ink-2">Клиент Zaman Bank</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-z-ink mb-4">Настройки</h3>
            
            <div className="space-y-4">
              {/* Telemetry Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-z-ink">Сбор данных</div>
                  <div className="text-sm text-z-ink-2">Помогает улучшить сервис</div>
                </div>
                <button
                  onClick={toggleTelemetry}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    telemetryOptIn ? 'bg-[var(--z-green)]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      telemetryOptIn ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Voice Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-z-ink">Голосовое управление</div>
                  <div className="text-sm text-z-ink-2">Управление голосом в чате</div>
                </div>
                <button
                  onClick={toggleVoice}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    voiceEnabled ? 'bg-[var(--z-green)]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      voiceEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-z-ink mb-4">О приложении</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-z-ink-2">Версия</span>
                <span className="font-medium text-z-ink">1.0.0</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-z-ink-2">Банк</span>
                <span className="font-medium text-z-ink">Zaman Bank</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-z-ink-2">Лицензия</span>
                <span className="font-medium text-z-ink">№12345</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Legal */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.3 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-z-ink mb-4">Правовая информация</h3>
            
            <div className="space-y-3">
              <button className="w-full text-left py-2 text-[var(--z-green)] hover:text-[var(--z-green-600)] transition-colors">
                Условия использования (халяль)
              </button>
              
              <button className="w-full text-left py-2 text-[var(--z-green)] hover:text-[var(--z-green-600)] transition-colors">
                Политика конфиденциальности
              </button>
              
              <button className="w-full text-left py-2 text-[var(--z-green)] hover:text-[var(--z-green-600)] transition-colors">
                Шариатское соответствие
              </button>
            </div>
          </Card>
        </motion.div>

        {/* Support */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.4 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-z-ink mb-4">Поддержка</h3>
            
            <div className="space-y-3">
              <button className="w-full text-left py-2 text-[var(--z-green)] hover:text-[var(--z-green-600)] transition-colors">
                Связаться с поддержкой
              </button>
              
              <button className="w-full text-left py-2 text-[var(--z-green)] hover:text-[var(--z-green-600)] transition-colors">
                FAQ
              </button>
              
              <button className="w-full text-left py-2 text-[var(--z-green)] hover:text-[var(--z-green-600)] transition-colors">
                Оценить приложение
              </button>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
