'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { planGoal } from '../lib/utils';
import { track } from '../lib/telemetry';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isGoalPlan?: boolean;
  goalData?: {
    targetAmount: number;
    targetDate: string;
    monthlyPlan: number;
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
        router.replace("/");
        
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
        return `План: ${result.monthlyPlan.toLocaleString()} ₸/мес, месяцев: ${result.months}`;
      }
      if (toolData.tool === 'match_product' && toolData.type && toolData.minAmount !== undefined) {
        // Route to products page with query parameters
        const type = encodeURIComponent(toolData.type);
        const min = Number(toolData.minAmount ?? 0);
        const q = encodeURIComponent(toolData.query ?? "");
        const url = `/products?type=${type}&min=${isNaN(min) ? 0 : min}&q=${q}`;
        
        // Console log for debugging
        console.log("Redirecting to", url, toolData);
        
        router.push(url);
        return 'Перенаправляю в каталог продуктов...';
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

          const rawContent = data.choices[0]?.message?.content || 'Нет ответа';
          
          let toolUsed = false;
          try {
            // Clean and parse JSON
            const cleaned = rawContent.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
            if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
              const obj = JSON.parse(cleaned);
              
              if (obj?.tool === "match_product" && !pushingRef.current) {
                // Validate match_product tool
                if (typeof obj.type === 'string' && typeof obj.query === 'string' && 
                    (typeof obj.minAmount === 'number' || !isNaN(Number(obj.minAmount)))) {
                  pushingRef.current = true;
                  const type = encodeURIComponent(obj.type);
                  const min = Number(obj.minAmount) || 0;
                  const q = encodeURIComponent(obj.query);
                  const url = `/products?type=${type}&min=${min}&q=${q}`;
                  console.log("Redirecting to", url, obj);
                  router.push(url);
                  setTimeout(() => { pushingRef.current = false; }, 1000);
                  toolUsed = true;
                }
              } else if (obj?.tool === "plan_goal") {
                // Validate plan_goal tool
                if (typeof obj.targetAmount === 'number' && typeof obj.targetDate === 'string') {
                  const result = planGoal(obj.targetAmount, obj.targetDate);
                  const assistantMessage: Message = {
                    role: 'assistant',
                    content: `План накоплений: ${result.monthlyPlan.toLocaleString()} ₸/мес, срок: ${result.months} мес`,
                    isGoalPlan: true,
                    goalData: { targetAmount: obj.targetAmount, targetDate: obj.targetDate, ...result }
                  };
                  setMessages([...newMessages, assistantMessage]);
                  toolUsed = true;
                }
              }
            }
          } catch (e) {
            console.error("Parse error:", e);
          }

          if (!toolUsed) {
            // Process other tool responses or render as normal text
            const processedContent = handleToolResponse(rawContent);
            const assistantMessage: Message = {
              role: 'assistant',
              content: processedContent,
            };
            setMessages([...newMessages, assistantMessage]);
            
            // Speak the response if TTS is enabled
            speakText(processedContent);
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
        await sendAudioToSTT(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError('Не удалось получить доступ к микрофону');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioToSTT = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');

      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка распознавания речи');
      }

      const transcript = data.text || '';
      if (transcript.trim()) {
        setInput(transcript);
        // Auto-send the transcript
        const userMessage: Message = { role: 'user', content: transcript };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        
        // Send to chat API
        try {
          const chatResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: transcript }],
            }),
          });

          const chatData = await chatResponse.json();

          if (!chatResponse.ok) {
            throw new Error(chatData.error || 'Произошла ошибка');
          }

          const rawContent = chatData.choices[0]?.message?.content || 'Нет ответа';
          
          let toolUsed = false;
          try {
            // Clean and parse JSON
            const cleaned = rawContent.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
            if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
              const obj = JSON.parse(cleaned);
              
              if (obj?.tool === "match_product" && !pushingRef.current) {
                // Validate match_product tool
                if (typeof obj.type === 'string' && typeof obj.query === 'string' && 
                    (typeof obj.minAmount === 'number' || !isNaN(Number(obj.minAmount)))) {
                  pushingRef.current = true;
                  const type = encodeURIComponent(obj.type);
                  const min = Number(obj.minAmount) || 0;
                  const q = encodeURIComponent(obj.query);
                  const url = `/products?type=${type}&min=${min}&q=${q}`;
                  console.log("Redirecting to", url, obj);
                  router.push(url);
                  setTimeout(() => { pushingRef.current = false; }, 1000);
                  toolUsed = true;
                }
              } else if (obj?.tool === "plan_goal") {
                // Validate plan_goal tool
                if (typeof obj.targetAmount === 'number' && typeof obj.targetDate === 'string') {
                  const result = planGoal(obj.targetAmount, obj.targetDate);
                  const assistantMessage: Message = {
                    role: 'assistant',
                    content: `План накоплений: ${result.monthlyPlan.toLocaleString()} ₸/мес, срок: ${result.months} мес`,
                    isGoalPlan: true,
                    goalData: { targetAmount: obj.targetAmount, targetDate: obj.targetDate, ...result }
                  };
                  setMessages([...newMessages, assistantMessage]);
                  toolUsed = true;
                }
              }
            }
          } catch (e) {
            console.error("Parse error:", e);
          }

          if (!toolUsed) {
            // Process other tool responses or render as normal text
            const processedContent = handleToolResponse(rawContent);
            const assistantMessage: Message = { role: 'assistant', content: processedContent };
            setMessages([...newMessages, assistantMessage]);
            
            // Speak the response if TTS is enabled
            speakText(processedContent);
          }
        } catch (chatErr) {
          setError(chatErr instanceof Error ? chatErr.message : 'Произошла ошибка');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка распознавания речи');
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-[#2D9A86] text-white p-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold">Zaman AI Chat</h1>
            <button
              onClick={toggleTts}
              title="Озвучивать ответы ассистента"
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                ttsEnabled 
                  ? 'bg-[#EEFE6D] text-[#2D9A86]' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {ttsEnabled ? '🔊 Озвучка' : '🔇 Озвучка'}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-50 border-b p-4">
        <div className="max-w-4xl mx-auto flex space-x-4">
          <span className="text-[#2D9A86] font-medium">Чат</span>
          <Link href="/spending" className="text-gray-600 hover:text-[#2D9A86] font-medium">
            Анализ расходов
          </Link>
          <Link href="/products" className="text-gray-600 hover:text-[#2D9A86] font-medium">
            Каталог
          </Link>
          <Link href="/metrics" className="text-gray-600 hover:text-[#2D9A86] font-medium">
            Метрики
          </Link>
        </div>
      </nav>

      {/* Chat Messages */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 space-y-4 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg">Добро пожаловать в Zaman AI!</p>
            <p className="text-sm">Задайте любой вопрос, и я постараюсь помочь.</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-[#2D9A86] text-white'
                  : 'bg-[#EEFE6D] text-gray-800'
              }`}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
              {message.isGoalPlan && message.goalData && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <button
                    onClick={() => {
                      track("goal_created", {
                        sum: message.goalData!.targetAmount,
                        dateISO: message.goalData!.targetDate,
                        monthly: message.goalData!.monthlyPlan,
                        months: message.goalData!.months
                      });
                      alert('Цель зафиксирована!');
                    }}
                    className="bg-[#2D9A86] text-white px-3 py-1 rounded text-sm hover:bg-[#248076] transition-colors"
                  >
                    Зафиксировать цель
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#EEFE6D] text-gray-800 rounded-2xl px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Skeleton Loader */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#EEFE6D] rounded-2xl px-4 py-3 max-w-[80%]">
              <div className="space-y-2">
                <div className="h-3 bg-gray-300 rounded animate-pulse"></div>
                <div className="h-3 bg-gray-300 rounded animate-pulse w-4/5"></div>
                <div className="h-3 bg-gray-300 rounded animate-pulse w-3/5"></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg max-w-md">
              <p className="text-sm mb-3">{error}</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setError(null);
                    if (messages.length > 0) {
                      const lastMessage = messages[messages.length - 1];
                      if (lastMessage.role === 'user') {
                        setInput(lastMessage.content);
                      }
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Повторить
                </button>
                <button
                  onClick={() => setError(null)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>
        </div>
        )}
      </main>

      {/* Applied Product Confirmation */}
      {appliedProduct && (
        <div className="bg-[#EEFE6D] border-t border-[#2D9A86] p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-800 mb-3">
                Вы выбрали: <strong>{appliedProduct.name}</strong> (тип: <strong>{appliedProduct.type}</strong>, 
                мин: <strong>{appliedProduct.min.toLocaleString()} ₸</strong>, 
                срок: <strong>{appliedProduct.term} мес</strong>). 
                Я помогу оформить заявку или подобрать похожие варианты.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    console.log("Оформить заявку", appliedProduct);
                    setAppliedProduct(null);
                  }}
                  className="bg-[#2D9A86] text-white px-4 py-2 rounded-lg hover:bg-[#248076] transition-colors text-sm"
                >
                  Оформить заявку
                </button>
                <button
                  onClick={() => {
                    console.log("Похожие продукты", appliedProduct);
                    setAppliedProduct(null);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  Похожие продукты
                </button>
                <button
                  onClick={() => setAppliedProduct(null)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <footer className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-2">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isRecording 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-[#2D9A86] text-white hover:bg-[#248076]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isRecording ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <rect x="6" y="4" width="8" height="12" rx="1"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 2a6 6 0 00-6 6v4a6 6 0 1012 0V8a6 6 0 00-6-6z" clipRule="evenodd"/>
                </svg>
              )}
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Введите ваше сообщение..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D9A86] focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-[#2D9A86] text-white px-6 py-2 rounded-full hover:bg-[#248076] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Отправить
            </button>
          </div>
        </div>
      </footer>

      {/* Demo Footer */}
      <footer className="bg-gray-100 border-t p-2">
        <div className="max-w-4xl mx-auto text-center text-gray-600 text-xs">
          Zaman AI (MVP) — demo build
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D9A86]"></div>
    </div>}>
      <ChatComponent />
    </Suspense>
  );
}