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

export const totalBalance = () => (Array.isArray(accounts) ? accounts : []).reduce((s,a)=>s+a.balance,0);

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
export type Instrument = 'sukuk' | 'gold';

export type InvestResult = { 
  instrument: Instrument; 
  amount: number; 
  projected: number; 
  wakalaFee: number;
  return: number;
  returnPercent: number;
};

// Transaction tracking types
export type TransactionRecord = {
  date: string; // ISO date string
  amount: number; // negative for expenses
  merchant: string;
  category?: string;
};

// Salary plan personalization types
export type SalaryPlan = {
  salary: number;
  rent: number;
  utilities: number;
  transport: number;
  food: number;
  savings: number;
  other: Array<{ label: string; amount: number }>;
  lastUpdated: string;
};

export type Goal = { sum: number; dateISO?: string };

export type AllocationResult = {
  categories: {
    rent: { amount: number; percentage: number };
    utilities: { amount: number; percentage: number };
    transport: { amount: number; percentage: number };
    food: { amount: number; percentage: number };
    savings: { amount: number; percentage: number };
    other: { amount: number; percentage: number };
    buffer: { amount: number; percentage: number };
  };
  total: number;
  isValid: boolean;
  error?: string;
};

// Safe helper functions
export function safeDate(d?: string): Date | null {
  const t = d ? Date.parse(d) : NaN;
  return Number.isFinite(t) ? new Date(t) : null;
}

export function monthsBetween(fromISO?: string, toISO?: string): number | null {
  const a = safeDate(fromISO);
  const b = safeDate(toISO ?? new Date().toISOString());
  if (!a || !b) return null;
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return months;
}

export function monthlySaving(goal?: Goal): number | null {
  if (!goal || !goal.sum) return null;
  const months = monthsBetween(new Date().toISOString(), goal.dateISO);
  if (!months || months <= 0) return null;
  return Math.ceil(goal.sum / months);
}

// Runtime assertion utility
export function assert<T>(value: T | null | undefined, fallback: T): T {
  return value ?? fallback;
}

export function simulateInvestment(amount: number, instrument: Instrument): InvestResult {
  const wakalaFee = Math.round(amount * 0.001); // 0.1% wakala fee
  
  let returnPercent: number;
  
  switch (instrument) {
    case 'sukuk':
      returnPercent = 0.08 + (Math.random() - 0.5) * 0.02; // 6-10% range
      break;
    case 'gold':
      returnPercent = 0.05 + (Math.random() - 0.5) * 0.03; // 3.5-6.5% range
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

// Transaction tracking functions
export function addTransaction(transaction: TransactionRecord): void {
  if (typeof window === 'undefined') return;
  
  try {
    const existing = localStorage.getItem('transactions');
    const transactions: TransactionRecord[] = existing ? JSON.parse(existing) : [];
    transactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));
  } catch (error) {
    console.error('Failed to save transaction:', error);
  }
}

export function getTransactions(): TransactionRecord[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const existing = localStorage.getItem('transactions');
    if (!existing) return [];
    
    const parsed = JSON.parse(existing);
    // Validate that parsed data is an array
    if (!Array.isArray(parsed)) {
      console.warn('Invalid transactions data found, returning empty array');
      return [];
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to load transactions:', error);
    return [];
  }
}

// Allocation engine
export function calculateAllocation(plan: SalaryPlan): AllocationResult {
  // Add type guards
  if (!plan || typeof plan !== 'object') {
    return {
      categories: {
        rent: { amount: 0, percentage: 0 },
        utilities: { amount: 0, percentage: 0 },
        transport: { amount: 0, percentage: 0 },
        food: { amount: 0, percentage: 0 },
        savings: { amount: 0, percentage: 0 },
        other: { amount: 0, percentage: 0 },
        buffer: { amount: 0, percentage: 0 }
      },
      total: 0,
      isValid: false,
      error: 'Invalid salary plan provided.'
    };
  }

  const total = plan.salary || 0;
  const otherSum = (Array.isArray(plan.other) ? plan.other : []).reduce((sum, item) => sum + (item?.amount || 0), 0);
  const fixedSum = plan.rent + plan.utilities + plan.transport + plan.food + otherSum;
  const remainder = total - fixedSum;

  if (remainder < 0) {
    return {
      categories: {
        rent: { amount: plan.rent, percentage: 0 },
        utilities: { amount: plan.utilities, percentage: 0 },
        transport: { amount: plan.transport, percentage: 0 },
        food: { amount: plan.food, percentage: 0 },
        savings: { amount: 0, percentage: 0 },
        other: { amount: otherSum, percentage: 0 },
        buffer: { amount: 0, percentage: 0 }
      },
      total,
      isValid: false,
      error: 'План превышает зарплату, скорректируйте категории.'
    };
  }

  const savings = Math.min(plan.savings, remainder);
  const buffer = remainder - savings;

  return {
    categories: {
      rent: { amount: plan.rent, percentage: (plan.rent / total) * 100 },
      utilities: { amount: plan.utilities, percentage: (plan.utilities / total) * 100 },
      transport: { amount: plan.transport, percentage: (plan.transport / total) * 100 },
      food: { amount: plan.food, percentage: (plan.food / total) * 100 },
      savings: { amount: savings, percentage: (savings / total) * 100 },
      other: { amount: otherSum, percentage: (otherSum / total) * 100 },
      buffer: { amount: buffer, percentage: (buffer / total) * 100 }
    },
    total,
    isValid: true
  };
}

// Salary plan functions
export function saveSalaryPlan(plan: SalaryPlan): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('salary_plan', JSON.stringify(plan));
  } catch (error) {
    console.error('Failed to save salary plan:', error);
  }
}

export function getSalaryPlan(): SalaryPlan | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const existing = localStorage.getItem('salary_plan');
    if (!existing) return null;
    
    const parsed = JSON.parse(existing);
    // Validate that parsed data has required structure
    if (!parsed || typeof parsed !== 'object' || typeof parsed.salary !== 'number') {
      console.warn('Invalid salary plan data found, returning null');
      return null;
    }
    
    // Ensure other is an array
    if (!Array.isArray(parsed.other)) {
      parsed.other = [];
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to load salary plan:', error);
    return null;
  }
}

// Safe goal storage functions
export function saveGoal(goal: Goal): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('goal', JSON.stringify(goal));
  } catch (error) {
    console.error('Failed to save goal:', error);
  }
}

export function getGoal(): Goal | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const existing = localStorage.getItem('goal');
    if (!existing) return null;
    
    const parsed = JSON.parse(existing);
    // Validate that parsed data has required structure
    if (!parsed || typeof parsed !== 'object' || typeof parsed.sum !== 'number') {
      console.warn('Invalid goal data found, returning null');
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to load goal:', error);
    return null;
  }
}
