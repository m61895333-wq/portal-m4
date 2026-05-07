import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPostMetadata } from "@/lib/seo";
import { getPostBySlug, recordPostView } from "@/lib/portal-cms";
import { categoryName } from "@/lib/categories";
import { Footer, Header } from "../../site-shell";
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
    <main className="shell">
      <Header />
      <article className={`container ${styles.article}`}>
        <div className={`${styles.articleHero} card`}>
          <span className={styles.eyebrow}>{categoryName(post.category)}</span>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
          <div className={styles.quickActions}>
            {post.tags.map((tag) => (
              <span className={styles.badge} key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <img className={styles.articleImage} src={post.imageUrl} alt={post.title} />
        <div className={styles.content}>
          {post.content.split("\n\n").map((block, index) => {
            if (block.startsWith("## ")) return <h2 key={index}>{block.replace("## ", "")}</h2>;
            return <p key={index}>{block}</p>;
          })}
        </div>
      </article>
      <Footer />
    </main>
  );
}
