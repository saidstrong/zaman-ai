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

function categorizeMerchant(merchant: string): string {
  if (!merchant) return "прочее";
  const s = merchant.toLowerCase();
  
  if (/(corner meal|kfc|mcd|hardees|hp canteen|qazaq catering|mood|wedrink)/.test(s)) return "еда";
  if (/(yandex.go|taxi|onay|indrive|uber)/.test(s)) return "транспорт";
  if (/(magnum|small|galmart|cash&carry)/.test(s)) return "продукты";
  if (/(lc waikiki|reserved|h&m|ostin|technodom|miniso|leonardo)/.test(s)) return "шоппинг";
  if (/(kino.kz|chaplin|funky town)/.test(s)) return "развлечения";
  if (/(yandex.plus|cursor|ai powered ide)/.test(s)) return "сервисы";
  if (/(перевод|пополнение|депозит)/.test(s)) return "переводы/пополнения";
  
  return "прочее";
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
      : categorizeMerchant(transaction.merchant || "");
    
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
    
    if (foodPercentage > 30) {
      advices.push("Еда > 30% — поставь лимит на доставку и кафе.");
    }
    
    if (transportPercentage > 15) {
      advices.push("Транспорт > 15% — объединяй поездки.");
    }
    
    if (shoppingPercentage > 20) {
      advices.push("Шоппинг > 20% — задерживай импульсные покупки.");
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
