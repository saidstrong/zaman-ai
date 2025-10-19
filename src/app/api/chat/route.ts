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
You are Zaman AI — an Islamic finance assistant of Zaman Bank.
Speak brief, clear Russian. Respect halal rules (no interest; use маржа/наценка/прибыль).

You have TWO modes:

(1) Product match tool (JSON) — use ONLY when the user explicitly asks to
"подбери", "найди", "подходит ли", "покажи продукт", or provides clear filters
(тип, сумма, срок). In this case reply with JSON ONLY:

{"tool":"match_product","type":"<тип>","minAmount":<число>,"query":"<краткое описание>"}

Examples:
- "подбери мурабаху на автомобиль за 1 млн" ->
  {"tool":"match_product","type":"мурабаха","minAmount":1000000,"query":"авто"}
- "вклад 50 000" ->
  {"tool":"match_product","type":"вклад","minAmount":50000,"query":""}

(2) Normal assistant — for ALL other requests (объяснить условия, сравнить,
сделать план накоплений если спросили про цель/план/накопления, подсказать шаги).
In this mode reply with normal text (NO JSON).
Keep answers compact and actionable.

Never switch to tool JSON for general questions like
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

