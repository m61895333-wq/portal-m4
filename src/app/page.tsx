import Link from "next/link";
import { categories, categoryName } from "@/lib/categories";
import { listPublicPosts } from "@/lib/portal-cms";
import { Footer, Header, Sidebar } from "./site-shell";
import styles from "./portal.module.css";

/**
 * HomePage
 * Ponto de entrada do Portal M4. 
 * Apresenta o conteúdo editorial (Artigo de Impacto no Hero e Grade de Novidades).
 * A exibição depende de posts aprovados vindos do banco de dados (Modo Artesão).
 */
export default async function HomePage() {
  const posts = await listPublicPosts();
  
  if (!posts || posts.length === 0) {
    return (
      <div className="mainLayout">
        <Sidebar />
        <main className="contentShell">
          <Header />
          <section className="container" style={{ paddingTop: 100, textAlign: 'center' }}>
             <h1 style={{ fontFamily: 'var(--font-serif)' }}>Bem-vindo ao Portal M4</h1>
             <p style={{ color: 'var(--muted)', marginTop: 20 }}>Estamos preparando os ultimos detalhes editoriais. Volte em instantes!</p>
             <Link href="/admin" className="button" style={{ marginTop: 40 }}>Acessar Editorial</Link>
          </section>
          <Footer />
        </main>
      </div>
    );
  }

  const hero = posts[0];
  const recent = posts.slice(0, 6);
  const totalPosts = posts.length;

  return (
    <div className="mainLayout">
      <Sidebar />
      
      <main className="contentShell">
        <Header />
        
        <section className={styles.hero}>
          <div className="container">
            <div className={styles.heroGrid}>
              <div>
                <span className={styles.eyebrow}>Portal premium do Grupo M4</span>
                <h1 style={{ fontFamily: 'var(--font-serif)', lineHeight: 1.1 }}>
                  Inteligencia para mercado, tecnologia, investimentos e IA.
                </h1>
                <p>
                  Analises profundas, linguagem profissional e curadoria editorial para transformar informacao em
                  decisao.
                </p>
                <div className={styles.heroActions}>
                  <Link className="button" href={`/artigo/${hero.slug}`}>
                    Ler artigo principal
                  </Link>
                </div>
              </div>
              <article className={`${styles.featured} card`}>
                <img src={hero.imageUrl} alt={hero.title} />
                <div>
                  <span className="badge">{hero.tags[0] ?? "analise"}</span>
                  <h2 style={{ fontFamily: 'var(--font-serif)', marginTop: 12 }}>{hero.title}</h2>
                  <p>{hero.excerpt}</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* O espaço de anúncios foi removido conforme diretriz de design limpo */}

        <div className="container" style={{ paddingTop: 100, paddingBottom: 100 }}>
          <section>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Artigos Recentes</h2>
                <p style={{ color: 'var(--muted)', marginTop: 8, fontSize: '1rem' }}>
                  Exibindo 6 de {totalPosts} artigos publicados
                </p>
              </div>
              <Link
                href="/artigos"
                className="buttonSecondary"
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Ver todos os artigos &rarr;
              </Link>
            </div>
          <div className={styles.postGrid}>
            {recent.map((post) => (
              <Link key={post.id} href={`/artigo/${post.slug}`} className={`${styles.postCard} card`}>
                <img src={post.imageUrl} alt={post.title} />
                <span className="badge" style={{ marginLeft: 22 }}>{categoryName(post.category)}</span>
                <h3 style={{ fontFamily: 'var(--font-serif)' }}>{post.title}</h3>
                <p>{post.excerpt}</p>
              </Link>
            ))}
          </div>

          {/* CTA para ver todos os artigos */}
          {totalPosts > 6 && (
            <div style={{ textAlign: 'center', marginTop: 56 }}>
              <Link
                href="/artigos"
                className="button"
                style={{
                  background: 'linear-gradient(135deg, rgba(32,217,255,0.15), rgba(59,130,246,0.15))',
                  border: '1px solid var(--cyan)',
                  fontSize: '1rem',
                  padding: '14px 40px',
                  display: 'inline-block'
                }}
              >
                Ver todos os {totalPosts} artigos &rarr;
              </Link>
            </div>
          )}
        </section>
      </div>
        
      <Footer />
    </main>
  </div>
  );
}
