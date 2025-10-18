export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const response = await fetch(`${process.env.ZAMAN_BASE_URL}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ZAMAN_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Zaman STT API Error:', errorData);
      return NextResponse.json(
        { error: 'Сервер занят, попробуйте ещё раз' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('STT API Error:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при обработке аудио' },
      { status: 500 }
    );
  }
}
