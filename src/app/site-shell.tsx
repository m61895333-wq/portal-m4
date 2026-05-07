import Link from "next/link";
import { categories } from "@/lib/categories";

export function Header() {
  return (
    <header className="header">
      <nav className="container nav">
        <Link href="/" className="brand" aria-label="Portal M4">
          <img src="/portal-m4-brand-logo.png" alt="Logo Portal M4" />
          <span>Portal M4</span>
        </Link>
        <div className="menu">
          {categories.slice(0, 5).map((category) => (
            <Link key={category.slug} href={`/categoria/${category.slug}`}>
              {category.shortName}
            </Link>
          ))}
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
