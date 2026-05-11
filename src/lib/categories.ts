export type Category = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  image: string;
  accent: string;
};

export const categories: Category[] = [
  {
    slug: "mercado-financeiro",
    name: "Mercado financeiro",
    shortName: "Mercado",
    description: "Analises sobre juros, inflacao, bolsa, economia e movimentos que impactam investidores.",
    image: "/portal-m4-tech-market.svg",
    accent: "#20d9ff"
  },
  {
    slug: "investimentos",
    name: "Investimentos",
    shortName: "Investimentos",
    description: "Estrategias, riscos, renda fixa, renda variavel e construcao de patrimonio com criterio.",
    image: "/portal-m4-tech-invest.svg",
    accent: "#35f2b9"
  },
  {
    slug: "inteligencia-artificial",
    name: "Inteligencia artificial",
    shortName: "IA",
    description: "IA aplicada a negocios, produtividade, automacao e novas oportunidades profissionais.",
    image: "/portal-m4-tech-ai.svg",
    accent: "#3b82f6"
  },
  {
    slug: "tecnologia-negocios-digitais",
    name: "Tecnologia e negocios digitais",
    shortName: "Tecnologia",
    description: "Ferramentas, plataformas, tendencias digitais e operacoes online de alta performance.",
    image: "/portal-m4-tech-hero.svg",
    accent: "#7dd3fc"
  },
  {
    slug: "carreira-ia",
    name: "Carreira na era da IA",
    shortName: "Carreira",
    description: "Mercado de trabalho, novas habilidades e como profissionais podem evoluir com IA.",
    image: "/portal-m4-tech-ai.svg",
    accent: "#a5b4fc"
  },
  {
    slug: "educacao-financeira",
    name: "Educacao financeira",
    shortName: "Educacao",
    description: "Conteudos praticos para organizar dinheiro, tomar decisoes melhores e reduzir riscos.",
    image: "/portal-m4-tech-invest.svg",
    accent: "#fbbf24"
  },
  {
    slug: "empreendedorismo-digital",
    name: "Empreendedorismo digital",
    shortName: "Empreendedorismo",
    description: "Modelos de negocio, canais digitais, automacao e crescimento com tecnologia.",
    image: "/portal-m4-tech-market.svg",
    accent: "#22c55e"
  }
];

export function getCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function categoryName(slugOrDbValue: string) {
  // Aceita tanto slug ("mercado-financeiro") quanto valor do banco ("MERCADO FINANCEIRO")
  const directMatch = getCategory(slugOrDbValue);
  if (directMatch) return directMatch.name;

  // Normaliza o valor do banco para slug e tenta novamente
  const normalized = slugOrDbValue
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return getCategory(normalized)?.name ?? slugOrDbValue;
}
