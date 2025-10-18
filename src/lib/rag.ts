// Islamic Finance Glossary - Short passages for RAG context
export const DOCS = [
  "Мурабаха - это исламская форма финансирования, где банк покупает товар для клиента и перепродает ему с заранее согласованной прибылью. Клиент выплачивает стоимость товара плюс маржу частями.",
  
  "Иджара - это исламский лизинг, где банк покупает актив и сдает его клиенту в аренду за фиксированную плату. В конце срока клиент может выкупить актив по остаточной стоимости.",
  
  "Таваррук - это исламская схема получения наличных средств, где клиент покупает товар в кредит, затем сразу продает его третьей стороне за наличные по рыночной цене.",
  
  "Харам в исламе означает запрещенные действия или товары, такие как алкоголь, свинина, азартные игры. Халяль - разрешенное, соответствующее исламским принципам.",
  
  "Риба - это запрещенный в исламе процент или ростовщичество. Любые заранее фиксированные проценты по кредитам считаются риба и запрещены шариатом.",
  
  "Маржа в исламских финансах - это прибыль банка, которая заранее согласована и не зависит от времени. Маржа должна отражать реальную стоимость услуг банка.",
  
  "Исламский вклад - это сберегательный продукт, где банк инвестирует средства клиента в халяльные активы и делит прибыль или убытки согласно принципу мудараба.",
  
  "Исламская карта - это платежный инструмент, который работает на основе принципа кафала (поручительства) или вадиа (хранения), без начисления процентов.",
  
  "Шариат - это исламский закон, основанный на Коране и Сунне. Все исламские финансовые продукты должны соответствовать принципам шариата.",
  
  "Мудараба - это партнерство, где одна сторона предоставляет капитал (рабб-уль-маль), а другая - управление и труд (мудариб). Прибыль делится по соглашению, убытки несет только инвестор.",
  
  "Мушарака - это совместное предприятие, где все партнеры участвуют в капитале и управлении. Прибыль и убытки распределяются пропорционально долям участия.",
  
  "Вадиа - это хранение средств в банке на принципе аманат (доверия). Банк гарантирует возврат основной суммы, но не обещает прибыль."
];

// Cache for embeddings
let cachedEmbeddings: { texts: string[], vectors: number[][] } | null = null;

// Cosine similarity calculation
function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Generate embeddings for texts (server-side)
export async function embedTexts(texts: string[]): Promise<number[][]> {
  try {
    const baseUrl = process.env.ZAMAN_BASE_URL;
    const apiKey = process.env.ZAMAN_API_KEY;
    
    if (!baseUrl || !apiKey) {
      throw new Error('Missing ZAMAN_BASE_URL or ZAMAN_API_KEY environment variables');
    }
    
    const response = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ 
        input: texts,
        model: 'text-embedding-3-small'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Embeddings API failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data.map((item: { embedding: number[] }) => item.embedding);
  } catch (error) {
    console.error('Failed to generate embeddings:', error);
    throw error;
  }
}

// Load cached embeddings or generate new ones
async function loadEmbeddings(): Promise<{ texts: string[], vectors: number[][] }> {
  if (cachedEmbeddings) {
    return cachedEmbeddings;
  }
  
  try {
    // Try to load from cache
    const response = await fetch('/embeds.json');
    if (response.ok) {
      const cached = await response.json();
      if (cached.texts && cached.vectors && 
          cached.texts.length === DOCS.length) {
        cachedEmbeddings = cached;
        return cached;
      }
    }
  } catch {
    console.log('No cached embeddings found, generating new ones...');
  }
  
  try {
    // Generate new embeddings
    const vectors = await embedTexts(DOCS);
    const embeddings = { texts: DOCS, vectors };
    
    // Cache embeddings (this would be done server-side in production)
    cachedEmbeddings = embeddings;
    return embeddings;
  } catch (error) {
    console.error('Failed to load embeddings:', error);
    throw error;
  }
}

// Search for relevant passages
export async function search(query: string, k: number = 3): Promise<string[]> {
  try {
    const { texts, vectors } = await loadEmbeddings();
    
    // Embed the query
    const queryVector = await embedTexts([query]);
    const queryEmbedding = queryVector[0];
    
    // Calculate similarities
    const similarities = vectors.map((vector, index) => ({
      text: texts[index],
      similarity: cosine(queryEmbedding, vector)
    }));
    
    // Sort by similarity and return top k
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k)
      .map(item => item.text);
  } catch (error) {
    console.error('RAG search failed:', error);
    return []; // Return empty array on failure
  }
}
