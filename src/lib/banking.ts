// Banking mock data and AI allocation logic

export type Currency = 'KZT';
export type AccountType = 'card' | 'savings' | 'buffer';
export type Account = { 
  id: string; 
  name: string; 
  balance: number; 
  currency: Currency; 
  type: AccountType 
};

export const accounts: Account[] = [
  { id:'acc-card', name:'Карта', balance: 320000, currency:'KZT', type:'card' },
  { id:'acc-save', name:'Сберегательный', balance: 780000, currency:'KZT', type:'savings' },
  { id:'acc-buf', name:'Буфер', balance: 50000, currency:'KZT', type:'buffer' }
];

export const totalBalance = () => accounts.reduce((s,a)=>s+a.balance,0);

export type Envelope = { key: string; title: string; limit: number; type: 'fixed' | 'percent' };

export const defaultEnvelopes: Envelope[] = [
  { key:'rent', title:'Аренда жилья', limit: 200000, type:'fixed' },
  { key:'utilities',title:'Ком. услуги', limit: 40000, type:'fixed' },
  { key:'food', title:'Еда', limit: 15, type:'percent' },
  { key:'transport',title:'Транспорт', limit: 5, type:'percent' },
  { key:'shopping',title:'Шоппинг', limit: 10, type:'percent' },
  { key:'insurance',title:'Страхование', limit: 5, type:'percent' }
];

export type AllocationPlan = {
  plan: Record<string, { title: string; allocated: number; type: 'fixed' | 'percent' }>;
  toSavings: number;
};

export function allocateSalary(salary: number, envelopes = defaultEnvelopes): AllocationPlan {
  const byKey: Record<string, { title: string; allocated: number; type: 'fixed' | 'percent' }> = {};
  let allocated = 0;
  
  for (const e of envelopes) {
    const value = e.type === 'fixed' ? e.limit : Math.round((e.limit/100)*salary);
    byKey[e.key] = { title: e.title, allocated: value, type: e.type };
    allocated += value;
  }
  
  const toSavings = Math.max(0, Math.round(salary - allocated)); // остаток в сбережения
  return { plan: byKey, toSavings };
}

export function coverOverage(amount: number, buffer = accounts.find(a => a.type === 'buffer')!) {
  const used = Math.min(buffer.balance, amount);
  buffer.balance -= used;
  const remaining = amount - used;
  return { covered: used, remaining }; // remaining > 0 indicates STOP
}

// Investment simulation types
export type Instrument = 'sukuk' | 'halal_equities' | 'gold' | 'crypto';

export type InvestResult = { 
  instrument: Instrument; 
  amount: number; 
  projected: number; 
  wakalaFee: number;
  return: number;
  returnPercent: number;
};

export function simulateInvestment(amount: number, instrument: Instrument): InvestResult {
  const wakalaFee = Math.round(amount * 0.001); // 0.1% wakala fee
  
  let returnPercent: number;
  
  switch (instrument) {
    case 'sukuk':
      returnPercent = 0.08 + (Math.random() - 0.5) * 0.02; // 6-10% range
      break;
    case 'halal_equities':
      returnPercent = 0.12 + (Math.random() - 0.5) * 0.04; // 10-14% range
      break;
    case 'gold':
      returnPercent = 0.05 + (Math.random() - 0.5) * 0.03; // 3.5-6.5% range
      break;
    case 'crypto':
      returnPercent = -0.2 + Math.random() * 0.4; // -20% to +20% range
      break;
  }
  
  const returnAmount = Math.round((amount - wakalaFee) * returnPercent);
  const projectedValue = amount - wakalaFee + returnAmount;
  
  return {
    instrument,
    amount,
    wakalaFee,
    projected: projectedValue,
    return: returnAmount,
    returnPercent: Math.round(returnPercent * 100 * 100) / 100 // Round to 2 decimal places
  };
}
