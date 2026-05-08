import { Footer, Header, Sidebar } from "../site-shell";
import { ContactForm } from "./contact-form";

export default function ContactPage() {
  return (
    <div className="mainLayout">
      <Sidebar />
      <main className="contentShell">
        <Header />
        
        <div className="container" style={{ paddingTop: 80, paddingBottom: 100 }}>
          <div className="articleReader" style={{ textAlign: 'center' }}>
            <span className="badge" style={{ marginBottom: 16 }}>Relacionamento</span>
            <h1 style={{ marginBottom: 24 }}>Entre em Contato</h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--muted)', marginBottom: 48 }}>
              Tem uma sugestao de pauta, proposta de parceria ou feedback? 
              Nossa equipe editorial esta pronta para te ouvir.
            </p>

            <ContactForm />

            <div style={{ marginTop: 48, paddingTop: 48, borderTop: '1px solid var(--line)' }}>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 8 }}>Preferir enviar um e-mail direto?</p>
              <a 
                href="mailto:contato@portalm4.com.br" 
                style={{ 
                  color: 'var(--cyan)', 
                  fontSize: '1.4rem', 
                  fontWeight: 800,
                  textDecoration: 'underline'
                }}
              >
                contato@portalm4.com.br
              </a>
            </div>
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
}
