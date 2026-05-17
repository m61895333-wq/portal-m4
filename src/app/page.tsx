import Link from "next/link";
import { categories, categoryName } from "@/lib/categories";
import { listPublicPosts } from "@/lib/portal-cms";
import { Header, Footer } from "./site-shell";
import styles from "./portal.module.css";

// Artigos de demonstração de altíssima qualidade para preencher o design caso o banco esteja vazio
const MOCK_POSTS = [
  {
    id: "mock-1",
    slug: "a-revolucao-silenciosa-agentes-de-ia-nos-negocios",
    title: "A Revolução Silenciosa: Como Agentes de IA Estão Redesenhando os Negócios Digitais em 2026",
    excerpt: "Da automação de tarefas simples a tomadas de decisões corporativas complexas, os novos modelos de ação autônoma saíram dos laboratórios para se tornarem o principal motor de produtividade e margem operacional nas empresas brasileiras.",
    content: "Artigo completo para fins de demonstração visual.",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop",
    category: "INTELIGENCIA ARTIFICIAL",
    tags: ["IA", "Automação", "Negócios", "Futuro"],
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    isActive: true
  },
  {
    id: "mock-2",
    slug: "selic-em-dois-digitos-futuro-do-credito",
    title: "Selic em Dois Dígitos: Os Impactos e Perspectivas para o Crédito Corporativo",
    excerpt: "Com a taxa básica de juros mantida em patamares elevados, o custo de capital desafia médias e grandes empresas. Analisamos as alternativas viáveis no mercado de capitais.",
    content: "Artigo completo para fins de demonstração de destaques.",
    imageUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=2070&auto=format&fit=crop",
    category: "MERCADO FINANCEIRO",
    tags: ["Selic", "Crédito", "Macroeconomia"],
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    isActive: true
  },
  {
    id: "mock-3",
    slug: "alocacao-estrategica-renda-fixa-segundo-semestre",
    title: "Alocação Estratégica: Onde Encontrar Prêmio Real em Renda Fixa Este Ano",
    excerpt: "Títulos indexados à inflação e crédito privado premium surgem como as principais escolhas de analistas para blindar carteiras contra volatilidade.",
    content: "Artigo de investimentos para demonstração.",
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop",
    category: "INVESTIMENTOS",
    tags: ["Investimentos", "Renda Fixa", "Bolsa"],
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    isActive: true
  },
  {
    id: "mock-4",
    slug: "saas-em-escala-otimizacao-custos-cloud",
    title: "SaaS em Escala: Como Otimizar Custos de Infraestrutura de Cloud Sem Perder Performance",
    excerpt: "Políticas eficientes de provisionamento e conteinerização inteligente trazem economia média de até 35% no faturamento de provedores digitais.",
    content: "Artigo técnico sobre cloud.",
    imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2070&auto=format&fit=crop",
    category: "TECNOLOGIA",
    tags: ["Tech", "SaaS", "Cloud", "DevOps"],
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    isActive: true
  },
  {
    id: "mock-5",
    slug: "habilidades-requisitas-era-sistemas-cognitivos",
    title: "As Habilidades Mais Requisitadas na Era dos Sistemas Cognitivos e IA Generativa",
    excerpt: "A capacidade de arquitetar fluxos de trabalho híbridos e liderar projetos integrados a modelos de linguagem avançados tornou-se o divisor de águas no recrutamento executivo.",
    content: "Artigo de carreira.",
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976&auto=format&fit=crop",
    category: "CARREIRA",
    tags: ["Carreira", "Liderança", "IA", "RH"],
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    isActive: true
  },
  {
    id: "mock-6",
    slug: "bootstrapping-vs-venture-capital-no-brasil",
    title: "Bootstrapping vs. Venture Capital: O Dilema de Crescimento das Startups em 2026",
    excerpt: "Com a escassez de rodadas de investimento tradicionais, fundadores brasileiros priorizam geração de caixa e sustentabilidade desde o primeiro dia.",
    content: "Artigo sobre startups.",
    imageUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=1974&auto=format&fit=crop",
    category: "TECNOLOGIA",
    tags: ["Startups", "Venture Capital", "Negócios"],
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    isActive: true
  }
];

