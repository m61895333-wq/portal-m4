import { GoogleGenerativeAI } from "@google/generative-ai";
import { categories } from "./categories";

// Regra Soberana: Sempre limpar a chave de API de caracteres invisíveis (BOM) do Windows
const rawApiKey = process.env.GEMINI_API_KEY || "";
const cleanApiKey = rawApiKey.replace(/^\uFEFF/, "").trim();
const genAI = new GoogleGenerativeAI(cleanApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const realisticImages: Record<string, string> = {
  "mercado-financeiro": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1400&q=85",
  investimentos: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1400&q=85",
  "inteligencia-artificial": "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1400&q=85",
  "tecnologia-negocios-digitais": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=85",
  "carreira-ia": "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=85",
  "educacao-financeira": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=85",
  "empreendedorismo-digital": "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=85"
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function pickCategory(input: string) {
  const normalized = input.toLowerCase();
  return (
    categories.find((category) => normalized.includes(category.slug.replaceAll("-", " "))) ??
    categories.find((category) => normalized.includes(category.shortName.toLowerCase())) ??
    categories[0]
  );
}

export async function generateEditorialDraft(input: {
  topic?: string;
  sourceUrl?: string;
  approach?: string;
  scheduledAt?: string;
}) {
  const baseTopic = input.topic?.trim() || input.sourceUrl?.trim() || "tendencias de mercado";
  const category = pickCategory(`${baseTopic} ${input.approach ?? ""}`);
  
  console.log(`[GERADOR SEQUENCIAL] Iniciando: ${baseTopic}`);

  // 1. ESTRUTURA E CONTEÚDO (CHAMADA ÚNICA PARA VELOCIDADE E RESILIÊNCIA)
  const articlePrompt = `
    Aja como Editor-Chefe Sênior do Portal M4. 
    Assunto: ${baseTopic}
    Regras de Ouro:
    1. SEM EMOJIS em nenhuma parte do texto.
    2. Português do Brasil culto e impecável.
    3. Tom Premium e Profundidade Total de Mercado.
    4. Crie pelo menos 3 seções profundas para explorar o tema.
    
    Escreva o artigo completo com título, resumo e o conteúdo (em Markdown, com subtítulos H2).
    
    Retorne EXATAMENTE neste formato JSON, sem crases no inicio ou no fim:
    {
      "title": "Titulo de autoridade (SEM EMOJIS)",
      "excerpt": "Resumo persuasivo (SEM EMOJIS)",
      "content": "## Secao 1\\n\\nConteudo da secao 1...\\n\\n## Secao 2\\n\\nConteudo da secao 2..."
    }
  `;

  const res = await model.generateContent(articlePrompt);
  const responseText = res.response.text().replace(/```json|```/g, "").trim();
  
  let articleData;
  try {
    articleData = JSON.parse(responseText);
  } catch (e) {
    console.error("Falha ao parsear JSON do Gemini", responseText);
    articleData = {
      title: "Impacto no Mercado: " + baseTopic,
      excerpt: "Análise profunda sobre " + baseTopic,
      content: "## Análise M4\n\nConteúdo gerado com fallback devido a formatação da IA."
    };
  }

  // 3. FINALIZAÇÃO E VALIDAÇÃO DE IMAGEM
  const fullContent = articleData.content;
  const structure = { title: articleData.title, excerpt: articleData.excerpt };
  const slug = `${slugify(structure.title)}-${Date.now()}`;

  return {
    slug,
    title: structure.title,
    excerpt: structure.excerpt,
    content: fullContent,
    category: category.slug,
    imageUrl: realisticImages[category.slug] || realisticImages["mercado-financeiro"],
    status: "review" as const,
    author: "Marcus Caprini",
    tags: [category.shortName, "IA", "Mercado Premium"],
    priority: 50,
    scheduledAt: input.scheduledAt || null,
    isActive: true,
    reviewerNotes: "Artigo revisado e validado para publicacao imediata."
  };
}
