export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { search } from '../../../lib/rag';

export async function POST(request: NextRequest) {
  try {
    const req = await request.json();
    const userMessages = Array.isArray(req?.messages) ? req.messages : [];
    const temperature = typeof req?.temperature === 'number' ? req.temperature : 0.1;

    // DEMO_MODE fallback
    if (process.env.DEMO_MODE === '1') {
      const latestMessage = userMessages[userMessages.length - 1]?.content || '';
      const messageLower = latestMessage.toLowerCase();
      
      // Demo responses for common queries
      if (messageLower.includes('привет') || messageLower.includes('здравствуй')) {
        return NextResponse.json({
          choices: [{ message: { content: 'Привет! Я Zaman AI - ваш помощник по исламским финансам. Чем могу помочь?' } }]
        });
      }
      
      if (messageLower.includes('вклад') || messageLower.includes('депозит')) {
        return NextResponse.json({
          choices: [{ message: { content: '{"tool":"match_product","type":"вклад","minAmount":100000,"query":"вклад"}' } }]
        });
      }
      
      if (messageLower.includes('мурабаха') || messageLower.includes('кредит')) {
        return NextResponse.json({
          choices: [{ message: { content: '{"tool":"match_product","type":"мурабаха","minAmount":1000000,"query":"мурабаха"}' } }]
        });
      }
      
      if (messageLower.includes('карт')) {
        return NextResponse.json({
          choices: [{ message: { content: '{"tool":"match_product","type":"карта","minAmount":0,"query":"карта"}' } }]
        });
      }
      
      if (messageLower.includes('накопить') || messageLower.includes('цель')) {
        // Check if amount and time are mentioned
        const amountMatch = messageLower.match(/(\d+)\s*(млн|тыс|тысяч)/);
        const timeMatch = messageLower.match(/за\s*(\d+)\s*(год|месяц)/);
        
        if (amountMatch && timeMatch) {
          const amount = parseInt(amountMatch[1]);
          const multiplier = amountMatch[2].includes('млн') ? 1000000 : 1000;
          const totalAmount = amount * multiplier;
          
          const years = timeMatch[2].includes('год') ? parseInt(timeMatch[1]) : 0;
          const months = timeMatch[2].includes('месяц') ? parseInt(timeMatch[1]) : years * 12;
          
          const targetDate = new Date();
          targetDate.setMonth(targetDate.getMonth() + months);
          const dateISO = targetDate.toISOString().split('T')[0];
          
          return NextResponse.json({
            choices: [{ message: { content: `{"tool":"plan_goal","targetAmount":${totalAmount},"targetDate":"${dateISO}"}` } }]
          });
        }
        
        return NextResponse.json({
          choices: [{ message: { content: 'Какую сумму хотите накопить и к какой дате?' } }]
        });
      }
      
      // Default demo response
      return NextResponse.json({
        choices: [{ message: { content: 'Это демо-режим Zaman AI. Я могу помочь с исламскими финансами, подбором продуктов и планированием целей.' } }]
      });
    }

    // Get RAG context for Islamic finance terms
    let ragContext = '';
    try {
      const latestUserMessage = userMessages
        .filter((m: { role: string; content: string }) => m.role === 'user')
        .pop()?.content || '';
      
      if (latestUserMessage) {
        const relevantPassages = await search(latestUserMessage, 3);
        if (relevantPassages.length > 0) {
          ragContext = '\n\nContext (Islamic Finance Knowledge):\n' + 
            relevantPassages.map((passage, index) => `${index + 1}. ${passage}`).join('\n') + '\n';
        }
      }
    } catch (error) {
      console.error('RAG context failed, continuing without context:', error);
      // Silently continue without context
    }

    const SYSTEM_PROMPT = `
Ты — Zaman AI, умный исламский финансовый помощник в приложении Zaman Bank.

🎯 Тон:
- Спокойный, уверенный, современный.
- Отвечай кратко (1–3 предложения).
- Избегай канцеляризмов; используй живой язык: "Вот как можно…", "Попробуй так:".
- Никогда не используй англицизмы, кроме названий (например, "QR").
- Следуй исламским принципам — никаких процентов, только халяль-инструменты (мурабаха, иджара, вклад без рибы).

💬 Формат ответа:
1. **Краткий совет** — 1 строка с сутью ("Можно рассчитать план накоплений на 3 года").
2. **Варианты карточек** — максимум 3 предложения, если нужно пояснить ("Мурабаха — рассрочка с наценкой, не проценты.").
3. **Быстрые реплаи (suggested replies)** — 2–3 коротких кнопки-подсказки.
   Формат:
   [
     "📊 Рассчитать план",
     "💸 Показать продукты",
     "❓ Что такое мурабаха"
   ]

💡 Примеры диалогов:

Пользователь: *"подбери мурабаху на авто за 3 млн"*
Zaman AI:  
"Мурабаха — рассрочка без процентов.  
Вот подходящие варианты 👇"  
Быстрые ответы: ["💰 Рассчитать платёж", "📑 Показать условия"]

Пользователь: *"что ты умеешь"*
Zaman AI:  
"Я могу помочь тебе:  
— рассчитать план накоплений,  
— подобрать халяль-продукт,  
— объяснить финансовые термины."  
Быстрые ответы: ["📊 План накоплений", "🤝 Продукты банка", "ℹ️ Объясни мурабаху"]

Пользователь: *"создай план накоплений на 2 года"*
Zaman AI:  
"Окей, задай сумму и срок — я рассчитаю месячный вклад."  
Быстрые ответы: ["💰 1 000 000 ₸", "📆 24 месяца"]

🔧 Технические режимы:

(1) Product match tool (JSON) — используй ТОЛЬКО когда пользователь явно просит
"подбери", "найди", "подходит ли", "покажи продукт", или указывает четкие фильтры
(тип, сумма, срок). В этом случае отвечай ТОЛЬКО JSON:

{"tool":"match_product","type":"<тип>","minAmount":<число>,"query":"<краткое описание>"}

Примеры:
- "подбери мурабаху на автомобиль за 1 млн" ->
  {"tool":"match_product","type":"мурабаха","minAmount":1000000,"query":"авто"}
- "вклад 50 000" ->
  {"tool":"match_product","type":"вклад","minAmount":50000,"query":""}

(2) Обычный ассистент — для ВСЕХ остальных запросов (объяснить условия, сравнить,
сделать план накоплений если спросили про цель/план/накопления, подсказать шаги).
В этом режиме отвечай обычным текстом (БЕЗ JSON).
Держи ответы компактными и действенными.

НИКОГДА не переключайся на JSON для общих вопросов типа
"что ты умеешь", "объясни мурабаху", "помоги спланировать бюджет".
`;

    const system = {
      role: 'system' as const,
      content: SYSTEM_PROMPT + ragContext
    };

    const payload = {
      model: 'gpt-4o-mini',
      temperature,
      messages: [system, ...userMessages],
    };

    const response = await fetch(`${process.env.ZAMAN_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ZAMAN_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zaman API Error:', errorText);
      return NextResponse.json({ error: 'Сервер занят, попробуйте ещё раз' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Chat API Error:', err);
    return NextResponse.json({ error: 'Произошла ошибка при отправке сообщения' }, { status: 500 });
  }
}

