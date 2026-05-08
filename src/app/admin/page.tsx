import Link from "next/link";
import { categories } from "@/lib/categories";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAutonomyStatus, getPerformance, listPosts, listTopicTags } from "@/lib/portal-cms";
import { Header } from "../site-shell";
import styles from "../portal.module.css";
import {
  addTagAction,
  deletePostAction,
  loginFormAction,
  logoutAction,
  remakePostAction,
  remakeImageAction,
  removeTagAction,
  savePostAction,
  setStatusAction,
  toggleAutonomyAction
} from "./actions";

import { BatchCreator } from "./batch-creator";

type Props = {
  searchParams: Promise<{ status?: string; period?: "week" | "month"; erro?: string }>;
};

/**
 * AdminPage
 * Painel de Controle e "War Room" do Portal M4.
 * Protegido por autenticação de sessão.
 * Permite monitorar a saúde da rede, configurar o Agente de Autonomia Total (Modo Artesão)
 * e aprovar/rejeitar/editar os artigos na fila.
 */
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
  const [allPosts, tags, performance, autonomy] = await Promise.all([
    listPosts("all"), 
    listTopicTags(), 
    getPerformance(period),
    getAutonomyStatus()
  ]);

  const filteredPosts = status === "all" ? allPosts : allPosts.filter(p => p.status === status);

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    const statusOrder = { "review": 0, "draft": 1, "approved": 2, "published": 3, "rejected": 4 };
    const orderA = statusOrder[a.status as keyof typeof statusOrder] ?? 99;
    const orderB = statusOrder[b.status as keyof typeof statusOrder] ?? 99;
    
    if (orderA !== orderB) return orderA - orderB;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <main className="containerFull admin-inter" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid var(--line)', paddingBottom: 24 }}>
        <div className="brand">
          <img src="/portal-m4-brand-logo.png" alt="Logo" style={{ width: 44, height: 44 }} />
          <span style={{ fontSize: '1.2rem', letterSpacing: '0.05em' }}>PAINEL EDITORIAL M4</span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/" className="buttonSecondary" style={{ fontSize: '0.8rem' }}>Ver Portal</Link>
          <form action={logoutAction}>
            <button className="buttonSecondary" type="submit" style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>Sair</button>
          </form>
        </div>
      </div>
      
      {/* MONITOR DE PRODUÇÃO PERMANENTE (TOP BAR) */}
      <section className="card" style={{ padding: '16px 24px', marginBottom: 40, background: 'rgba(32, 217, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', gap: 40 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.6, letterSpacing: '0.05em' }}>EM PRODUÇÃO AGORA:</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--cyan)', textShadow: '0 0 15px rgba(32, 217, 255, 0.4)' }}>{allPosts.filter(p => p.status === 'generating').length}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.6, letterSpacing: '0.05em' }}>NA FILA DE ESPERA:</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>{allPosts.filter(p => p.status === 'queued').length}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 16px', background: 'rgba(53, 242, 185, 0.1)', borderRadius: '8px', border: '1px solid rgba(53, 242, 185, 0.2)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--green)' }}>META DIÁRIA ATIVA:</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--green)' }}>{autonomy.dailyCount}</span>
        </div>
      </section>

      {/* DASHBOARD DE ANALISE E CONTROLE (WAR ROOM) */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: 40 }}>
        <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(32, 217, 255, 0.05), rgba(37, 99, 235, 0.05))', border: '1px solid rgba(32, 217, 255, 0.1)' }}>
          <span className={styles.eyebrow}>Audiencia Total (Historico)</span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '8px 0' }}>{performance.absoluteTotal.toLocaleString('pt-BR')}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              padding: '4px 10px', 
              borderRadius: '20px', 
              fontSize: '0.75rem', 
              fontWeight: 800,
              background: performance.trendPercentage >= 0 ? 'rgba(53, 242, 185, 0.1)' : 'rgba(251, 113, 133, 0.1)',
              color: performance.trendPercentage >= 0 ? 'var(--green)' : 'var(--danger)'
            }}>
              {performance.trendPercentage >= 0 ? '↑' : '↓'} {Math.abs(performance.trendPercentage)}%
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>crescimento no periodo</span>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <span className={styles.eyebrow}>Impacto por Editoria</span>
          <div style={{ marginTop: 12 }}>
            {performance.mostReadTopics && performance.mostReadTopics.length > 0 ? performance.mostReadTopics.slice(0, 3).map((topic, idx) => (
              <div key={topic.topic} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{topic.topic.toUpperCase().replaceAll("-", " ")}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--cyan)', fontWeight: 800 }}>{topic.views} views</span>
              </div>
            )) : (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>Aguardando primeiros dados<br/>de trafego real...</p>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <span className={styles.eyebrow}>Saude da Rede</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Posts no Ar</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{allPosts.filter(p => p.status === 'published').length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Tags Ativas</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{tags.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Taxa de Engajamento</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--green)' }}>ALTA</span>
            </div>
          </div>
        </div>
      </section>

      {/* AGENTE DE AUTONOMIA TOTAL (TOTAL AUTONOMY) */}
      <section className="card" style={{ padding: 24, marginBottom: 32, border: `1px solid ${autonomy.active ? 'var(--green)' : 'var(--muted)'}`, background: 'linear-gradient(135deg, rgba(53, 242, 185, 0.03), rgba(53, 242, 185, 0.08))' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <span style={{ width: 10, height: 10, borderRadius: '50%', background: autonomy.active ? 'var(--green)' : 'var(--muted)', boxShadow: autonomy.active ? '0 0 10px var(--green)' : 'none' }}></span>
               <span className={styles.eyebrow} style={{ color: autonomy.active ? 'var(--green)' : 'var(--muted)' }}>CENTRAL DE COMANDO M4 (v3.7)</span>
            </div>
            <h2 style={{ margin: '8px 0', fontSize: '1.8rem', opacity: autonomy.active ? 1 : 0.6 }}>Controle Cronometrado M4</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Este agente monitora o <b>Impacto por Editoria</b> e publica automaticamente nos horarios de pico.</p>
            
            {/* MONITOR DE PRODUÇÃO EM TEMPO REAL */}
            <div style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', opacity: 0.6, textTransform: 'uppercase' }}>Em Produção</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--cyan)' }}>{allPosts.filter(p => p.status === 'generating').length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', opacity: 0.6, textTransform: 'uppercase' }}>Na Fila</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>{allPosts.filter(p => p.status === 'queued').length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', opacity: 0.6, textTransform: 'uppercase' }}>Meta Diária</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--green)' }}>{autonomy.dailyCount}</span>
              </div>
            </div>
          </div>
          <form action={toggleAutonomyAction} style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'flex-end' }}>
            <input type="hidden" name="currentStatus" value={String(autonomy.active)} />
            
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
               <label className={styles.field} style={{ marginBottom: 0, width: '140px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px', display: 'block' }}>Meta (Posts/Dia)</span>
                  <input name="dailyCount" type="number" defaultValue={String(autonomy.dailyCount ?? 5)} min="1" max="100" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', height: '48px' }} />
               </label>
               <label className={styles.field} style={{ marginBottom: 0, width: '160px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px', display: 'block' }}>Hora de Inicio</span>
                  <input name="startTime" type="time" defaultValue={autonomy.startTime ?? "08:00"} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', height: '48px' }} />
               </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', marginTop: '10px', width: '100%' }}>
               <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.1em', width: '100%', textAlign: 'right' }}>DIAS DE OPERACAO</span>
               <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
                  {[
                    { key: 'seg', label: 'S' },
                    { key: 'ter', label: 'T' },
                    { key: 'qua', label: 'Q' },
                    { key: 'qui', label: 'Q' },
                    { key: 'sex', label: 'S' },
                    { key: 'sab', label: 'S' },
                    { key: 'dom', label: 'D' }
                  ].map((day) => (
                    <label key={day.key} style={{ cursor: 'pointer', position: 'relative' }}>
                      <input 
                        type="checkbox" 
                        name="activeDays" 
                        value={day.key} 
                        defaultChecked={autonomy.activeDays?.includes(day.key) ?? true} 
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                      />
                      <div className="daySelector" style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '10px', 
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}>
                        {day.label}
                      </div>
                    </label>
                  ))}
               </div>
            </div>

            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, marginBottom: 8, color: 'var(--muted)' }}>SALVAR & ALTERAR STATUS</span>
              <button 
                className="button" 
                type="submit" 
                style={{ 
                  background: autonomy.active ? 'var(--green)' : 'rgba(255,255,255,0.1)', 
                  color: autonomy.active ? 'black' : 'white', 
                  fontWeight: 900,
                  boxShadow: autonomy.active ? '0 0 20px rgba(53, 242, 185, 0.3)' : 'none'
                }}
              >
                {autonomy.active ? 'ATIVO (LIGADO)' : 'INATIVO (DESLIGADO)'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="card" style={{ padding: 24, marginBottom: 32, border: '1px solid var(--cyan)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', alignItems: 'center' }}>
          <div>
            <span className={styles.eyebrow}>Programacao Editorial</span>
            <h2 style={{ margin: '8px 0', fontSize: '1.8rem' }}>Meta de Conteudo</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Defina a quantidade de artigos que a IA deve criar por dia.</p>
          </div>
          <BatchCreator />
          <div style={{ padding: '16px', background: 'rgba(32, 217, 255, 0.05)', borderRadius: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--cyan)' }}>{allPosts.filter(p => p.status === 'review').length}</span>
            <span style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800 }}>Na fila de aprovacao</span>
          </div>
        </div>
      </section>

      <div className={styles.adminLayout} style={{ gridTemplateColumns: '300px 1fr', gap: '32px' }}>
          <aside className={`${styles.sidebar} card`} style={{ padding: 24, height: 'fit-content' }}>
            <span className={styles.eyebrow}>Filtros Editorial</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 16 }}>
              {["all", "review", "published", "draft", "rejected"].map((item) => (
                <Link className={`buttonSecondary ${styles.filterButton}`} href={`/admin?status=${item}`} key={item} style={{ background: status === item ? 'rgba(32, 217, 255, 0.15)' : '' }}>
                  {item === "all" ? "Todos os Posts" : item.toUpperCase()}
                </Link>
              ))}
            </div>

            <hr style={{ borderColor: "rgba(125,211,252,.18)", margin: "24px 0" }} />
            <h3>Tags estrategicas</h3>
            <form action={addTagAction} className={styles.quickActions}>
              <input name="tag" placeholder="nova-tag" style={{ flex: 1, minWidth: 0, borderRadius: 8, padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)' }} />
              <button className="buttonSecondary" type="submit">Add</button>
            </form>
            <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tags.map((tag) => (
                <form action={removeTagAction} key={tag}>
                  <input type="hidden" name="tag" value={tag} />
                  <button className={styles.badge} type="submit" style={{ cursor: 'pointer', background: 'none' }}>
                    #{tag} <span style={{ color: 'var(--danger)', marginLeft: 6 }}>×</span>
                  </button>
                </form>
              ))}
            </div>
          </aside>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
            {sortedPosts.length > 0 ? sortedPosts.map((post) => (
              <article key={post.id} className="card" style={{ padding: 0, overflow: 'hidden', border: post.status === 'review' ? '1px solid var(--cyan)' : '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', height: '220px' }}>
                  <img src={post.imageUrl || 'https://images.unsplash.com/photo-1611974714658-058f40da23fb?q=80&w=2070&auto=format&fit=crop'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '0.65rem', 
                      fontWeight: 900, 
                      textTransform: 'uppercase',
                      background: post.status === 'review' ? 'var(--cyan)' : 'var(--bg)',
                      color: post.status === 'review' ? 'black' : 'white',
                      border: '1px solid var(--cyan)'
                    }}>
                      {post.status}
                    </span>
                  </div>
                </div>
                
                <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <form action={savePostAction} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <input type="hidden" name="id" value={post.id} />
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <label className={styles.field} style={{ marginBottom: 0 }}>
                        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>SUGESTAO DE DATA</span>
                        <input 
                          name="publishedAt" 
                          type="datetime-local" 
                          defaultValue={post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)} 
                          style={{ fontSize: '0.8rem', padding: '8px' }}
                        />
                      </label>
                      <label className={styles.field} style={{ marginBottom: 0 }}>
                        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>IMAGEM (URL)</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input name="imageUrl" defaultValue={post.imageUrl} placeholder="URL da imagem" style={{ fontSize: '0.8rem', padding: '8px', flex: 1 }} />
                          <button 
                            formAction={remakeImageAction} 
                            formTarget="_self"
                            className="buttonSecondary" 
                            style={{ padding: '8px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                            title="Trocar Imagem Aleatoriamente"
                          >
                            Trocar
                          </button>
                        </div>
                      </label>
                    </div>

                    <label className={styles.field} style={{ marginBottom: 16 }}>
                      <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>TITULO</span>
                      <input name="title" defaultValue={post.title} style={{ fontWeight: 800, fontSize: '1rem', padding: '10px' }} />
                    </label>

                    <label className={styles.field} style={{ flex: 1, marginBottom: 16 }}>
                      <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>CONTEUDO</span>
                      <textarea name="content" defaultValue={post.content} style={{ minHeight: '150px', fontSize: '0.85rem', lineHeight: '1.6', padding: '10px' }} />
                    </label>

                    <button className="button" type="submit" style={{ background: 'linear-gradient(135deg, #20d9ff, #3b82f6)', border: 'none', width: '100%', marginBottom: 12 }}>
                      SALVAR EDICOES
                    </button>
                  </form>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                    <form action={setStatusAction}>
                      <input type="hidden" name="id" value={post.id} />
                      <input type="hidden" name="status" value="published" />
                      <button className="button" type="submit" style={{ width: '100%', background: 'var(--green)', color: 'black', fontWeight: 900, fontSize: '0.75rem', border: 'none' }}>
                        APROVAR E PUBLICAR
                      </button>
                    </form>
                    {post.status === 'published' ? (
                      <form action={setStatusAction}>
                        <input type="hidden" name="id" value={post.id} />
                        <input type="hidden" name="status" value="draft" />
                        <button className="button" type="submit" style={{ width: '100%', background: 'var(--orange)', color: 'black', fontWeight: 900, fontSize: '0.75rem', border: 'none' }}>
                          DESPUBLICAR (RASCUNHO)
                        </button>
                      </form>
                    ) : (
                      <form action={setStatusAction}>
                        <input type="hidden" name="id" value={post.id} />
                        <input type="hidden" name="status" value="rejected" />
                        <button className="buttonSecondary" type="submit" style={{ width: '100%', color: 'var(--danger)', fontSize: '0.75rem' }}>
                          REJEITAR
                        </button>
                      </form>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <form action={remakePostAction} style={{ flex: 1 }}>
                      <input type="hidden" name="id" value={post.id} />
                      <input type="hidden" name="title" value={post.title} />
                      <button className="buttonSecondary" type="submit" style={{ width: '100%', fontSize: '0.65rem' }}>REFAZER</button>
                    </form>
                    <form action={deletePostAction}>
                      <input type="hidden" name="id" value={post.id} />
                      <button className="buttonSecondary" type="submit" style={{ color: 'var(--danger)', fontSize: '0.65rem' }}>EXCLUIR</button>
                    </form>
                  </div>
                </div>
              </article>
            )) : (
              <div className="card" style={{ padding: 40, textAlign: 'center', gridColumn: '1 / -1' }}>
                <p>Nenhum post encontrado para este filtro.</p>
                <Link href="/admin?status=all" className="button">Ver todos os posts</Link>
              </div>
            )}
          </section>
      </div>
    </main>
  );
}
