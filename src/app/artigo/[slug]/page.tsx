import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPostMetadata } from "@/lib/seo";
import { getPostBySlug, listPublicPosts, recordPostView } from "@/lib/portal-cms";
import { categoryName } from "@/lib/categories";
import Link from "next/link";
import { Footer, Header, Sidebar } from "../../site-shell";
import styles from "../../portal.module.css";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Artigo nao encontrado" };
  return buildPostMetadata(post);
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || !post.isActive) notFound();

  await recordPostView(post.id);
  const allPosts = await listPublicPosts();
  const relatedPosts = allPosts
    .filter((candidate) => candidate.id !== post.id)
    .sort((a, b) => {
      const sameCategoryA = categoryName(a.category) === categoryName(post.category) ? 0 : 1;
      const sameCategoryB = categoryName(b.category) === categoryName(post.category) ? 0 : 1;
      if (sameCategoryA !== sameCategoryB) return sameCategoryA - sameCategoryB;
      return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
    })
    .slice(0, 5);
  const articleSections = post.content
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace("## ", ""))
    .slice(0, 5);

  return (
    <div className="mainLayout">
      <Sidebar />
      <main className="contentShell">
        <Header />
        
        <article className="container" style={{ paddingTop: 60, paddingBottom: 100 }}>
          <div className="articleLayout">
            <div className="articleReader">
              <span className="badge" style={{ marginBottom: 16 }}>
                {categoryName(post.category)}
              </span>
              <h1>{post.title}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: 12, marginBottom: 32, color: 'var(--muted)', fontSize: '0.9rem' }}>
                <span>Por <strong style={{ color: 'var(--cyan)' }}>Equipe Editorial M4</strong></span>
                <span style={{ opacity: 0.4 }}>|</span>
                <time dateTime={post.publishedAt || post.createdAt}>
                  {new Date(post.publishedAt || post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </time>
              </div>

              <div className={styles.articleTrustBar}>
                <span>Curadoria M4</span>
                <span>Leitura contextual</span>
                <span>Atualizado editorialmente</span>
              </div>

              <p style={{ fontSize: '1.4rem', color: 'var(--text)', fontWeight: 600, marginBottom: 40, lineHeight: 1.5 }}>
                {post.excerpt}
              </p>

              {post.imageUrl && (
                <img 
                  src={post.imageUrl} 
                  alt={post.title} 
                  className={styles.articleImage}
                  style={{ borderRadius: 32, marginBottom: 50, boxShadow: '0 40px 100px rgba(0,0,0,0.4)' }} 
                />
              )}
              
              <div className="articleBody" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text)', fontSize: '1.1rem' }}>
                {post.content.split(/\n/).map((line, index) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  
                  // Se a linha comeca com ## ou contem ## no inicio de uma frase
                  if (trimmed.startsWith("## ")) {
                    return <h2 key={index} style={{ marginTop: 40, marginBottom: 20 }}>{trimmed.replace("## ", "")}</h2>;
                  }
                  
                  // Limpeza profunda de simbolos que a IA as vezes deixa no meio do texto
                  const cleanText = trimmed.replace(/##\s?/g, "");
                  
                  return <p key={index} style={{ marginBottom: 24, lineHeight: 1.8 }}>{cleanText}</p>;
                })}
              </div>

              {relatedPosts.length > 0 && (
                <section className={styles.articleNextBlock}>
                  <span className={styles.eyebrow}>Continue lendo</span>
                  <h2>Proximas leituras para manter o contexto</h2>
                  <div className={styles.articleNextGrid}>
                    {relatedPosts.slice(0, 3).map((suggested) => (
                      <Link key={suggested.id} href={`/artigo/${suggested.slug}`} className={styles.articleNextCard}>
                        <span>{categoryName(suggested.category)}</span>
                        <strong>{suggested.title}</strong>
                        <small>{suggested.excerpt?.slice(0, 110)}...</small>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="articleSidebar">
              <div className={styles.readerCompass}>
                <span className={styles.eyebrow}>Guia de leitura</span>
                <h3>Antes de sair, conecte este artigo a uma trilha.</h3>
                <p>Use os atalhos abaixo para continuar no mesmo assunto ou avançar para a proxima decisao.</p>
                <Link href="/artigos" className="buttonSecondary">
                  Ver acervo completo
                </Link>
              </div>

              {articleSections.length > 0 && (
                <div className="card" style={{ padding: 24, marginTop: 24 }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', marginBottom: 16 }}>Neste artigo</h3>
                  <div className={styles.articleSectionList}>
                    {articleSections.map((section, index) => (
                      <span key={`${section}-${index}`}>{section}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="card" style={{ padding: 24, marginTop: 32 }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: 16 }}>Tags</h3>
                <div className={styles.quickActions}>
                  {post.tags.map((tag) => (
                    <span className={styles.badge} key={tag}>{tag}</span>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: 24, marginTop: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: 20 }}>Leia Tambem</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {relatedPosts.slice(0, 4).map((suggested) => (
                    <Link 
                      key={suggested.slug} 
                      href={`/artigo/${suggested.slug}`} 
                      style={{ textDecoration: 'none', color: 'inherit', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}
                    >
                      <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                        {categoryName(suggested.category)}
                      </span>
                      <strong style={{ fontSize: '1rem', lineHeight: '1.4', display: 'block' }}>{suggested.title}</strong>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </article>

        <Footer />
      </main>
    </div>
  );
}
