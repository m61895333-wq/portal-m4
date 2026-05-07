import { Footer, Header, Sidebar } from "../site-shell";

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

            <form className="card" style={{ padding: 40, textAlign: 'left', maxWidth: 600, margin: '0 auto' }}>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 700, color: 'var(--cyan)' }}>
                  Nome Completo
                </label>
                <input 
                  type="text" 
                  placeholder="Seu nome..."
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--line)', 
                    borderRadius: 12,
                    color: 'white'
                  }} 
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 700, color: 'var(--cyan)' }}>
                  E-mail Profissional
                </label>
                <input 
                  type="email" 
                  placeholder="seu@email.com"
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--line)', 
                    borderRadius: 12,
                    color: 'white'
                  }} 
                />
              </div>

              <div style={{ marginBottom: 32 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 700, color: 'var(--cyan)' }}>
                  Mensagem
                </label>
                <textarea 
                  rows={5}
                  placeholder="Como podemos ajudar?"
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--line)', 
                    borderRadius: 12,
                    color: 'white',
                    resize: 'none'
                  }} 
                ></textarea>
              </div>

              <button className="button" style={{ width: '100%', padding: 16 }}>
                Enviar Mensagem
              </button>
            </form>

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
