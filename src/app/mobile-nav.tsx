"use client";

import { useState } from "react";
import Link from "next/link";
import { categories } from "@/lib/categories";

export function MobileMenuTrigger({ totalViews }: { totalViews: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        className="mobileMenuButton" 
        onClick={() => setIsOpen(true)}
        aria-label="Abrir Menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        <span>Menu</span>
      </button>

      <div className={`mobileDrawer ${isOpen ? "open" : ""}`}>
        <div className="drawerHeader">
          <Link href="/" className="brand" onClick={() => setIsOpen(false)}>
            <img src="/portal-m4-brand-logo.png" alt="Logo" style={{ width: 40, height: 40 }} />
            <span>Portal M4</span>
          </Link>
          <button className="closeButton" onClick={() => setIsOpen(false)}>✕</button>
        </div>

        <nav className="drawerMenu">
          <span className="statsLabel">Editorias</span>
          {categories.map((category) => (
            <Link 
              key={category.slug} 
              href={`/categoria/${category.slug}`} 
              className="sidebarLink"
              onClick={() => setIsOpen(false)}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: category.accent }} />
              {category.name}
            </Link>
          ))}
          
          <hr style={{ borderColor: 'var(--line)', margin: '20px 0' }} />
          <Link href="/sobre" className="sidebarLink" onClick={() => setIsOpen(false)}>Sobre o Portal</Link>
          <Link href="/contato" className="sidebarLink" onClick={() => setIsOpen(false)}>Contato</Link>
          <Link href="/admin" className="sidebarLink" onClick={() => setIsOpen(false)}>Painel Admin</Link>
        </nav>

        <div className="drawerFooter">
          <div className="statsCard">
            <span className="statsValue">{totalViews.toLocaleString('pt-BR')}</span>
            <span className="statsLabel">Acessos Totais</span>
          </div>
        </div>
      </div>

      {isOpen && <div className="drawerOverlay" onClick={() => setIsOpen(false)} />}
    </>
  );
}
