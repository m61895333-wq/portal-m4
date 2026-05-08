import Link from "next/link";
import { categories } from "@/lib/categories";
import { getPerformance } from "@/lib/portal-cms";
import { MobileMenuTrigger } from "./mobile-nav";

export async function Sidebar() {
  const perf = await getPerformance("month");
  
  return (
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="Portal M4">
        <img src="/portal-m4-brand-logo.png" alt="Logo Portal M4" />
        <span>Portal M4</span>
      </Link>

      <div style={{ flex: 1 }} />

      <div className="sidebarStats" style={{ padding: '40px 24px', borderTop: '1px solid var(--line)' }}>
        <div className="statsCard" style={{ background: 'linear-gradient(135deg, rgba(32, 217, 255, 0.1), rgba(53, 242, 185, 0.1))', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.1em', marginBottom: '8px', textTransform: 'uppercase' }}>Impacto Global M4</span>
          <span className="statsValue" style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>{perf.absoluteTotal.toLocaleString('pt-BR')}</span>
          <span className="statsLabel" style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, marginTop: '4px' }}>Acessos Registrados</span>
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
