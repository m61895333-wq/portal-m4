const { createClient } = require('@supabase/supabase-js');
const url = 'https://iueoqdwhrnxkgjrqybwo.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZW9xZHdocm54a2dqcnF5YndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEyODY3MywiZXhwIjoyMDkzNzA0NjczfQ.qFnIR_dWoWQqNkVNISbbYJ4AqBEk-aXnqorwthh4hBI';
const supabase = createClient(url, key);

async function globalCleanup() {
  console.log('Iniciando limpeza global de asteriscos e correção de badges...');
  
  const { data } = await supabase.from('portal_posts').select('*');
  
  if (data) {
    for (const post of data) {
      let needsUpdate = false;
      const updates = {};
      
      // 1. Limpar asteriscos do titulo e conteudo
      if (post.title.includes('*')) {
        updates.title = post.title.replace(/\*/g, '').trim();
        needsUpdate = true;
      }
      if (post.content.includes('*')) {
        updates.content = post.content.replace(/\*\*/g, '').replace(/\*/g, '');
        needsUpdate = true;
      }
      
      // 2. Garantir categoria valida
      if (!post.category || post.category === 'NULL' || post.category === 'null') {
        updates.category = 'IA & MERCADO';
        needsUpdate = true;
      }

      if (needsUpdate) {
        await supabase.from('portal_posts').update(updates).eq('id', post.id);
        console.log(`Post corrigido: ${post.id}`);
      }
    }
  }
  console.log('Limpeza concluída!');
}
globalCleanup();
