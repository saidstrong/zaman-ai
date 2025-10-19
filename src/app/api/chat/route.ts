export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';

// --- Simple intent router ---
function detectIntent(textRaw: string) {
  const text = (textRaw || '').toLowerCase();

  const productKeywords = [
    'мурабаха','мурабаху','вклад','депозит','карта','дебетовая',
    'рассрочка','ипотека','авто','автомобиль','золото','сукук','halal','халяль'
  ];
  const goalKeywords = [
    'копить','накопить','накопления','цель','план','планировать',
    'ежемесячно','ежемесячный','в месяц','месяцев','к дате','к сроку'
  ];

  const isProduct = productKeywords.some(k => text.includes(k));
  const isGoal = goalKeywords.some(k => text.includes(k));

  // при пересечении — приоритет ПРОДУКТА (это твой кейс)
  if (isProduct) return 'product';
  if (isGoal) return 'goal';
  return 'chitchat';
}

// извлечение суммы и месяцев из свободного текста
function parseAmount(text: string): number | undefined {
  const t = text.toLowerCase().replace(/\s+/g, ' ');
  // 3 000 000 / 3 млн / 3 million / 3m
  const m1 = t.match(/(\d[\d\s._]*)\s*(₸|kzt|т|тенге)?/i);
  let value = m1 ? Number(m1[1].replace(/[^\d]/g, '')) : NaN;

  // «3 млн»
  if (isNaN(value)) {
    const m2 = t.match(/(\d+(?:[\.,]\d+)?)\s*млн/);
    if (m2) value = Math.round(parseFloat(m2[1].replace(',', '.')) * 1_000_000);
  }
  return isNaN(value) || value <= 0 ? undefined : value;
}

function parseMonths(text: string): number | undefined {
  const m = text.toLowerCase().match(/(\d{1,3})\s*мес/);
  return m ? Number(m[1]) : undefined;
}

function guessProductType(text: string): 'мурабаха' | 'вклад' | 'карта' | 'прочее' {
  const t = text.toLowerCase();
  if (t.includes('мураб')) return 'мурабаха';
  if (t.includes('вклад') || t.includes('депозит')) return 'вклад';
  if (t.includes('карта') || t.includes('рассроч')) return 'карта';
  return 'прочее';
}

function guessQuery(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('авто') || t.includes('автомоб')) return 'авто';
  if (t.includes('недвиж') || t.includes('квартир')) return 'недвижимость';
  if (t.includes('образован')) return 'образование';
  return '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lastUser = Array.isArray(body?.messages)
      ? [...body.messages].reverse().find((m: { role: string; content: string }) => m.role === 'user')?.content
      : '';

    const intent = detectIntent(String(lastUser || ''));

    if (intent === 'product') {
      const minAmount = parseAmount(lastUser || '') ?? 0;
      const months = parseMonths(lastUser || ''); // пригодится в каталоге, можно прокинуть через query
      const type = guessProductType(lastUser || '');
      const query = guessQuery(lastUser || '');

      // Немедленно возвращаем tool-JSON (без вызова модели),
      // чтобы избежать «залипания» на план накоплений
      const tool = {
        id: 'tool-local-router',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4o-mini',
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: JSON.stringify({
                tool: 'match_product',
                type,
                minAmount,
                query,
                monthsHint: months ?? undefined
              })
            }
          }
        ]
      };
      return NextResponse.json(tool);
    }

    // --- для всего остального — обращаемся к модели ---
    const response = await fetch(`${process.env.ZAMAN_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ZAMAN_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `
Ты — Zaman AI, помощник исламского банка. Говоришь коротко, дружелюбно, без «процентов» (используй «маржа/наценка/прибыль»).

ВАЖНО: 
- Если пользователь спрашивает про продукт (мурабаха/вклад/карта/рассрочка, авто/недвижимость и т.п.), ты ДОЛЖЕН вернуть ТОЛЬКО валидный JSON (без лишнего текста):
{"tool":"match_product","type":"<тип>","minAmount":<число>,"query":"<контекст>"}
- В план накоплений переходи только при явных запросах про "копить/накопить/цель/план/месяцев/к дате".
- Никогда не смешивай режимы. Или JSON tool, или обычный текст, но не оба.

Примеры:
User: "мурабаха авто 1.5 млн на 3 года"
Assistant: {"tool":"match_product","type":"мурабаха","minAmount":1500000,"query":"авто"}

User: "хочу накопить 2 млн к октябрю 2026"
Assistant: Коротко спроси недостающие параметры и посчитай ежемесячный взнос.
            `.trim()
          },
          ...(body.messages || [])
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Zaman API Error:', errorData);
      return NextResponse.json(
        { error: 'Сервер занят, попробуйте ещё раз' },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Произошла ошибка при отправке сообщения' }, { status: 500 });
  }
}