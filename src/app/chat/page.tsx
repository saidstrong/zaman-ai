'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { planGoal } from '../../lib/utils';
import { track } from '../../lib/telemetry';
import { extractGoal } from '../../lib/nlu';
import { AppHeader } from '../../components/AppHeader';
import { Card, Button } from '../../components/ui';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isGoalPlan?: boolean;
  goalData?: {
    targetAmount: number;
    targetDate: string;
    monthly: number;
    months: number;
  };
}

interface ToolResponse {
  tool: string;
  targetAmount?: number;
  targetDate?: string;
  type?: string;
  minAmount?: number;
  query?: string;
}

interface AppliedProduct {
  id: string;
  name: string;
  type: string;
  min: number;
  term: number;
}

function ChatComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [appliedProduct, setAppliedProduct] = useState<AppliedProduct | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [productPreview, setProductPreview] = useState<{
    type: string;
    minAmount: number;
    query: string;
  } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pushingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize TTS setting from localStorage
  useEffect(() => {
    const savedTtsEnabled = localStorage.getItem('tts_enabled');
    if (savedTtsEnabled !== null) {
      setTtsEnabled(savedTtsEnabled === 'true');
    }
  }, []);

  // TTS function
  const speakText = (text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    
    // Limit TTS to short messages (≤ 300 characters)
    if (text.length > 300) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Toggle TTS
  const toggleTts = () => {
    const newTtsEnabled = !ttsEnabled;
    setTtsEnabled(newTtsEnabled);
    localStorage.setItem('tts_enabled', newTtsEnabled.toString());
  };

  // Handle apply_product parameters from URL
  useEffect(() => {
    const applyProduct = searchParams.get('apply_product');
    if (applyProduct === '1') {
      const id = searchParams.get('id') || '';
      const name = searchParams.get('name') || '';
      const type = searchParams.get('type') || '';
      const min = Number(searchParams.get('min')) || 0;
      const term = Number(searchParams.get('term')) || 0;
      
      if (id && name && type) {
        const product: AppliedProduct = { id, name, type, min, term };
        setAppliedProduct(product);
        
        // Track product application with deduplication
        track("product_applied", { id, name, type, min, term }, `product_applied:${id}`);
        
        // Clean URL params once to avoid re-firing on HMR/StrictMode
        router.replace("/chat");
        
        // Focus input after redirecting from products
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [searchParams, router]);

  const handleToolResponse = (content: string) => {
    try {
      const toolData: ToolResponse = JSON.parse(content);
      if (toolData.tool === 'plan_goal' && toolData.targetAmount && toolData.targetDate) {
        const result = planGoal(toolData.targetAmount, toolData.targetDate);
        return `План: ${result.monthly.toLocaleString()} ₸/мес, месяцев: ${result.months}`;
      }
      if (toolData.tool === 'match_product' && toolData.type && toolData.minAmount !== undefined) {
        // Check if voice mode is enabled
        const voiceEnabled = localStorage.getItem('voice_enabled') === 'true';
        
        if (voiceEnabled) {
          // Voice mode: immediate redirect
          const type = encodeURIComponent(toolData.type);
          const min = Number(toolData.minAmount ?? 0);
          const q = encodeURIComponent(toolData.query ?? "");
          const url = `/products?type=${type}&min=${isNaN(min) ? 0 : min}&q=${q}`;
          
          console.log("Voice mode: redirecting to", url, toolData);
          router.push(url);
          return 'Перенаправляю в каталог продуктов...';
        } else {
          // Normal mode: show preview card
          setProductPreview({
            type: toolData.type,
            minAmount: Number(toolData.minAmount ?? 0),
            query: toolData.query ?? ""
          });
          return 'Подбор продукта';
        }
      }
    } catch {
      // Not a valid tool response, return original content
    }
    return content;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    // Local goal extraction - skip LLM if we can extract goal directly
    const goal = extractGoal(input);
    if (goal && (goal.months || goal.dateISO)) {
      // compute targetDate from months if provided
      let targetDate = goal.dateISO;
      if (!targetDate && goal.months) {
        const d = new Date();
        d.setMonth(d.getMonth() + goal.months);
        targetDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
      }
      
      const res = planGoal(goal.amount, targetDate!);
      const assistantMessage: Message = {
        role: 'assistant',
        content: `План накоплений: ${res.monthly.toLocaleString()} ₸/мес, срок: ${res.months} мес`,
        isGoalPlan: true,
        goalData: { targetAmount: goal.amount, targetDate: targetDate!, ...res }
      };
      setMessages([...newMessages, assistantMessage]);
      
      // Track goal creation
      track('goal_created', { 
        sum: goal.amount, 
        dateISO: targetDate!,
        monthly: res.monthly,
        months: res.months
      });
      
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
      return; // skip calling LLM
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: input }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Произошла ошибка');
      }

          const text = data.choices?.[0]?.message?.content ?? '';
          let consumed = false;

          try {
            const s = text.trim();
            if (s.startsWith('{') && s.endsWith('}')) {
              const obj = JSON.parse(s);
              if (obj?.tool === 'match_product') {
                const type = encodeURIComponent(obj.type ?? '');
                const min = Number(obj.minAmount ?? 0);
                const q = encodeURIComponent(obj.query ?? '');
                router.push(`/products?type=${type}&min=${isNaN(min) ? 0 : min}&q=${q}`);
                consumed = true;
                
                // Track product search
                track('product_search', { 
                  type: obj.type, 
                  minAmount: obj.minAmount, 
                  query: obj.query 
                });
              }
            }
          } catch {}
          
          if (!consumed) {
            // render as normal assistant text
            const assistantMessage: Message = {
              role: 'assistant',
              content: text,
            };
            setMessages([...newMessages, assistantMessage]);
            speakText(assistantMessage.content);
          }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
      // Focus input after sending message
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          
          const response = await fetch('/api/stt', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const data = await response.json();
            setInput(data.transcript || '');
            track('voice_input', { transcript: data.transcript });
          } else {
            console.error('STT failed:', response.statusText);
          }
        } catch (error) {
          console.error('STT error:', error);
        }
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 10000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-z-cloud flex flex-col">
      <AppHeader 
        title="Zaman AI Chat"
        showVoiceToggle={true}
        voiceEnabled={ttsEnabled}
        onToggleVoice={toggleTts}
        showDemoBadge={process.env.NEXT_PUBLIC_DEMO_MODE === '1'}
      />

      {/* Messages */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-6 space-y-4 md:space-y-6">
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              message.role === 'user' 
                ? 'bg-[var(--z-green)] text-white' 
                : 'bg-[var(--z-solar)]/50 text-z-ink'
            }`}>
              <p className="text-sm leading-relaxed">{message.content}</p>
              {message.isGoalPlan && message.goalData && (
                <div className="mt-2 pt-2 border-t border-z-border">
                  <Button
                    size="sm"
                    onClick={() => {
                      track("goal_created", {
                        sum: message.goalData!.targetAmount,
                        dateISO: message.goalData!.targetDate,
                        monthly: message.goalData!.monthly,
                        months: message.goalData!.months
                      });
                      alert('Цель зафиксирована!');
                    }}
                  >
                    Зафиксировать цель
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Loading indicator */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="flex justify-center"
          >
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span className="text-red-600 text-sm ml-2">Записываю...</span>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Skeleton Loader */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex justify-start"
          >
            <Card className="max-w-[80%] p-4 bg-[var(--z-solar)]/30">
              <div className="space-y-2">
                <div className="h-3 bg-z-muted rounded animate-pulse"></div>
                <div className="h-3 bg-z-muted rounded animate-pulse w-4/5"></div>
                <div className="h-3 bg-z-muted rounded animate-pulse w-3/5"></div>
              </div>
            </Card>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex justify-center"
          >
            <Card className="max-w-md p-4 bg-red-50 border-red-200">
              <p className="text-sm mb-3 text-red-700">{error}</p>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setError(null);
                    if (messages.length > 0) {
                      const lastMessage = messages[messages.length - 1];
                      if (lastMessage.role === 'user') {
                        setInput(lastMessage.content);
                      }
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  Повторить
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                >
                  Закрыть
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </main>

      {/* Applied Product Confirmation */}
      {appliedProduct && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-[var(--z-solar)]/20 border-t border-[var(--z-green)] p-4"
        >
          <div className="max-w-4xl mx-auto">
            <Card className="p-4">
              <p className="text-sm text-z-ink mb-3">
                Вы выбрали: <strong>{appliedProduct.name}</strong> (тип: <strong>{appliedProduct.type}</strong>, 
                мин: <strong>{appliedProduct.min.toLocaleString()} ₸</strong>, 
                срок: <strong>{appliedProduct.term} мес</strong>). 
                Я помогу оформить заявку или подобрать похожие варианты.
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    console.log("Оформить заявку", appliedProduct);
                    setAppliedProduct(null);
                  }}
                >
                  Оформить заявку
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setAppliedProduct(null)}
                >
                  Отмена
                </Button>
              </div>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Product Preview Card */}
      {productPreview && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-[var(--z-solar)]/20 border-t border-[var(--z-green)] p-4"
        >
          <div className="max-w-4xl mx-auto">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-3 text-z-ink">Подбор продукта</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-z-ink-2">Тип:</span>
                  <span className="font-medium text-z-ink">{productPreview.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-z-ink-2">Минимальная сумма:</span>
                  <span className="font-medium text-z-ink">{productPreview.minAmount.toLocaleString()} ₸</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-z-ink-2">Поиск:</span>
                  <span className="font-medium text-z-ink">{productPreview.query || 'Не указано'}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    const type = encodeURIComponent(productPreview.type);
                    const min = productPreview.minAmount;
                    const q = encodeURIComponent(productPreview.query);
                    const url = `/products?type=${type}&min=${min}&q=${q}`;
                    router.push(url);
                  }}
                >
                  Подобрать
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setProductPreview(null);
                    inputRef.current?.focus();
                  }}
                >
                  Изменить параметры
                </Button>
              </div>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-z-border p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 rounded-full ${
                isRecording ? 'bg-red-500 text-white' : ''
              }`}
            >
              {isRecording ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 2a6 6 0 00-6 6v4a6 6 0 1012 0V8a6 6 0 00-6-6z" clipRule="evenodd"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 2a6 6 0 00-6 6v4a6 6 0 1012 0V8a6 6 0 00-6-6z" clipRule="evenodd"/>
                </svg>
              )}
            </Button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Введите ваше сообщение..."
              className="flex-1 border border-z-border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent bg-white"
              disabled={isLoading}
            />
            <Button
              size="sm"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D9A86]"></div>
    </div>}>
      <ChatComponent />
    </Suspense>
  );
}
