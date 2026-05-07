import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPostMetadata } from "@/lib/seo";
import { getPostBySlug, recordPostView } from "@/lib/portal-cms";
import { categoryName } from "@/lib/categories";
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
              <span className="badge" style={{ marginBottom: 20 }}>{categoryName(post.category)}</span>
              <h1>{post.title}</h1>
              
              <div className="adSlot" id="ad-top">Espaco Reservado para Anuncio</div>
              
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
              
              <div className="articleBody">
                {post.content.split("\n\n").map((block, index) => {
                  if (block.startsWith("## ")) return <h2 key={index}>{block.replace("## ", "")}</h2>;
                  return <p key={index}>{block}</p>;
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
            </aside>
          </div>
        </article>

        <Footer />
      </main>
    </div>
  );
}
