import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory } from "@/lib/categories";
import { listCategoryPosts } from "@/lib/portal-cms";
import { Footer, Header } from "../../site-shell";
import styles from "../../portal.module.css";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return { title: "Categoria nao encontrada" };
  return {
    title: category.name,
    description: category.description
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const posts = await listCategoryPosts(category.slug);

  return (
    <main className="shell">
      <Header />
      <section className="container">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>Categoria</span>
            <h1>{category.name}</h1>
            <p>{category.description}</p>
          </div>
        </div>
        <div className={styles.postGrid}>
          {posts.map((post) => (
            <Link key={post.id} href={`/artigo/${post.slug}`} className={`${styles.postCard} card`}>
              <img src={post.imageUrl} alt={post.title} />
              <span>{category.name}</span>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
