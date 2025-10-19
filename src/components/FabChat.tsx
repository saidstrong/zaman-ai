'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageCircle, Mic, MicOff, Send } from 'lucide-react';
import { track } from '../lib/telemetry';
import { extractGoal } from '../lib/nlu';
import { saveGoal } from '../lib/banking';
import { VoiceController } from '../lib/voice';
import { useChat } from './ChatContext';

interface FabChatProps {
  onVoiceCommand?: (command: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ProductPreview {
  type: string;
  minAmount: number;
  query: string;
}

export function FabChat({ onVoiceCommand }: FabChatProps = {}) {
  const { messages, addMessage, isOpen, setIsOpen } = useChat();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [productPreview, setProductPreview] = useState<ProductPreview | null>(null);
  const [voiceController] = useState(() => new VoiceController());
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Manage body scroll when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle voice commands from global handler
  useEffect(() => {
    if (onVoiceCommand) {
      // Voice command handling moved to GlobalVoiceHandler
    }
  }, [onVoiceCommand]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    setInput('');
    setIsLoading(true);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      timestamp: Date.now()
    };
    addMessage(userMessage);

    // Check for goal extraction
    const goal = extractGoal(currentInput);
    if (goal && goal.amount > 0) {
      if (goal.months || goal.dateISO) {
        let targetDate = goal.dateISO;
        if (!targetDate && goal.months) {
          const d = new Date();
          d.setMonth(d.getMonth() + goal.months);
          targetDate = d.toISOString().split('T')[0];
        }
        
        if (targetDate) {
          const monthly = goal.amount / ((goal.months || 12) * 1.0);
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `План накоплений: ${monthly.toLocaleString()} ₸/мес`,
            timestamp: Date.now() + 1
          };
          addMessage(assistantMessage);
          
          // Save goal
          saveGoal({ sum: goal.amount, dateISO: targetDate });
          track('goal_created', { sum: goal.amount, dateISO: targetDate, monthly });
        }
      } else {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Укажите срок накоплений в месяцах или дату цели.',
          timestamp: Date.now() + 1
        };
        addMessage(assistantMessage);
      }
      
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput })
      });

      if (!response.ok) {
        throw new Error('Ошибка при отправке сообщения');
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      let consumed = false;

      try {
        const s = text.trim();
        if (s.startsWith('{') && s.endsWith('}')) {
          const obj = JSON.parse(s);
          if (obj?.tool === 'match_product') {
            setProductPreview({
              type: obj.type || '',
              minAmount: Number(obj.minAmount || 0),
              query: obj.query || ''
            });
            
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: 'Подбор продукта',
              timestamp: Date.now() + 1
            };
            addMessage(assistantMessage);
            track('product_match', { type: obj.type, amount: obj.minAmount, query: obj.query });
            consumed = true;
          }
        }
      } catch {}
      
      if (!consumed) {
        // Regular assistant response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: text || 'Извините, произошла ошибка',
          timestamp: Date.now() + 1
        };
        addMessage(assistantMessage);
      }

      // TTS for short messages (only for regular responses)
      if (!consumed && text.length <= 300 && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = 1.0;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }

    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Извините, произошла ошибка. Попробуйте еще раз.',
        timestamp: Date.now() + 1
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductMatch = () => {
    if (productPreview) {
      const params = new URLSearchParams();
      if (productPreview.type) params.set('type', productPreview.type);
      if (productPreview.minAmount > 0) params.set('min', productPreview.minAmount.toString());
      if (productPreview.query) params.set('q', productPreview.query);
      
      router.push(`/products?${params.toString()}`);
      setIsOpen(false);
      setProductPreview(null);
    }
  };

  const handleVoiceToggle = () => {
    if (!voiceController.isSupported()) {
      alert('Голосовое управление недоступно в этом браузере');
      return;
    }

    if (isListening) {
      voiceController.stopListening();
      setIsListening(false);
      return;
    }

    // Start listening
    setIsListening(true);
    voiceController.startListening(
      (command) => {
        const transcript = command.message || command.action;
        setInput(transcript);
        setIsListening(false);
      },
      (error) => {
        console.error('Voice error:', error);
        setIsListening(false);
      }
    );
  };

  const recentMessages = messages.slice(-5);

  return (
    <>
      {/* FAB Button */}
      <div className="fixed right-4 bottom-24 z-40">
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          aria-label="Открыть ассистента"
          className="size-14 rounded-full bg-[#2D9A86] text-white shadow-[0_8px_22px_rgba(5,71,58,.25)] ring-1 ring-emerald-200 active:scale-95 flex items-center justify-center"
          style={{ marginBottom: 'var(--safe-area-inset-bottom)' }}
        >
          <span className="text-xl leading-none">💬</span>
        </motion.button>
      </div>

      {/* Mini Chat Bottom Sheet - Only render when open */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Sheet */}
          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto w-full max-w-screen-sm rounded-t-2xl bg-white shadow-xl max-h-[70vh] overflow-y-auto ring-1 ring-black/5">
              {/* Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">ИИ ассистент</h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-full p-1.5 hover:bg-gray-100 active:scale-95"
                    aria-label="Закрыть"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="px-4 pt-3 pb-2 space-y-2 overflow-y-auto max-h-[50vh]">
                {recentMessages.length === 0 ? (
                  <div className="text-center text-z-ink-2 py-8">
                    <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Задайте вопрос ассистенту</p>
                  </div>
                ) : (
                  recentMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                          message.role === 'user'
                            ? 'bg-[var(--z-green)] text-white'
                            : 'bg-[var(--z-solar)]/50 text-z-ink'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))
                )}

                {/* Product Preview */}
                {productPreview && (
                  <div className="bg-white border border-z-border rounded-xl p-4">
                    <h3 className="font-medium text-z-ink mb-2">Подбор продукта</h3>
                    <div className="space-y-2 text-sm mb-3">
                      <div className="flex justify-between">
                        <span className="text-z-ink-2">Тип:</span>
                        <span className="font-medium text-z-ink">{productPreview.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-z-ink-2">Минимальная сумма:</span>
                        <span className="font-medium text-z-ink tabular-nums">{productPreview.minAmount.toLocaleString()} ₸</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-z-ink-2">Поиск:</span>
                        <span className="font-medium text-z-ink">{productPreview.query || 'Не указано'}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleProductMatch}
                        className="flex-1 bg-[var(--z-green)] text-white rounded-xl py-2 text-sm font-medium"
                      >
                        Подобрать
                      </button>
                      <button
                        onClick={() => setProductPreview(null)}
                        className="flex-1 bg-z-muted text-z-ink-2 rounded-xl py-2 text-sm font-medium"
                      >
                        Изменить
                      </button>
                    </div>
                  </div>
                )}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[var(--z-solar)]/50 text-z-ink px-3 py-2 rounded-2xl">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-z-ink-2 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-z-ink-2 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-z-ink-2 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area - Sticky at bottom */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur px-3 py-3 border-t">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Введите сообщение..."
                      className="w-full px-4 py-3 border border-z-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white text-sm"
                    />
                    <button
                      onClick={handleVoiceToggle}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full ${
                        isListening ? 'bg-red-500 text-white' : 'text-z-ink-2 hover:bg-z-muted'
                      }`}
                    >
                      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    className="px-4 py-3 bg-[var(--z-green)] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                  </button>
                </div>

                {/* Full Chat Link */}
                <div className="mt-3 text-center">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      router.push('/assistant');
                    }}
                    className="text-[var(--z-green)] text-sm hover:text-[var(--z-green-600)]"
                  >
                    Открыть полноэкранный чат
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}