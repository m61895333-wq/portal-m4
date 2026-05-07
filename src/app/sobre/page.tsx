import { Footer, Header, Sidebar } from "../site-shell";

export default function AboutPage() {
  return (
    <div className="mainLayout">
      <Sidebar />
      <main className="contentShell">
        <Header />
        
        <div className="container" style={{ paddingTop: 80, paddingBottom: 100 }}>
          <article className="articleReader">
            <span className="badge" style={{ marginBottom: 16 }}>Institucional</span>
            <h1 style={{ marginBottom: 32 }}>Sobre o Portal M4: A Inteligencia da Nova Economia</h1>
            
            <p style={{ fontSize: '1.4rem', color: 'white', fontWeight: 600, lineHeight: 1.5, marginBottom: 40 }}>
              O Portal M4 e a divisao de inteligencia editorial do Grupo M4, nascida para decodificar a complexidade dos investimentos, da tecnologia e da inteligencia artificial.
            </p>

            <img 
              src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80" 
              alt="Tecnologia e Inteligencia" 
              style={{ width: '100%', borderRadius: 24, marginBottom: 48, boxShadow: '0 40px 100px rgba(0,0,0,0.4)' }}
            />

            <h2>Nossa Visao</h2>
            <p>
              Vivemos em uma era onde a informacao e abundante, mas a clareza e escassa. No Portal M4, nao entregamos apenas noticias; entregamos analise profunda. Nossa missao e fornecer ao investidor, ao desenvolvedor e ao entusiasta de tecnologia as ferramentas intelectuais necessarias para tomar decisoes estrategicas.
            </p>

            <h2>O Ecossistema Grupo M4</h2>
            <p>
              Nao somos apenas um portal de conteudo. Fazemos parte de um ecossistema vibrante que inclui:
            </p>
            <ul>
              <li style={{ marginBottom: 12 }}><strong>Salex AI</strong>: Nossa plataforma de SaaS e automacao comercial baseada em IA, que transforma o fluxo de vendas de empresas ao redor do mundo.</li>
              <li style={{ marginBottom: 12 }}><strong>M4 Games</strong>: Onde a tecnologia encontra o entretenimento, explorando as fronteiras do desenvolvimento de jogos e experiencias digitais imersivas.</li>
              <li><strong>Portal M4</strong>: O hub de conhecimento que conecta todos esses pontos.</li>
            </ul>

            <h2>Padrao Editorial Premium</h2>
            <p>
              Cada artigo publicado em nossa plataforma passa por um rigoroso processo de curadoria. Nossos textos de longa duracao (long-form) sao projetados para quem nao tem medo de se aprofundar nos temas mais complexos da atualidade. 
            </p>
            <p>
              Seja bem-vindo ao futuro da informacao. Seja bem-vindo ao Portal M4.
            </p>

            <div style={{ marginTop: 64, padding: 40, background: 'rgba(32, 217, 255, 0.05)', borderRadius: 24, textAlign: 'center', border: '1px solid var(--line)' }}>
              <h3 style={{ color: 'var(--cyan)', marginTop: 0 }}>Fique por dentro</h3>
              <p>Explore nossas categorias e descubra como a IA e os investimentos estao moldando o seu amanhia.</p>
            </div>
          </article>
        </div>

        <Footer />
      </main>
    </div>
  );
}
