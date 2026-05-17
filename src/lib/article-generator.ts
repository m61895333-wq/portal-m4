import { GoogleGenerativeAI } from "@google/generative-ai";
import { categories } from "./categories";

// Regra Soberana: Sempre limpar a chave de API de caracteres invisíveis (BOM) do Windows
const rawApiKey = process.env.GEMINI_API_KEY || "";
const cleanApiKey = rawApiKey.replace(/^\uFEFF/, "").trim();
const geminiFallbackEnabled = process.env.GEMINI_FALLBACK_ENABLED === "true";

function getGeminiModel() {
  if (!geminiFallbackEnabled) {
    throw new Error("Gemini esta desativado por padrao. Use o worker Ollama; habilite GEMINI_FALLBACK_ENABLED=true apenas em contingencia.");
  }
  if (!cleanApiKey) {
    throw new Error("GEMINI_API_KEY nao configurada.");
  }
  const genAI = new GoogleGenerativeAI(cleanApiKey);
  return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });
}

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

  // 1. ESTRUTURA E CONTEÚDO (PROTOCOLO DE COMPLETUDE EDITORIAL)
  // O prompt agora foca em entregar um artigo EXAUSTIVO e PROFUNDO, seguindo a nova diretriz do portal.
  const articlePrompt = `
    Você é o Editor-Chefe Sênior do Portal M4, autoridade máxima em jornalismo financeiro e tecnológico.
    
    TEMA: ${baseTopic}
    
    == REGRA DE ABERTURA (OBRIGATÓRIA) ==
    Estilo sorteado: ${style.nome}
    Instrução: ${style.instrucao}
    O primeiro parágrafo DEVE seguir EXATAMENTE este estilo para capturar a atenção imediata.
    
    == ESTRUTURA DE PLANEJAMENTO ==
    1. LEAD impactante (seguindo o estilo acima)
    2. ## Análise do Cenário (Contexto global e local)
    3. ## Dados e Evidências (Cite Bloomberg, Reuters, Banco Central, Gartner)
    4. ## Impacto Prático (Como isso afeta o bolso e o dia a dia do investidor/leitor)
    5. ## Visão Estratégica M4 (Projeção para os próximos 12-24 meses)
    
    == REGRAS DE OURO ==
    1. CONTEÚDO EXAUSTIVO: Não economize informação. O artigo deve ser COMPLETO.
    2. Tom HUMANO, sofisticado e fluente — proibido ser robótico.
    3. Texto puro: SEM asteriscos, SEM negrito markdown (**palavra**).
    4. 3ª pessoa sempre. Proibido "eu", "nós", "você".
    5. No final do texto, após o conteúdo, gere um perfil visual épico.
    
    ESTRUTURA JSON ESPERADA (SEM CRASES):
    {
      "title": "Título jornalístico de alta autoridade",
      "excerpt": "Resumo impactante de 2 frases para SEO",
      "content": "Texto completo e estruturado aqui...",
      "imagePrompt": "A detailed, epic, photorealistic editorial photography description in ENGLISH for the article cover. Focus on technology, finance, high-end office, no people, cinematic lighting."
    }
    
    Responda APENAS o JSON em português do Brasil (exceto o imagePrompt que deve ser em inglês).
  `;

  // Chamada ao Gemini para gerar o conteúdo
  const res = await getGeminiModel().generateContent(articlePrompt);
  const responseText = res.response.text().replace(/```json|```/g, "").trim();
  
  let articleData;
  try {
    articleData = JSON.parse(responseText);
  } catch {
    // Fallback caso a IA falhe na formatação JSON
    console.error("Falha ao parsear JSON do Gemini", responseText);
    articleData = {
      title: "Impacto no Mercado: " + baseTopic,
      excerpt: "Análise profunda sobre " + baseTopic,
      content: "## Análise M4\n\nConteúdo gerado com fallback devido a formatação da IA.",
      imagePrompt: "modern high-tech office interior, cinematic lighting, 8k"
    };
  }

  // 3. FINALIZAÇÃO E GERAÇÃO DA IMAGEM DINÂMICA
  // Usamos o prompt gerado pela IA para criar uma imagem única via Pollinations API
  const fullContent = articleData.content;
  const cleanTitle = capitalize(cleanText(articleData.title));
  const cleanExcerpt = cleanText(articleData.excerpt);
  const slug = `${slugify(cleanTitle)}-${Date.now()}`;
  
  // Codifica o prompt de imagem para a URL
  const encodedImgPrompt = encodeURIComponent(`${articleData.imagePrompt}, high-end photorealistic editorial photography, cinematic lighting, ultra detailed, 8k`);
  const seed = Math.floor(Math.random() * 999999);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedImgPrompt}?width=1400&height=800&nologo=true&seed=${seed}`;

  return {
    slug,
    title: cleanTitle,
    excerpt: cleanExcerpt,
    content: fullContent,
    category: category.slug,
    imageUrl, // Imagem agora é contextual e inteligente
    imagePrompt: `${articleData.imagePrompt}, high-end photorealistic editorial photography, cinematic lighting, ultra detailed, 8k`,
    status: "review" as const,
    author: "Marcus Caprini",
    tags: [category.shortName, "IA", "Mercado Premium"],
    priority: 50,
    scheduledAt: input.scheduledAt || null,
    isActive: true,
    reviewerNotes: "Artigo reconstruído com IA avançada e perfil visual dinâmico."
  };
}
