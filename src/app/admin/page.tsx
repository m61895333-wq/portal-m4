import Link from "next/link";
import { categories } from "@/lib/categories";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getPerformance, listPosts, listTopicTags } from "@/lib/portal-cms";
import { hasSupabaseConfig } from "@/lib/supabase";
import { Header } from "../site-shell";
import styles from "../portal.module.css";
import {
  addTagAction,
  createDraftAction,
  deletePostAction,
  loginFormAction,
  logoutAction,
  remakePostAction,
  removeTagAction,
  savePostAction,
  setStatusAction,
  toggleActiveAction
} from "./actions";

type Props = {
  searchParams: Promise<{ status?: string; period?: "week" | "month"; erro?: string }>;
};

export default async function AdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return (
      <main className="shell">
        <Header />
        <section className="container" style={{ paddingTop: 70 }}>
          <div className="card" style={{ maxWidth: 520, padding: 28, margin: "0 auto" }}>
            <span className={styles.eyebrow}>Painel protegido</span>
            <h1>Entrar no editorial Portal M4</h1>
            {params.erro && <p style={{ color: "var(--danger)" }}>Usuario ou senha invalidos.</p>}
            <form action={loginFormAction}>
              <label className={styles.field}>
                Usuario
                <input name="user" placeholder="admin" required />
              </label>
              <label className={styles.field}>
                Senha
                <input name="password" type="password" placeholder="senha do painel" required />
              </label>
              <button className="button" type="submit">
                Acessar painel
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  const status = params.status && params.status !== "all" ? (params.status as never) : "all";
  const period = params.period ?? "week";
  const [posts, tags, performance] = await Promise.all([listPosts(status), listTopicTags(), getPerformance(period)]);

  return (
    <main className="shell">
      <Header />
      <div className={`container ${styles.adminLayout}`}>
        <aside className={`${styles.sidebar} card`}>
          <span className={styles.eyebrow}>Editorial</span>
          <h2>Filtros</h2>
          {["all", "approved", "rejected", "review", "published", "draft"].map((item) => (
            <Link className={`buttonSecondary ${styles.filterButton}`} href={`/admin?status=${item}`} key={item}>
              {item === "all" ? "Todos" : item}
            </Link>
          ))}

          <hr style={{ borderColor: "rgba(125,211,252,.18)", margin: "24px 0" }} />
          <h3>Tags estrategicas</h3>
          <form action={addTagAction} className={styles.quickActions}>
            <input name="tag" placeholder="nova-tag" style={{ flex: 1, minWidth: 0 }} />
            <button className="buttonSecondary" type="submit">
              Adicionar
            </button>
          </form>
          {tags.map((tag) => (
            <form action={removeTagAction} key={tag} className={styles.quickActions}>
              <input type="hidden" name="tag" value={tag} />
              <span className={styles.badge}>{tag}</span>
              <button className="dangerButton" type="submit">
                Remover
              </button>
            </form>
          ))}
          {!tags.length && <p style={{ color: "var(--muted)" }}>Sem tags cadastradas.</p>}
        </aside>

        <section>
          <div className={`${styles.adminPanel} card`}>
            <div className={styles.sectionHeader} style={{ marginTop: 0 }}>
              <div>
                <span className={styles.eyebrow}>Painel de desempenho</span>
                <h1>Gestao editorial</h1>
                {!hasSupabaseConfig() && (
                  <p style={{ color: "var(--gold)" }}>
                    Supabase ainda nao configurado neste ambiente. O site esta usando conteudo de seguranca.
                  </p>
                )}
              </div>
              <form action={logoutAction}>
                <button className="buttonSecondary" type="submit">
                  Sair
                </button>
              </form>
            </div>

            <div className={styles.quickActions}>
              <Link className="buttonSecondary" href="/admin?period=week">
                Semana
              </Link>
              <Link className="buttonSecondary" href="/admin?period=month">
                Mes
              </Link>
            </div>
            <p>Total de visualizacoes no periodo: <strong>{performance.totalViews}</strong></p>
            <div className={styles.editorGrid}>
              <div className="card" style={{ padding: 18 }}>
                <h3>Artigos mais lidos</h3>
                {performance.mostReadPosts.length ? (
                  performance.mostReadPosts.map((item) => (
                    <p key={item.slug}>{item.title}: <strong>{item.views}</strong></p>
                  ))
                ) : (
                  <p>Sem dados suficientes.</p>
                )}
              </div>
              <div className="card" style={{ padding: 18 }}>
                <h3>Assuntos menos lidos</h3>
                {performance.leastReadTopics.map((item) => (
                  <p key={item.topic}>{item.topic}: <strong>{item.views}</strong></p>
                ))}
              </div>
            </div>
          </div>

          <div className={`${styles.adminPanel} card`} style={{ marginTop: 18 }}>
            <span className={styles.eyebrow}>Criar novo post</span>
            <form action={createDraftAction}>
              <div className={styles.editorGrid}>
                <label className={styles.field}>
                  Link de referencia
                  <input name="sourceUrl" placeholder="https://..." />
                </label>
                <label className={styles.field}>
                  Assunto
                  <input name="topic" placeholder="Ex: impacto da IA nos investimentos" />
                </label>
              </div>
              <label className={styles.field}>
                Como deve ser abordado
                <textarea name="approach" placeholder="Tom, ponto de vista, publico e detalhes importantes." />
              </label>
              <label className={styles.field}>
                Data de postagem
                <input name="scheduledAt" type="datetime-local" />
              </label>
              <button className="button" type="submit">
                Criar post para revisao
              </button>
            </form>
          </div>

          {posts.map((post) => (
            <article className={`${styles.postEditor} card`} key={post.id}>
              <div className={styles.sectionHeader} style={{ marginTop: 0 }}>
                <div>
                  <span className={styles.badge}>{post.status}</span>
                  <h2>{post.title}</h2>
                  <Link href={`/artigo/${post.slug}`} style={{ color: "var(--cyan)" }}>
                    /artigo/{post.slug}
                  </Link>
                </div>
              </div>

              <form action={savePostAction}>
                <input type="hidden" name="id" value={post.id} />
                <div className={styles.editorGrid}>
                  <label className={styles.field}>
                    Titulo
                    <input name="title" defaultValue={post.title} required />
                  </label>
                  <label className={styles.field}>
                    Slug
                    <input name="slug" defaultValue={post.slug} required />
                  </label>
                  <label className={styles.field}>
                    Categoria
                    <select name="category" defaultValue={post.category}>
                      {categories.map((category) => (
                        <option key={category.slug} value={category.slug}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    Status
                    <select name="status" defaultValue={post.status}>
                      <option value="draft">draft</option>
                      <option value="review">review</option>
                      <option value="approved">approved</option>
                      <option value="rejected">rejected</option>
                      <option value="published">published</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    Prioridade
                    <input name="priority" type="number" defaultValue={post.priority} />
                  </label>
                  <label className={styles.field}>
                    Data de postagem
                    <input name="scheduledAt" type="datetime-local" defaultValue={post.scheduledAt?.slice(0, 16)} />
                  </label>
                </div>
                <label className={styles.field}>
                  Resumo
                  <input name="excerpt" defaultValue={post.excerpt} />
                </label>
                <label className={styles.field}>
                  Imagem realista
                  <input name="imageUrl" defaultValue={post.imageUrl} />
                </label>
                <label className={styles.field}>
                  Tags separadas por virgula
                  <input name="tags" defaultValue={post.tags.join(", ")} />
                </label>
                <label className={styles.field}>
                  Conteudo
                  <textarea name="content" defaultValue={post.content} />
                </label>
                <label className={styles.field}>
                  Observacoes da revisao
                  <input name="reviewerNotes" defaultValue={post.reviewerNotes ?? ""} />
                </label>
                <label>
                  <input name="isActive" type="checkbox" defaultChecked={post.isActive} /> Ativo
                </label>
                <div className={styles.adminActions}>
                  <button className="button" type="submit">
                    Salvar
                  </button>
                </div>
              </form>

              <div className={styles.adminActions}>
                {[
                  ["approved", "Aprovar"],
                  ["rejected", "Nao aprovar"],
                  ["published", "Publicar"]
                ].map(([nextStatus, label]) => (
                  <form action={setStatusAction} key={nextStatus}>
                    <input type="hidden" name="id" value={post.id} />
                    <input type="hidden" name="status" value={nextStatus} />
                    <button className="buttonSecondary" type="submit">
                      {label}
                    </button>
                  </form>
                ))}
                <form action={toggleActiveAction}>
                  <input type="hidden" name="id" value={post.id} />
                  <input type="hidden" name="active" value={String(post.isActive)} />
                  <button className="buttonSecondary" type="submit">
                    {post.isActive ? "Desativar" : "Ativar"}
                  </button>
                </form>
                <form action={remakePostAction}>
                  <input type="hidden" name="id" value={post.id} />
                  <input type="hidden" name="title" value={post.title} />
                  <button className="buttonSecondary" type="submit">
                    Refazer conteudo
                  </button>
                </form>
                <form action={deletePostAction}>
                  <input type="hidden" name="id" value={post.id} />
                  <button className="dangerButton" type="submit">
                    Excluir post
                  </button>
                </form>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
