export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${process.env.ZAMAN_BASE_URL}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ZAMAN_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        ...body,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Zaman Embeddings API Error:', errorData);
      return NextResponse.json(
        { error: 'Сервер занят, попробуйте ещё раз' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Embeddings API Error:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при создании эмбеддингов' },
      { status: 500 }
    );
  }
}
