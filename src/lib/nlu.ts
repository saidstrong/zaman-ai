// Natural Language Understanding for goal extraction
export function extractGoal(s: string): { amount: number; months?: number; dateISO?: string; purpose?: string } | null {
  const text = s.toLowerCase().replace(/\s+/g,' ').trim();

  // map words → numbers
  const words: Record<string, number> = {
    "тыс": 1_000, "тысяча":1_000, "тысяч":1_000,
    "млн": 1_000_000, "миллион":1_000_000, "миллиона":1_000_000, "миллионов":1_000_000,
    "млрд": 1_000_000_000, "миллиард":1_000_000_000
  };

  // capture amount like "20 млн", "500 тыс", "20000000"
  let amount = 0;
  const numWord = text.match(/(\d[\d\s.,]*)\s*(млрд|миллиард|млн|миллион|тыс|тысяча|тысяч)?/);
  if (numWord) {
    const raw = numWord[1].replace(/\s/g,'').replace(',', '.');
    const base = Number(raw);
    const mult = words[numWord[2] || ""] || 1;
    if (!Number.isNaN(base)) amount = Math.round(base * mult);
  }

  // horizon: "за 3 года", "за 24 месяца", "к 2028-10-01", "к декабрю 2027"
  let months: number | undefined;
  const m1 = text.match(/за\s+(\d{1,3})\s*(год|года|лет|месяц|месяца|месяцев)/);
  if (m1) {
    const n = Number(m1[1]);
    months = /месяц/.test(m1[2]) ? n : n * 12;
  }

  // explicit date ISO yyyy-mm or yyyy-mm-dd
  let dateISO: string | undefined;
  const m2 = text.match(/к\s*(\d{4})[-\.](\d{1,2})(?:[-\.](\d{1,2}))?/);
  if (m2) {
    const [, y, mo, d] = m2;
    dateISO = `${y}-${String(mo).padStart(2,'0')}-${String(d || '01').padStart(2,'0')}`;
  }

  // purpose
  const purposeMatch = text.match(/(квартир|недвижим|авт|машин|образован|путешеств|отпуск)/);
  const purpose = purposeMatch ? purposeMatch[1] : undefined;

  if (!amount) return null;
  return { amount, months, dateISO, purpose };
}
