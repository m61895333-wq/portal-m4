import { GoogleGenerativeAI } from "@google/generative-ai";
import { categories } from "./categories";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const baseTopic = input.topic?.trim() || input.sourceUrl?.trim() || "tendencias relevantes para investidores";
  const category = pickCategory(`${baseTopic} ${input.approach ?? ""}`);
  
  console.log(`[Gerador] Iniciando pauta para: ${baseTopic}`);

  // 1. Gerar Estrutura (Título, Excerpt e Tópicos)
  const structurePrompt = `
    Voce e um Editor-Chefe de um portal premium (Portal M4). 
    Assunto: ${baseTopic}
    Abordagem: ${input.approach ?? "Profissional, tecnica e de mercado"}
    
    Crie uma estrutura para um artigo epico de mais de 3000 palavras.
    Retorne EXATAMENTE um JSON no formato:
    {
      "title": "Titulo chamativo e profissional",
      "excerpt": "Resumo persuasivo de 2 frases",
      "sections": ["Titulo da Secao 1", "Titulo da Secao 2", ..., "Titulo da Secao 12"]
    }
    Gere no minimo 12 secoes para garantir profundidade.
  `;

  const structureResult = await model.generateContent(structurePrompt);
  const structureJson = JSON.parse(structureResult.response.text().replace(/```json|```/g, ""));
  
  console.log(`[Gerador] Estrutura criada: ${structureJson.title} com ${structureJson.sections.length} secoes.`);

  // 2. Gerar cada secao individualmente para manter a profundidade
  let fullContent = "";
  for (let i = 0; i < structureJson.sections.length; i++) {
    const sectionTitle = structureJson.sections[i];
    console.log(`[Gerador] Escrevendo secao ${i + 1}/${structureJson.sections.length}: ${sectionTitle}`);
    
    const sectionPrompt = `
      Escreva a secao "${sectionTitle}" para o artigo "${structureJson.title}".
      Contexto: Este e um artigo premium do Portal M4. O publico e exigente.
      Foco: ${baseTopic}.
      
      Instrucoes:
      - Use markdown (## para titulo se necessario).
      - Seja extremamente detalhado, use dados hipoteticos realistas, analises de cenario e exemplos.
      - Escreva no minimo 300 a 400 palavras SOMENTE para esta secao.
      - Linguagem profissional e persuasiva.
    `;
    
    const sectionResult = await model.generateContent(sectionPrompt);
    fullContent += `## ${sectionTitle}\n\n${sectionResult.response.text()}\n\n`;
  }

  const slug = `${slugify(structureJson.title)}-${Date.now()}`;

  return {
    slug,
    title: structureJson.title,
    excerpt: structureJson.excerpt,
    content: fullContent,
    imageUrl: realisticImages[category.slug] ?? realisticImages["mercado-financeiro"],
    category: category.slug,
    tags: [slugify(category.name), "portal-m4", "analise-premium"].filter(Boolean),
    status: "review" as const,
    priority: 50,
    scheduledAt: input.scheduledAt || null,
    publishedAt: null,
    reviewerNotes: input.sourceUrl ? `Link: ${input.sourceUrl}` : "IA-Generated Premium Content",
    isActive: true
  };
}
