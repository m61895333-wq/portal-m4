import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPostMetadata } from "@/lib/seo";
import { getPostBySlug, listPublicPosts, recordPostView } from "@/lib/portal-cms";
import { categoryName, categories } from "@/lib/categories";
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

              <div className="adSlot" id="ad-top">Espaço Reservado para Anúncio</div>

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

              <div className="adSlot" id="ad-bottom">Espaco Reservado para Anuncio</div>
            </div>

            <aside className="articleSidebar">
              <div className="adSlot adSlotVisible" style={{ minHeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ opacity: 0.3 }}>Espaco para Banner Lateral</span>
              </div>
              
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
                  {(await listPublicPosts()).filter(p => p.id !== post.id).slice(0, 4).map((suggested) => (
                    <Link 
                      key={suggested.slug} 
                      href={`/artigo/${suggested.slug}`} 
                      style={{ textDecoration: 'none', color: 'inherit', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}
                    >
                      <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                        {suggested.category.replaceAll("-", " ")}
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