/**
 * HomePage - PORTAL TESTE
 * Layout premium e minimalista baseado em grandes publicações (Medium, Substack, TechCrunch).
 * Desenvolvido em área de sandbox (portal_teste) para estudo de conversão visual.
 */
export default async function HomePage() {
  const dbPosts = await listPublicPosts();
  
  // Utiliza mock data se o banco estiver vazio ou incompleto para demonstrar a beleza do design
  const posts = dbPosts && dbPosts.length >= 4 ? dbPosts : MOCK_POSTS;

  // Segmentação de Destaques e Grade Editorial
  const hero = posts[0];
  // 3 posts secundários exibidos na coluna lateral "Destaques Rápidos" no topo
  const latestColumnPosts = posts.slice(1, 4);
  // O restante dos artigos segue para o Feed Principal na parte inferior
  const feedPosts = posts.slice(4);

  // Extração dinâmica de tags únicas dos posts publicados
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).slice(0, 12);

  return (
    <div className={styles.cleanTheme}>
      {/* 1. TOP NAVBAR MINIMALISTA COMPARTILHADA */}
      <Header />

      {/* 2. CATEGORY PILL STRIP */}
      <div className={styles.cleanCategoryStrip}>
        <div className={styles.cleanThemeContainer}>
          <div className={styles.cleanCategoryList}>
            {categories.map((category) => (
              <Link 
                key={category.slug} 
                href={`/artigos?categoria=${category.slug}`} 
                className={styles.cleanCategoryPill}
              >
                {category.shortName}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 3. HERO SPOTLIGHT SECTION (Grade Bipartida) */}
      <section className={styles.cleanHeroSection}>
        <div className={styles.cleanThemeContainer}>
          <div className={styles.cleanHeroGrid}>
            
            {/* Artigo Principal em Destaque (Esquerda - 2/3) */}
            <article className={styles.cleanHeroFeaturedCard}>
              <Link href={`/artigo/${hero.slug}`} className={styles.cleanHeroImageWrapper}>
                <img src={hero.imageUrl} alt={hero.title} />
              </Link>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className={styles.cleanMetaLabel}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#2563eb", display: "inline-block" }}></span>
                  {categoryName(hero.category)}
                </span>
                <Link href={`/artigo/${hero.slug}`}>
                  <h1 className={styles.cleanHeroTitle}>
                    {hero.title}
                  </h1>
                </Link>
                <p className={styles.cleanHeroExcerpt}>
                  {hero.excerpt}
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, flexWrap: "wrap", gap: 12 }}>
                  <Link href={`/artigo/${hero.slug}`} className={styles.cleanReadMoreLink}>
                    Ler artigo completo &rarr;
                  </Link>
                  <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
                    {new Date(hero.publishedAt || hero.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • 5 min de leitura
                  </span>
                </div>
              </div>
            </article>

            {/* Destaques Rápidos Verticais (Direita - 1/3) */}
            <aside className={styles.cleanLatestColumn}>
              <div>
                <span className={styles.cleanSidebarSectionTitle}>Destaques Rápidos</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {latestColumnPosts.length > 0 ? (
                  latestColumnPosts.map((post) => (
                    <article key={post.id} className={styles.cleanLatestItem}>
                      <span className={styles.cleanMetaLabel} style={{ fontSize: "0.7rem" }}>
                        {categoryName(post.category)}
                      </span>
                      <Link href={`/artigo/${post.slug}`}>
                        <h3 className={styles.cleanLatestItemTitle}>
                          {post.title}
                        </h3>
                      </Link>
                      <div className={styles.cleanLatestItemMeta}>
                        <span>Por Equipe Editorial M4</span>
                        <span>•</span>
                        <span>
                          {new Date(post.publishedAt || post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </article>
                  ))
                ) : (
                  <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Nenhum destaque adicional publicado.</p>
                )}
              </div>
            </aside>

          </div>
        </div>
      </section>

      {/* 4. FEED PRINCIPAL E BARRA LATERAL INTEGRADA */}
      <section className={styles.cleanMainSection}>
        <div className={styles.cleanThemeContainer}>
          <div className={styles.cleanMainGrid}>
            
            {/* Feed Cronológico de Artigos (Esquerda) */}
            <div className={styles.cleanArticlesFeed}>
              <div>
                <span className={styles.cleanSidebarSectionTitle} style={{ borderBottomColor: "#2563eb", marginBottom: 28 }}>
                  Artigos Recentes
                </span>
              </div>
              
              {feedPosts.length > 0 ? (
                feedPosts.map((post) => (
                  <article key={post.id} className={styles.cleanFeedCard}>
                    <div className={styles.cleanFeedCardContent}>
                      <span className={styles.cleanMetaLabel} style={{ fontSize: "0.7rem", color: "#64748b" }}>
                        {categoryName(post.category)} • {new Date(post.publishedAt || post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                      <Link href={`/artigo/${post.slug}`}>
                        <h2 className={styles.cleanFeedCardTitle}>
                          {post.title}
                        </h2>
                      </Link>
                      <p className={styles.cleanFeedCardExcerpt}>
                        {post.excerpt?.slice(0, 160)}...
                      </p>
                      <Link href={`/artigo/${post.slug}`} className={styles.cleanReadMoreLink} style={{ fontSize: "0.88rem", marginTop: 8 }}>
                        Ler mais &rarr;
                      </Link>
                    </div>
                    {post.imageUrl && (
                      <Link href={`/artigo/${post.slug}`} className={styles.cleanFeedCardImageWrapper}>
                        <img src={post.imageUrl} alt={post.title} />
                      </Link>
                    )}
                  </article>
                ))
              ) : (
                <p style={{ color: "#64748b", fontSize: "0.95rem" }}>Nenhum artigo adicional disponível.</p>
              )}
            </div>

            {/* Widgets Operacionais da Barra Lateral (Direita) */}
            <aside className={styles.cleanRightSidebar}>
              
              {/* Widget: Newsletter */}
              <div className={styles.cleanWidgetCard}>
                <h3 className={styles.cleanWidgetTitle}>Newsletter</h3>
                <p className={styles.cleanNewsletterText}>
                  Receba análises semanais exclusivas sobre IA, mercado digital e investimentos diretamente no seu e-mail.
                </p>
                <form className={styles.cleanNewsletterForm}>
                  <input 
                    type="email" 
                    placeholder="Seu melhor e-mail" 
                    className={styles.cleanInput}
                    required 
                  />
                  <button type="submit" className={styles.cleanBtnFull}>
                    Inscrever-se
                  </button>
                </form>
              </div>

              {/* Widget: Categorias / Trilhas */}
              <div className={styles.cleanWidgetCard}>
                <h3 className={styles.cleanWidgetTitle}>Editorias Principais</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {categories.map((category) => {
                    const count = posts.filter((post) => categoryName(post.category) === category.name).length;
                    return (
                      <Link 
                        key={category.slug} 
                        href={`/artigos?categoria=${category.slug}`}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", color: "#475569", fontSize: "0.9rem", fontWeight: 600, paddingBottom: 8, borderBottom: "1px solid rgba(148, 163, 184, 0.08)" }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: category.accent }}></span>
                          {category.shortName}
                        </span>
                        <span style={{ backgroundColor: "#f1f5f9", padding: "2px 8px", borderRadius: "10px", fontSize: "0.75rem", color: "#64748b" }}>
                          {count} {count === 1 ? "artigo" : "artigos"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Widget: Tags em Alta */}
              {allTags.length > 0 && (
                <div className={styles.cleanWidgetCard}>
                  <h3 className={styles.cleanWidgetTitle}>Temas em Alta</h3>
                  <div className={styles.cleanTagGrid}>
                    {allTags.map((tag) => (
                      <Link key={tag} href={`/artigos?busca=${tag}`} className={styles.cleanTagPill}>
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Widget: Metodologia de IA e Curadoria */}
              <div className={styles.cleanWidgetCard} style={{ borderLeft: "4px solid #2563eb" }}>
                <div className={styles.cleanAboutWidget}>
                  <h3 className={styles.cleanWidgetTitle} style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 8 }}>Curadoria M4</h3>
                  <p className={styles.cleanAboutText}>
                    Nossa esteira editorial utiliza inteligência artificial supervisionada por curadores humanos para sintetizar cenários de mercado e trazer insights que apoiam decisões estratégicas.
                  </p>
                </div>
              </div>

            </aside>

          </div>
        </div>
      </section>

      {/* 5. RODAPÉ DE ALTA GAMA COMPARTILHADO */}
      <Footer />
    </div>
  );
}
