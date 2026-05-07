import { categories } from "./categories";

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

export function generateEditorialDraft(input: {
  topic?: string;
  sourceUrl?: string;
  approach?: string;
  scheduledAt?: string;
}) {
  const baseTopic = input.topic?.trim() || input.sourceUrl?.trim() || "tendencias relevantes para investidores";
  const category = pickCategory(`${baseTopic} ${input.approach ?? ""}`);
  const cleanTopic = baseTopic.replace(/^https?:\/\//, "").replace(/[/?#].*$/, "").replaceAll("-", " ");
  const slug = `${slugify(cleanTopic)}-${Date.now()}`;
  const title = `Analise Especialista: ${cleanTopic}`;
  const excerpt =
    "Conteudo profissional com abordagem de especialista para gerar confianca, contexto e decisao com criterio.";

  const sections = [
    "Contexto estrategico",
    "Diagnostico profissional",
    "Leitura de cenarios",
    "Dados que merecem atencao",
    "Impacto para pessoas e empresas",
    "Riscos e pontos cegos",
    "Como interpretar os sinais",
    "Plano pratico de acompanhamento",
    "Indicadores para monitorar",
    "Erros comuns e como evitar",
    "Oportunidades de medio prazo",
    "Conclusao executiva"
  ];

  const paragraphs = sections
    .map((section) => {
      return [
        `## ${section}`,
        `Ao analisar ${cleanTopic}, o ponto central e separar opiniao de evidencia. Uma leitura premium precisa considerar contexto, consequencias e prioridades. Isso evita decisoes por impulso e cria uma visao mais confiavel sobre o que realmente pode mudar resultados.`,
        `Na pratica, o melhor caminho e observar sinais consistentes, comparar cenarios e entender quais variaveis podem alterar a direcao do tema. Essa postura protege o leitor de promessas superficiais e transforma informacao em inteligencia aplicavel.`,
        `Para quem acompanha ${category.name.toLowerCase()}, o mais importante e construir um processo: definir o que observar, quando revisar e quais limites indicam que a tese precisa ser ajustada. Esse metodo e o que diferencia uma leitura amadora de uma abordagem de especialista.`
      ].join("\n\n");
    })
    .join("\n\n");

  const conclusion =
    "Este artigo deve ser revisado antes da publicacao final. A regra editorial do Portal M4 e manter profundidade, linguagem profissional, imagem realista e foco em utilidade pratica para o leitor.";

  return {
    slug,
    title,
    excerpt,
    content: `${paragraphs}\n\n${conclusion}`,
    imageUrl: realisticImages[category.slug] ?? realisticImages["mercado-financeiro"],
    category: category.slug,
    tags: [slugify(cleanTopic), category.slug, "portal-m4"].filter(Boolean),
    status: "review" as const,
    priority: 50,
    scheduledAt: input.scheduledAt || null,
    publishedAt: null,
    reviewerNotes: input.sourceUrl ? `Criado a partir do link: ${input.sourceUrl}` : "Criado pelo painel editorial.",
    isActive: true
  };
}
