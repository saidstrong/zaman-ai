export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { search } from '../../../lib/rag';

export async function POST(request: NextRequest) {
  try {
    const req = await request.json();
    const userMessages = Array.isArray(req?.messages) ? req.messages : [];
    const temperature = typeof req?.temperature === 'number' ? req.temperature : 0.2;

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
Ты — Zaman AI, ассистент исламского банка Zaman. Отвечай дружелюбно, коротко, по делу.

Главные задачи (по приоритету):
1) ПОДБОР ПРОДУКТА: мурабаха (авто/недвижимость/бизнес/образование), вклад/сберегательный, карты (без процентов, халяль).
2) ПЛАН НАКОПЛЕНИЙ: помочь поставить цель (сумма, срок/дата), рассчитать ежемесячный план.
3) ПРОСТЫЕ ВОПРОСЫ: про продукты и исламские принципы (без фетв, только общая справка).

Формат ответа зависит от интента:

— Если интент = ПОДБОР ПРОДУКТА → верни ТОЛЬКО JSON (без текста):
{
  "tool": "match_product",
  "type": "<мурабаха|вклад|карта|...>",
  "minAmount": <число тенге или 0>,
  "query": "<доп. описание, например 'авто', 'недвижимость'>",
  "ui": {
    "chip": "Подобрал продукты",
    "quickReplies": ["Показать детали", "Изменить сумму", "Назад"]
  }
}

— Если интент = ПЛАН НАКОПЛЕНИЙ → верни ТОЛЬКО JSON:
{
  "tool": "set_goal",
  "amount": <число тенге>,
  "months": <целое кол-во месяцев или 0>,
  "targetDate": "<YYYY-MM-DD или пусто>",
  "purpose": "<квартира|авто|путешествие|образование|др>",
  "ui": {
    "card": {
      "title": "План накоплений",
      "subtitle": "предварительный расчёт",
      "rows": [
        {"label":"Цель","value":"квартира"},
        {"label":"Сумма","value":"2 000 000 ₸"},
        {"label":"Срок","value":"36 мес"}
      ]
    },
    "quickReplies": ["Сохранить план", "Изменить срок", "Отмена"]
  }
}

— ИНАЧЕ (любой другой вопрос) → обычный ТЕКСТ (коротко: 1–4 предложения) + список bullet-советов при необходимости. 
Если просили сравнение/пояснение — можно дать компактную «карточку» в Markdown: 
**Название** — 2–3 маркера преимуществ. Заканчивай 2–4 быстрыми реплаями в квадратных скобках: 
[Подобрать продукт] [Рассчитать план] [Открыть каталог] [Задать другой вопрос]

ПРАВИЛА ИНТЕНТА:
- «подобери», «мурабаха», «вклад», «карта», «подходящий продукт», «оформить» → match_product.
- «копить», «накопить», «цель», «план», «ежемесячно», «сколько откладывать», «на квартиру/авто/…» → set_goal.
- Если фраза содержит сумму и «месяц/месяцев/лет/год/дата» — это set_goal.
- НЕ путай интенты: запрос «мурабаха на авто за 2 млн на 36 мес» = product, не goal.

СЛОТ-ФИЛЛИНГ БЕЗ ЗАЦИКЛИВАНИЯ:
- Если до этого ты спрашивал «укажите срок» и пользователь прислал «36» или «36 месяцев» — пойми это как months=36.
- Если прислали только число (без контекста) — интерпретируй по предыдущему вопросу. Нельзя спрашивать одно и то же более 1 раза подряд. 
- Когда данных достаточно — формируй JSON и заверши диалог (не проси ещё раз).

ТЕРМИНОЛОГИЯ:
- Не используй слово «проценты». Говори: «наценка/маржа/прибыль», «без процентов», «рассрочка».
- «кредитная карта» → «карта с отложенной оплатой (без процентов)».

КОНСИСТЕНТНОСТЬ:
- Валюта по умолчанию KZT. Числа нормализуй (2000000 → 2 000 000).
- В quickReplies 2–4 коротких варианта, ≤ 20 символов.

ПРИМЕРЫ:
User: подбери мурабаху на авто за 2 миллиона на 36 месяцев
→ {"tool":"match_product","type":"мурабаха","minAmount":2000000,"query":"авто","ui":{"chip":"Подобрал продукты","quickReplies":["Показать детали","Изменить сумму","Назад"]}}

User: копить на квартиру 5 млн до 2027-12
→ {"tool":"set_goal","amount":5000000,"months":0,"targetDate":"2027-12-01","purpose":"квартира","ui":{"card":{"title":"План накоплений","subtitle":"предварительный расчёт","rows":[{"label":"Цель","value":"квартира"},{"label":"Сумма","value":"5 000 000 ₸"},{"label":"Срок","value":"≈ 26 мес"}]},"quickReplies":["Сохранить план","Изменить срок","Отмена"]}}

User: что такое мурабаха?
→ Короткий текст: 2–3 предложения + [Подобрать продукт] [Каталог]

User: 36
(после твоего вопроса о сроке) → подставь months=36 и СФОРМИРУЙ JSON без дополнительного вопроса.

Параметры генерации: temperature: 0.2, top_p: 0.9, max_tokens разумный (например 512), чтобы не болтать.
`;

    const system = {
      role: 'system' as const,
      content: SYSTEM_PROMPT + ragContext
    };

    const payload = {
      model: 'gpt-4o-mini',
      temperature,
      top_p: 0.9,
      max_tokens: 512,
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

