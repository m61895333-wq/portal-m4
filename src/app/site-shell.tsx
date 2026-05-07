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

      <nav className="sidebarMenu">
        <span className="statsLabel" style={{ marginLeft: '18px', marginBottom: '8px', display: 'block' }}>Editorias</span>
        {categories.map((category) => (
          <Link key={category.slug} href={`/categoria/${category.slug}`} className="sidebarLink">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: category.accent }} />
            {category.name}
          </Link>
        ))}
      </nav>

      <div className="sidebarStats">
        <div className="statsCard">
          <span className="statsValue">{perf.totalViews.toLocaleString('pt-BR')}</span>
          <span className="statsLabel">Acessos Totais</span>
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
        <div className="menu">
          <Link href="/admin" className="buttonSecondary" style={{ padding: '8px 16px' }}>Admin</Link>
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
          <Link href="https://grupom4.com">Grupo M4</Link>
          <Link href="https://portalm4.com.br">Portal M4</Link>
          <Link href="mailto:contato@portalm4.com.br">contato@portalm4.com.br</Link>
        </div>
      </div>
    </footer>
  );
}
