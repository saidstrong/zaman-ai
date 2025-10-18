export interface Transaction {
  date: string;
  amount: number;
  merchant?: string;
  category?: string;
}

export interface SpendingAnalysis {
  totalsByCategory: Record<string, number>;
  monthly: Record<string, { total: number; topCategories: Array<{ category: string; amount: number }> }>;
  advices: string[];
}

const KEYWORDS: Record<string, string> = {
  'market|super|grocer|food|еда|продукт|магнит|dostavka': 'продукты',
  'rest|cafe|кафе|bar|бургер|kfc|мак|pizza|sushi': 'еда',
  'uber|yandex|taxi|bolt|metro|bus|train|автобус|такси|метро': 'транспорт',
  'air|avia|aero|airline|flight|самолет|авиа': 'путешествия',
  'pharm|аптека|pharmacy|здоров': 'здоровье',
  'marketplace|ozon|wb|kaspi|али|aliexpress|shop|магазин|одежд|обув': 'шоппинг',
  'movie|cinema|кино|музей|театр|подписк|netflix|spotify|yandex plus': 'развлечения',
  'mobile|telecom|связь|сотов|казахтелеком|телефон': 'сервисы',
  'kom|коммун|энерго|водоканал|газ': 'счета',
};

function inferCategory(merchant: string, memo = ''): string {
  const hay = `${merchant} ${memo}`.toLowerCase();
  for (const [re, cat] of Object.entries(KEYWORDS)) {
    if (new RegExp(re, 'i').test(hay)) return cat;
  }
  return 'прочее';
}


export function analyzeSpending(transactions: Transaction[], hasCategoryColumn: boolean = false): SpendingAnalysis {
  // Calculate totals by category (only negative amounts - expenses)
  const totalsByCategory: Record<string, number> = {};
  
  // Calculate monthly totals and top categories
  const monthly: Record<string, Record<string, number>> = {};
  
  transactions.forEach(transaction => {
    // Only process negative amounts (expenses)
    if (transaction.amount >= 0) return;
    
    // Use existing category if available, otherwise categorize from merchant
    const category = hasCategoryColumn && transaction.category 
      ? transaction.category 
      : inferCategory(transaction.merchant || "", '');
    
    const month = transaction.date.substring(0, 7); // YYYY-MM
    
    // Update category totals (use absolute value for expenses)
    const expenseAmount = Math.abs(transaction.amount);
    totalsByCategory[category] = (totalsByCategory[category] || 0) + expenseAmount;
    
    // Update monthly totals
    if (!monthly[month]) {
      monthly[month] = {};
    }
    monthly[month][category] = (monthly[month][category] || 0) + expenseAmount;
  });
  
  // Convert monthly data to include top categories
  const monthlyWithTopCategories: Record<string, { total: number; topCategories: Array<{ category: string; amount: number }> }> = {};
  
  Object.keys(monthly).forEach(month => {
    const monthData = monthly[month];
    const total = Object.values(monthData).reduce((sum, amount) => sum + amount, 0);
    
    const topCategories = Object.entries(monthData)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([category, amount]) => ({ category, amount }));
    
    monthlyWithTopCategories[month] = { total, topCategories };
  });
  
  // Calculate total spending
  const totalSpending = Object.values(totalsByCategory).reduce((sum, amount) => sum + amount, 0);
  
  // Generate advices
  const advices: string[] = [];
  
  if (totalSpending > 0) {
    const foodPercentage = ((totalsByCategory["еда"] || 0) / totalSpending) * 100;
    const transportPercentage = ((totalsByCategory["транспорт"] || 0) / totalSpending) * 100;
    const shoppingPercentage = ((totalsByCategory["шоппинг"] || 0) / totalSpending) * 100;
    const otherPercentage = ((totalsByCategory["прочее"] || 0) / totalSpending) * 100;
    
    if (foodPercentage > 30) {
      advices.push("Еда > 30% — поставь лимит на доставку и кафе.");
    }
    
    if (transportPercentage > 15) {
      advices.push("Транспорт > 15% — объединяй поездки.");
    }
    
    if (shoppingPercentage > 20) {
      advices.push("Шоппинг > 20% — задерживай импульсные покупки.");
    }
    
    if (otherPercentage > 25) {
      advices.push("Много трат помечено как «прочее». Перейдите к автокатегоризации — это улучшит рекомендации.");
    }
    
    if (advices.length === 0) {
      advices.push("Хорошее распределение расходов — продолжай в том же духе!");
    }
  }
  
  return {
    totalsByCategory,
    monthly: monthlyWithTopCategories,
    advices
  };
}
