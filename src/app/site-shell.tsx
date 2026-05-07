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

        <div style={{ marginTop: '32px' }}>
          <span className="statsLabel" style={{ marginLeft: '18px', marginBottom: '16px', display: 'block' }}>Em Alta</span>
          {perf.mostReadPosts.map((post, idx) => (
            <Link key={post.slug} href={`/artigo/${post.slug}`} className="sidebarLink" style={{ alignItems: 'flex-start', gap: '12px', padding: '10px 18px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 900, marginTop: '2px' }}>{(idx + 1).toString().padStart(2, '0')}</span>
              <span style={{ fontSize: '0.85rem', lineHeight: '1.4', fontWeight: 500 }}>{post.title}</span>
            </Link>
          ))}
        </div>

        <div style={{ marginTop: '32px' }}>
          <span className="statsLabel" style={{ marginLeft: '18px', marginBottom: '16px', display: 'block' }}>Novidades</span>
          {perf.recentPosts.map((post) => (
            <Link key={`rec-${post.slug}`} href={`/artigo/${post.slug}`} className="sidebarLink" style={{ padding: '10px 18px' }}>
              <span style={{ fontSize: '0.85rem', lineHeight: '1.4', fontWeight: 500 }}>{post.title}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="sidebarStats">
        <div className="statsCard">
          <span className="statsValue">{perf.absoluteTotal.toLocaleString('pt-BR')}</span>
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
