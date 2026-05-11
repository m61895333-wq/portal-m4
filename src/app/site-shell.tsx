import Link from "next/link";
import { categories } from "@/lib/categories";
import { getPerformance } from "@/lib/portal-cms";
import { MobileMenuTrigger } from "./mobile-nav";

/**
 * Sidebar (Menu Lateral)
 * Apresenta a marca, as categorias de navegação (Editorias) e o Contador de Impacto Global.
 * O contador de acessos lê o `absoluteTotal` do banco de dados de visualizações globais.
 */
export async function Sidebar() {
  const perf = await getPerformance("month");
  
  return (
    <aside className="sidebar" style={{ width: '260px', minWidth: '260px', maxWidth: '260px' }}>
      <Link href="/" className="brand" aria-label="Portal M4" style={{ padding: '32px 24px' }}>
        <img src="/portal-m4-brand-logo.png" alt="Logo Portal M4" />
        <span>Portal M4</span>
      </Link>

      <nav className="sidebarMenu" style={{ marginTop: '20px', padding: '0 12px', flex: 1 }}>
        <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: '16px', paddingLeft: '14px', textTransform: 'uppercase' }}>Editorias</span>
        {categories.map((category) => (
          <Link key={category.slug} href={`/categoria/${category.slug}`} className="sidebarLink" style={{ padding: '6px 14px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: category.accent }} />
            {category.name}
          </Link>
        ))}
      </nav>

      <div className="sidebarStats" style={{ padding: '32px 24px', borderTop: '1px solid var(--line)' }}>
        <div className="statsCard" style={{ textAlign: 'center', display: 'block', opacity: 1 }}>
          <span style={{ display: 'block', fontSize: '2.4rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{perf.absoluteTotal.toLocaleString('pt-BR')}</span>
          <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--cyan)', letterSpacing: '0.1em', marginTop: '8px', textTransform: 'uppercase' }}>Acessos</span>
        </div>
      </div>
    </aside>
  );
}

/**
 * Header (Cabeçalho Superior)
 * Contém o menu principal (Home, Sobre, Contato) e o disparador do menu mobile.
 */
export async function Header() {
  const perf = await getPerformance("month");

  return (
    <header className="header">
      <nav className="container nav">
        <div className="menu" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <MobileMenuTrigger totalViews={perf.totalViews} />
          <Link href="/" className="hideMobile">Home</Link>
          <Link href="/artigos" className="hideMobile" style={{ color: 'var(--cyan)', fontWeight: 700 }}>Artigos</Link>
          <Link href="/sobre" className="hideMobile">Sobre</Link>
          <Link href="/contato" className="hideMobile">Contato</Link>
        </div>
      </nav>
    </header>
  );
}

/**
 * Footer (Rodapé)
 * Apresenta informações de marca, mapa do site e links do ecossistema do Grupo M4.
 */
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footerGrid">
        <div>
          <div className="brand">
            <img src="/portal-m4-brand-logo.png" alt="Logo Portal M4" />
            <span>Portal M4</span>
          </div>
          <p>Conteudo premium do Grupo M4 sobre mercado, tecnologia, IA e negocios digitais.</p>
          <p>Todos os direitos reservados.</p>
        </div>
        <div>
          <strong>Navegação</strong>
          <Link href="/">Home</Link>
          <Link href="/artigos">Todos os Artigos</Link>
          <Link href="/sobre">Sobre</Link>
          <Link href="/contato">Contato</Link>
        </div>
        <div>
          <strong>Categorias</strong>
          {categories.map((category) => (
            <Link key={category.slug} href={`/categoria/${category.slug}`}>
              {category.name}
            </Link>
          ))}
        </div>
        <div>
          <strong>Grupo M4</strong>
          <Link href="https://salex.com.br">Salex AI</Link>
          <Link href="https://m4games.com.br">M4 Games</Link>
          <Link href="https://grupom4.com">Grupo M4</Link>
          <Link href="mailto:contato@portalm4.com.br">contato@portalm4.com.br</Link>
          <Link href="mailto:admin@portalm4.com.br">admin@portalm4.com.br</Link>
        </div>
      </div>
    </footer>
  );
}
