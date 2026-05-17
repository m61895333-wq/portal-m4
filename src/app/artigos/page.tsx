import type { Metadata } from "next";
import Link from "next/link";
import { listPublicPosts } from "@/lib/portal-cms";
import { categories } from "@/lib/categories";
import { categoryName } from "@/lib/categories";
import { Footer, Header, Sidebar } from "../site-shell";
import styles from "../portal.module.css";

export const metadata: Metadata = {
  title: "Todos os Artigos | Portal M4",
  description: "Explore todos os artigos do Portal M4 sobre mercado financeiro, investimentos, inteligência artificial, tecnologia e carreira.",
};

type Props = {
  searchParams: Promise<{ pagina?: string; categoria?: string }>;
};

const PER_PAGE = 12;

export default async function TodosOsArtigosPage({ searchParams }: Props) {
  const { pagina, categoria } = await searchParams;
  const currentPage = Math.max(1, Number(pagina ?? 1));

  const allPosts = await listPublicPosts();

  // Filtro por categoria (opcional)
  const filtered = categoria
    ? allPosts.filter(p => {
        const DB_TO_SLUG: Record<string, string> = {
          'MERCADO FINANCEIRO': 'mercado-financeiro',
          'INVESTIMENTOS': 'investimentos',
          'INTELIGENCIA ARTIFICIAL': 'inteligencia-artificial',
          'TECNOLOGIA': 'tecnologia-negocios-digitais',
          'CARREIRA': 'carreira-ia',
          'EMPREENDEDORISMO': 'empreendedorismo-digital',
          'EDUCACAO FINANCEIRA': 'educacao-financeira',
          'IA & MERCADO': 'inteligencia-artificial',
          'IA E MERCADO': 'inteligencia-artificial',
          'GERAL': 'mercado-financeiro',
        };
        const slug = DB_TO_SLUG[p.category.toUpperCase().trim()] ??
          p.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        return slug === categoria;
      })
    : allPosts;

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const posts = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const baseUrl = categoria ? `/artigos?categoria=${categoria}` : "/artigos";

  return (
    <div className="mainLayout">
      <Sidebar />
      <main className="contentShell">
        <Header />

        {/* Banner da seção */}
        <section style={{
          padding: "72px 0 48px",
          background: "linear-gradient(135deg, rgba(8,13,33,0.6), rgba(8,13,33,0.95)), radial-gradient(circle at 60% 30%, rgba(32,217,255,0.12), transparent 40%)",
          borderBottom: "1px solid var(--line)"
        }}>
          <div className="container">
            <span className={styles.eyebrow}>Acervo Editorial</span>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2.2rem, 5vw, 4rem)", lineHeight: 1.05, letterSpacing: 0, marginTop: 12, marginBottom: 16 }}>
              Todos os Artigos
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "1.1rem", maxWidth: 560 }}>
              {filtered.length} {filtered.length === 1 ? "artigo publicado" : "artigos publicados"} sobre mercado, tecnologia, IA e carreira.
            </p>
          </div>
        </section>

        {/* Filtros por categoria */}
        <div style={{ borderBottom: "1px solid var(--line)", background: "rgba(255,255,255,0.02)" }}>
          <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", padding: "16px 0", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 8 }}>
                Filtrar:
              </span>
              <Link
                href="/artigos"
                style={{
                  padding: "6px 16px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  border: "1px solid",
                  borderColor: !categoria ? "var(--cyan)" : "rgba(255,255,255,0.15)",
                  background: !categoria ? "rgba(32,217,255,0.12)" : "transparent",
                  color: !categoria ? "var(--cyan)" : "var(--muted)",
                  textDecoration: "none",
                  whiteSpace: "nowrap"
                }}
              >
                Todos ({allPosts.length})
              </Link>
              {categories.map(cat => {
                const catCount = allPosts.filter(p => {
                  const DB_TO_SLUG: Record<string, string> = {
                    'MERCADO FINANCEIRO': 'mercado-financeiro',
                    'INVESTIMENTOS': 'investimentos',
                    'INTELIGENCIA ARTIFICIAL': 'inteligencia-artificial',
                    'TECNOLOGIA': 'tecnologia-negocios-digitais',
                    'CARREIRA': 'carreira-ia',
                    'EMPREENDEDORISMO': 'empreendedorismo-digital',
                    'EDUCACAO FINANCEIRA': 'educacao-financeira',
                    'IA & MERCADO': 'inteligencia-artificial',
                    'GERAL': 'mercado-financeiro',
                  };
                  const slug = DB_TO_SLUG[p.category.toUpperCase().trim()] ??
                    p.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                  return slug === cat.slug;
                }).length;
                if (catCount === 0) return null;
                const isActive = categoria === cat.slug;
                return (
                  <Link
                    key={cat.slug}
                    href={`/artigos?categoria=${cat.slug}`}
                    style={{
                      padding: "6px 16px",
                      borderRadius: "20px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      border: "1px solid",
                      borderColor: isActive ? cat.accent : "rgba(255,255,255,0.15)",
                      background: isActive ? `${cat.accent}20` : "transparent",
                      color: isActive ? cat.accent : "var(--muted)",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      transition: "all 0.2s"
                    }}
                  >
                    {cat.shortName} ({catCount})
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grade de artigos */}
        <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
          {posts.length === 0 ? (
            <div className={styles.emptyArchive}>
              <span className={styles.eyebrow}>Em breve</span>
              <h2>O acervo editorial esta sendo montado.</h2>
              <p>Quando os artigos forem publicados, esta pagina vai funcionar como um mapa de leitura por categoria.</p>
              <div className={styles.emptyPathPreview}>
                {categories.slice(0, 5).map((cat) => (
                  <span key={cat.slug} style={{ ["--accent" as string]: cat.accent }}>{cat.shortName}</span>
                ))}
              </div>
              <Link href="/admin" className="button" style={{ marginTop: 24, display: "inline-block" }}>Acessar editorial</Link>
            </div>
          ) : (
            <div className={styles.postGrid}>
              {posts.map(post => (
                <Link
                  key={post.id}
                  href={`/artigo/${post.slug}`}
                  className={`${styles.postCard} card`}
                  style={{ textDecoration: "none" }}
                >
                  <img
                    src={post.imageUrl || "https://images.unsplash.com/photo-1611974714658-058f40da23fb?w=800&auto=format&fit=crop"}
                    alt={post.title}
                    style={{ width: "100%", height: "200px", objectFit: "cover" }}
                  />
                  <span className="badge" style={{ margin: "16px 22px 0" }}>
                    {categoryName(post.category)}
                  </span>
                  <h3 style={{ fontFamily: "var(--font-serif)", marginTop: 8 }}>{post.title}</h3>
                  <p style={{ marginBottom: 16 }}>{post.excerpt?.slice(0, 120)}...</p>
                  <span style={{
                    display: "block",
                    paddingLeft: 22,
                    paddingBottom: 16,
                    fontSize: "0.75rem",
                    color: "var(--muted)"
                  }}>
                    {new Date(post.publishedAt || post.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: 60, flexWrap: "wrap" }}>
              {currentPage > 1 && (
                <Link
                  href={`${baseUrl}&pagina=${currentPage - 1}`}
                  className="buttonSecondary"
                  style={{ padding: "10px 20px" }}
                >
                  ← Anterior
                </Link>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                // Mostra: primeira, última, e as 2 ao redor da atual
                const show = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                const isEllipsis = !show && (page === 2 || page === totalPages - 1);
                if (!show && !isEllipsis) return null;
                if (isEllipsis) return <span key={page} style={{ padding: "10px 4px", color: "var(--muted)" }}>…</span>;

                return (
                  <Link
                    key={page}
                    href={`${baseUrl}&pagina=${page}`}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "12px",
                      border: "1px solid",
                      borderColor: page === currentPage ? "var(--cyan)" : "rgba(255,255,255,0.15)",
                      background: page === currentPage ? "rgba(32,217,255,0.15)" : "transparent",
                      color: page === currentPage ? "var(--cyan)" : "var(--muted)",
                      fontWeight: page === currentPage ? 900 : 400,
                      textDecoration: "none",
                      fontSize: "0.9rem"
                    }}
                  >
                    {page}
                  </Link>
                );
              })}

              {currentPage < totalPages && (
                <Link
                  href={`${baseUrl}&pagina=${currentPage + 1}`}
                  className="buttonSecondary"
                  style={{ padding: "10px 20px" }}
                >
                  Próxima →
                </Link>
              )}
            </div>
          )}

          {/* Info de paginação */}
          {totalPages > 1 && (
            <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.85rem", marginTop: 20 }}>
              Página {currentPage} de {totalPages} · {filtered.length} artigos no total
            </p>
          )}
        </div>

        <Footer />
      </main>
    </div>
  );
}
