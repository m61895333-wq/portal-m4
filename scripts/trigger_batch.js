const { createClient } = require('@supabase/supabase-js');
const url = 'https://iueoqdwhrnxkgjrqybwo.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZW9xZHdocm54a2dqcnF5YndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEyODY3MywiZXhwIjoyMDkzNzA0NjczfQ.qFnIR_dWoWQqNkVNISbbYJ4AqBEk-aXnqorwthh4hBI';
const supabase = createClient(url, key);

async function triggerBatch() {
  const topics = [
    "O Impacto da IA Generativa na Produtividade do Setor Financeiro em 2026",
    "Estrategias de Alocacao de Ativos em Cenarios de Alta Volatilidade Global",
    "A Revolucao dos Agentes Autonomos: Como a IA esta Redefinindo o SaaS Premium",
    "Analise: O Futuro das Fintechs sob a Otica da Regulamentacao de IA no Brasil",
    "Empreendedorismo na Era da Inteligencia Artificial: O Fim das Barreiras de Entrada?"
  ];

  console.log('Disparando leva de 5 artigos...');

  for (const topic of topics) {
    const slug = `pauta-${Date.now()}-${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;
    const { data, error } = await supabase.from('portal_posts').insert({
      title: topic,
      slug: slug,
      content: "Gerando conteudo epico no servidor de 8GB...",
      excerpt: "Aguardando processamento do Protocolo Zero-Review...",
      category: "IA & MERCADO",
      status: "queued",
      priority: 10,
      image_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=2070&auto=format&fit=crop",
      is_active: true
    });
    
    if (error) console.error(`Erro ao criar ${topic}:`, error.message);
    else console.log(`Enfileirado: ${topic}`);
  }
}

triggerBatch();
