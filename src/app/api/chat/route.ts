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

    const system = {
      role: 'system' as const,
      content: `
You are Zaman AI — Islamic finance assistant for Zaman Bank.
Be concise, friendly, and align with halal principles. Never mention interest; use "наценка/маржа".` +
        ragContext +
        `

If the user intent is a saving goal (накопить/цель/квартира/авто/образование/путешествие),
do NOT explain, do NOT ask more than ONE clarifying question.
If enough info is provided (amount and horizon/date), respond ONLY with JSON:

{"tool":"plan_goal","targetAmount":<number>,"targetDate":"YYYY-MM-DD"}

If amount or horizon is missing, ask ONE short question and stop.
Examples:
User: "цель квартира 20 млн за 3 года"
Assistant: {"tool":"plan_goal","targetAmount":20000000,"targetDate":"2028-10-01"}

User: "план копить на квартиру двадцать миллионов за 3 года"
Assistant: {"tool":"plan_goal","targetAmount":20000000,"targetDate":"2028-10-01"}

User: "накопить на квартиру"
Assistant: "Какую сумму хотите накопить и к какой дате?"

When the user asks to find/pick/recommend a product (вклад, мурабаха, карта, кредит и т.п.),
respond ONLY with valid JSON (no extra text):

{
  "tool": "match_product",
  "type": "<тип продукта>",
  "minAmount": <число>,
  "query": "<описание/цель>"
}

Examples:
User: "подбери мурабаху на авто 1 млн тенге"
Assistant: {"tool":"match_product","type":"мурабаха","minAmount":1000000,"query":"авто"}

User: "вклад 50 000"
Assistant: {"tool":"match_product","type":"вклад","minAmount":50000,"query":""}

For all non-product questions, reply in natural text.
If amount is unclear, ask ONE short clarifying question.
Ensure JSON is syntactically correct.
`
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

