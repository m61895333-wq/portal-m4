import Link from "next/link";
import { categories } from "@/lib/categories";
import { listPublicPosts } from "@/lib/portal-cms";
import { Footer, Header } from "./site-shell";
import styles from "./portal.module.css";

export default async function HomePage() {
  const posts = await listPublicPosts();
  const hero = posts[0];
  const recent = posts.slice(0, 6);

  return (
    <main className="shell">
      <Header />
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroGrid}>
            <div>
              <span className={styles.eyebrow}>Portal premium do Grupo M4</span>
              <h1>Inteligencia para mercado, tecnologia, investimentos e IA.</h1>
              <p>
                Analises profundas, linguagem profissional e curadoria editorial para transformar informacao em
                decisao.
              </p>
              <div className={styles.heroActions}>
                <Link className="button" href={`/artigo/${hero.slug}`}>
                  Ler artigo principal
                </Link>
                <Link className="buttonSecondary" href="#categorias">
                  Ver categorias
                </Link>
              </div>
            </div>
            <article className={`${styles.featured} card`}>
              <img src={hero.imageUrl} alt={hero.title} />
              <div>
                <span>{hero.tags[0] ?? "analise"}</span>
                <h2>{hero.title}</h2>
                <p>{hero.excerpt}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="container" id="categorias">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>Editorias estrategicas</span>
            <h2>Categorias do Portal M4</h2>
          </div>
        </div>
        <div className={styles.categoryGrid}>
          {categories.map((category) => (
            <Link key={category.slug} className={`${styles.categoryCard} card`} href={`/categoria/${category.slug}`}>
              <img src={category.image} alt={`Imagem da categoria ${category.name}`} />
              <strong style={{ color: category.accent }}>{category.name}</strong>
              <p>{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>Ultimas publicacoes</span>
            <h2>Artigos recentes</h2>
          </div>
        </div>
        <div className={styles.postGrid}>
          {recent.map((post) => (
            <Link key={post.id} href={`/artigo/${post.slug}`} className={`${styles.postCard} card`}>
              <img src={post.imageUrl} alt={post.title} />
              <span>{post.category.replaceAll("-", " ")}</span>
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
