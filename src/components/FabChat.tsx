'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageCircle, Mic, MicOff, Send } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { track } from '../lib/telemetry';
import { extractGoal } from '../lib/nlu';
import { saveGoal } from '../lib/banking';
import { VoiceController } from '../lib/voice';
import { useChat } from './ChatContext';

interface FabChatProps {
  onVoiceCommand?: (message: string) => void;
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

  // Handle voice commands from global handler
  useEffect(() => {
    if (onVoiceCommand) {
      // Voice command handling moved to GlobalVoiceHandler
    }
  }, [onVoiceCommand]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    addMessage(userMessage);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Check for local goal extraction first
      const goalData = extractGoal(currentInput);
      if (goalData && goalData.amount) {
        try {
          // Save goal safely
          saveGoal({ sum: goalData.amount, dateISO: goalData.dateISO });
          
          // Calculate monthly amount safely
          const monthlyAmount = goalData.months ? Math.round(goalData.amount / goalData.months) : null;
          
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `План накоплений: ${monthlyAmount ? monthlyAmount.toLocaleString() : 'не рассчитано'} ₸/мес · срок: ${goalData.months || 'не указан'} мес`,
            timestamp: Date.now() + 1
          };
          addMessage(assistantMessage);
          track('goal_created', { 
            sum: goalData.amount, 
            dateISO: goalData.dateISO || undefined, 
            monthly: monthlyAmount || 0, 
            months: goalData.months || 0 
          });
          return;
        } catch (error) {
          console.warn('Error processing goal:', error);
        }
      }

      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput })
      });

      if (!response.ok) {
        throw new Error('Ошибка при отправке сообщения');
      }

      const data = await response.json();
      
      // Handle tool responses
      if (data.tool === 'match_product') {
        setProductPreview({
          type: data.type || '',
          minAmount: Number(data.minAmount || 0),
          query: data.query || ''
        });
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Подбор продукта',
          timestamp: Date.now() + 1
        };
        addMessage(assistantMessage);
        track('product_match', { type: data.type, amount: data.minAmount, query: data.query });
        return;
      }

      // Regular assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Извините, произошла ошибка',
        timestamp: Date.now() + 1
      };
      addMessage(assistantMessage);

      // TTS for short messages
      if (assistantMessage.content.length <= 300 && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(assistantMessage.content);
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
        console.error('Voice recognition error:', error);
        alert(error);
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

      {/* Mini Chat Bottom Sheet */}
      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="ИИ ассистент"
      >
        <div className="p-4 h-full flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
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

          {/* Input Area */}
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
                router.push('/chat');
              }}
              className="text-[var(--z-green)] text-sm hover:text-[var(--z-green-600)]"
            >
              Открыть полноэкранный чат
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
