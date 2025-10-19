'use client';

import { useState, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { planGoal } from '../../lib/utils';
import { track } from '../../lib/telemetry';
import { extractGoal } from '../../lib/nlu';
import { Button } from '../../components/ui';

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

function AssistantFullComponent() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
      // Focus input after sending message
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Local header, no global nav */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b">
        <div className="mx-auto max-w-screen-sm px-4 h-12 flex items-center gap-3">
          <button onClick={() => router.back()}
                  aria-label="Назад"
                  className="rounded-full p-1.5 hover:bg-gray-100 active:scale-95">
            ←
          </button>
          <div className="font-medium">Zaman AI</div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-sm flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Добро пожаловать в Zaman AI</h3>
              <p className="text-gray-500">Задайте вопрос о исламских финансах, продуктах банка или планировании целей</p>
            </div>
          )}

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
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-start"
            >
              <div className="bg-[var(--z-solar)]/50 text-z-ink px-4 py-3 rounded-2xl">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-z-ink-2 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-z-ink-2 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-z-ink-2 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t bg-white p-4">
          <div className="flex space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Введите сообщение..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--z-green)] focus:border-transparent disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-[var(--z-green)] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--z-green-600)] transition-colors"
            >
              Отправить
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AssistantFull() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D9A86]"></div>
    </div>}>
      <AssistantFullComponent />
    </Suspense>
  );
}
