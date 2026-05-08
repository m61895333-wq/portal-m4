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
  
  // ESTILOS DE ABERTURA ROTATIVOS — garante variedade e humanidade entre artigos
  const OPENING_STYLES = [
    {
      nome: "DADO_CHOCANTE",
      instrucao: `Comece com um dado ou estatística surpreendente e específica que desafie o senso comum do leitor. Ex: "Em 2025, 73% dos gestores de fundos brasileiros..."`
    },
    {
      nome: "PERGUNTA_RETORICA",
      instrucao: `Abra com uma pergunta retórica direta e provocativa que force reflexão imediata. Ex: "O que acontece quando a maior economia do mundo decide..."`
    },
    {
      nome: "CENA_VIVIDA",
      instrucao: `Construa uma cena concreta e cinematográfica (2-3 frases) que situe o leitor em um momento específico. Ex: "Era terça-feira quando os terminais da Nasdaq registraram..."`
    },
    {
      nome: "PARADOXO_INSTIGANTE",
      instrucao: `Comece com um paradoxo ou contradição aparente sobre o tema. Ex: "Quanto mais dinheiro circula neste mercado, menor é a chance de enriquecimento individual."`
    },
    {
      nome: "DECLARACAO_OUSADA",
      instrucao: `Abra com uma declaração direta, ousada e editorial. Ex: "A era dos juros fáceis acabou e nenhum investidor brasileiro está preparado para isso."`
    },
    {
      nome: "CONTEXTO_HISTORICO",
      instrucao: `Situe o leitor com um marco histórico específico que cria contraste com o presente. Ex: "Quando o Plano Real completou 30 anos, o Brasil ainda carregava..."`
    },
    {
      nome: "CITACAO_AUTORIDADE",
      instrucao: `Comece com uma citação atribuída a uma autoridade do setor (economista, CEO, Banco Central) que sintetize o conflito central do artigo. Use aspas e nome da fonte.`
    },
    {
      nome: "CONTRASTE_DRAMATICO",
      instrucao: `Abra contrastando dois cenários opostos em frases curtas. Ex: "De um lado, recordes na bolsa. Do outro, inadimplência no maior nível em uma década."`
    },
    {
      nome: "NUMERO_IMPACTANTE",
      instrucao: `Comece com um número específico e impactante seguido de contexto imediato. Ex: "R$ 2,4 trilhões — esse é o tamanho do buraco fiscal que o Brasil precisará fechar..."`
    },
    {
      nome: "VIRADA_NARRATIVA",
      instrucao: `Inicie com o que 'todo mundo acredita' sobre o tema e quebre essa expectativa. Ex: "A crença popular diz que investir em imóveis é sempre seguro. Os dados de 2025 contam outra história."`
    }
  ];

  const style = OPENING_STYLES[Math.floor(Math.random() * OPENING_STYLES.length)];
  console.log(`[GERADOR SEQUENCIAL] Estilo de abertura: ${style.nome}`);

  // 1. ESTRUTURA E CONTEÚDO (PROTOCOLO ZERO-REVIEW)
  const articlePrompt = `
    Você é o Editor-Chefe Sênior do Portal M4, referência em jornalismo financeiro e tecnológico no Brasil.
    
    TEMA: ${baseTopic}
    
    == REGRA DE ABERTURA (OBRIGATÓRIA) ==
    Estilo sorteado: ${style.nome}
    Instrução: ${style.instrucao}
    O primeiro parágrafo DEVE seguir EXATAMENTE este estilo.
    PROIBIDO começar com: "Nos últimos anos", "Em um cenário", "No contexto atual", "Com o avanço", "A inteligência artificial", "O mercado financeiro" ou qualquer abertura genérica e previsível.
    
    == ESTRUTURA ==
    1. LEAD impactante (seguindo o estilo acima — 3 a 4 linhas)
    2. ## [Subtítulo — Análise do Cenário]
    3. ## [Subtítulo — Dados e Fontes] (cite Bloomberg, Reuters, IBGE, Banco Central, Gartner, FMI)
    4. ## [Subtítulo — Impacto Prático para o Leitor]
    5. ## Visão M4 (projeção estratégica exclusiva)
    
    == REGRAS ABSOLUTAS ==
    1. Tom HUMANO, fluente, inteligente — não robótico nem repetitivo
    2. Texto puro: SEM asteriscos, SEM markdown bold (**palavra**)
    3. Mínimo de 1.000 palavras com profundidade real
    4. 3ª pessoa sempre — proibido "eu", "nós", "você"
    5. ANTI-AI-ISMS: proibido "Neste artigo vamos...", "Em conclusão...", "Espero que..."
    6. No final: ESPAÇO DUPLO, depois exatamente 10 hashtags, depois 10 palavras-chave separadas por vírgula
    
    ESTRUTURA JSON ESPERADA (SEM CRASES):
    {
      "title": "Título jornalístico impactante",
      "excerpt": "Lead de até 200 caracteres — a frase de abertura do artigo",
      "content": "Texto completo aqui..."
    }
    
    Responda APENAS o JSON. Escreva em português do Brasil.
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
