import Link from "next/link";
import { categories } from "@/lib/categories";
import { getPerformance } from "@/lib/portal-cms";
import { MobileMenuTrigger } from "./mobile-nav";
import styles from "./portal.module.css";

/**
 * Sidebar (Menu Lateral)
 * Apresenta a marca, as categorias de navegação (Editorias) e o Contador de Impacto Global.
 * Desativado globalmente para suportar a visualização horizontal limpa de alta gama em todo o site.
 */
export async function Sidebar() {
  return null;
}

/**
 * Header (Cabeçalho Superior)
 * Renderiza o mesmo menu horizontal minimalista e de alta gama da página principal.
 */
export async function Header() {
  const perf = await getPerformance("month");

  return (
    <header className={styles.cleanNavbar}>
      <div className={styles.cleanThemeContainer}>
        <div className={styles.cleanNavbarInner}>
          <div className="showMobile" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>
            <MobileMenuTrigger totalViews={perf.totalViews} />
          </div>
          <Link href="/" className={styles.cleanBrand}>
            <img src="/portal-m4-brand-logo.png" alt="Logo Portal M4" />
            <span>Portal M4</span>
          </Link>
          <nav className={styles.cleanNavLinks}>
            <Link href="/" className={styles.cleanNavLink}>Home</Link>
            <Link href="/artigos" className={styles.cleanNavLink}>Todos os Artigos</Link>
            <Link href="/sobre" className={styles.cleanNavLink}>Sobre</Link>
            <Link href="/contato" className={styles.cleanNavLink}>Contato</Link>
          </nav>
          <Link href="/admin" className={styles.cleanSubscribeBtn}>Painel Editorial</Link>
        </div>
      </div>
    </header>
  );
}

/**
 * Footer (Rodapé)
 * Apresenta o mesmo rodapé de alta gama unificado da página principal.
 */
export function Footer() {
  return (
    <footer className={styles.cleanFooter}>
      <div className={styles.cleanThemeContainer}>
        <div className={styles.cleanFooterGrid}>
          
          <div className={styles.cleanFooterCol}>
            <div className={styles.cleanBrand} style={{ marginBottom: 8 }}>
              <img src="/portal-m4-brand-logo.png" alt="Logo Portal M4" />
              <span>Portal M4</span>
            </div>
            <p>Análises premium e contextuais sobre mercado financeiro, investimentos, tecnologia e carreira na era digital.</p>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 12 }}>© 2026 Grupo M4. Todos os direitos reservados.</p>
          </div>

          <div className={styles.cleanFooterCol}>
            <strong>Navegação</strong>
            <Link href="/" className={styles.cleanFooterLink}>Home</Link>
            <Link href="/artigos" className={styles.cleanFooterLink}>Todos os Artigos</Link>
            <Link href="/sobre" className={styles.cleanFooterLink}>Sobre o Portal</Link>
            <Link href="/contato" className={styles.cleanFooterLink}>Fale Conosco</Link>
          </div>

          <div className={styles.cleanFooterCol}>
            <strong>Editorias</strong>
            {categories.map((category) => (
              <Link 
                key={category.slug} 
                href={`/artigos?categoria=${category.slug}`} 
                className={styles.cleanFooterLink}
              >
                {category.name}
              </Link>
            ))}
          </div>

          <div className={styles.cleanFooterCol}>
            <strong>Ecossistema M4</strong>
            <Link href="https://salex.com.br" className={styles.cleanFooterLink} target="_blank">Salex AI</Link>
            <Link href="https://m4games.com.br" className={styles.cleanFooterLink} target="_blank">M4 Games</Link>
            <Link href="https://grupom4.com" className={styles.cleanFooterLink} target="_blank">Grupo M4</Link>
            <Link href="/admin" className={styles.cleanFooterLink} style={{ color: "#2563eb", fontWeight: 700 }}>Acesso Editorial</Link>
          </div>

        </div>
      </div>
    </footer>
  );
}
