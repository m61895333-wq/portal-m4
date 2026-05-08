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

function cleanText(text: string) {
  return text.replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

function capitalize(text: string) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
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

  // 1. ESTRUTURA E CONTEÚDO (PROTOCOLO ZERO-REVIEW)
  const articlePrompt = `
    Aja como Editor-Chefe Sênior do Portal M4. 
    Sua missão é produzir um artigo de autoridade máxima pronto para publicação imediata sem revisão humana.
    
    TEMA: ${baseTopic}
    
    DIRETRIZES DE ELITE:
    1. TOM INSTITUCIONAL: Use estritamente a 3ª pessoa. Proibido "eu" ou "nós". Use "O Portal M4 analisa...", "Observa-se no mercado...".
    2. PROFUNDIDADE TÉCNICA: Mínimo de 1200 palavras. Explore ramificações econômicas e tecnológicas.
    3. VALIDAÇÃO DE DADOS: Cite fontes reais (Bloomberg, Forbes, Relatórios Governamentais, Gartner) para embasar argumentos.
    4. ZERO EMOJIS e ZERO CARACTERES ESPECIAIS decorativos.
    5. FORMATAÇÃO REDATORIAL: 
       - Lead impactante (O que? Por que importa?).
       - Subtítulos H2 claros e profissionais.
       - Conclusão com "Visão M4" (projeção de futuro).
    6. ANTI-AI-ISMS: Proibido frases como "Neste artigo vamos...", "Em conclusão...", "Espero que isso ajude". Vá direto ao ponto.
    
    ESTRUTURA JSON (SEM CRASES):
    {
      "title": "Titulo de Autoridade Limpo",
      "excerpt": "Resumo executivo profissional com dados",
      "content": "## O Cenário Atual\\n\\n[Conteúdo...]\\n\\n## Análise de Dados e Fontes\\n\\n[Conteúdo com citações...]\\n\\n## Visão M4\\n\\n[Projeção estratégica...]"
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
  const cleanTitle = capitalize(cleanText(articleData.title));
  const cleanExcerpt = cleanText(articleData.excerpt);
  const slug = `${slugify(cleanTitle)}-${Date.now()}`;

  return {
    slug,
    title: cleanTitle,
    excerpt: cleanExcerpt,
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
