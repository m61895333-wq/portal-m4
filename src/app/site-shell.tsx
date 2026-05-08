import Link from "next/link";
import { categories } from "@/lib/categories";
import { getPerformance } from "@/lib/portal-cms";
import { MobileMenuTrigger } from "./mobile-nav";

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
          <Link key={category.slug} href={`/categoria/${category.slug}`} className="sidebarLink" style={{ padding: '12px 14px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: category.accent }} />
            {category.name}
          </Link>
        ))}
      </nav>

      <div className="sidebarStats" style={{ padding: '24px', borderTop: '1px solid var(--line)' }}>
        <div className="statsCard" style={{ background: 'linear-gradient(135deg, rgba(32, 217, 255, 0.1), rgba(53, 242, 185, 0.1))', padding: '20px', borderRadius: '14px', border: '1px solid var(--line)', display: 'block', opacity: 1 }}>
          <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, color: 'var(--cyan)', letterSpacing: '0.15em', marginBottom: '8px', textTransform: 'uppercase' }}>Impacto Global M4</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>{perf.absoluteTotal.toLocaleString('pt-BR')}</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acessos Reais</span>
          </div>
          <div style={{ marginTop: '12px', height: '2px', background: 'var(--line)', width: '100%' }} />
          <p style={{ margin: '8px 0 0', fontSize: '0.6rem', color: 'var(--muted)', lineHeight: '1.4' }}>Contabilizando Home, Categorias e Artigos em tempo real.</p>
        </div>
      </div>
    </aside>
  );
}

export async function Header() {
  const perf = await getPerformance("month");

  return (
    <header className="header">
      <nav className="container nav">
        <div className="menu" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <MobileMenuTrigger totalViews={perf.totalViews} />
          <Link href="/" className="hideMobile">Home</Link>
          <Link href="/sobre" className="hideMobile">Sobre</Link>
          <Link href="/contato" className="hideMobile">Contato</Link>
        </div>
      </nav>
    </header>
  );
}

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
        </div>
      </div>
    </footer>
  );
}
