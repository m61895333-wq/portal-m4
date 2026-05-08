const { createClient } = require('@supabase/supabase-js');
const url = 'https://iueoqdwhrnxkgjrqybwo.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZW9xZHdocm54a2dqcnF5YndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEyODY3MywiZXhwIjoyMDkzNzA0NjczfQ.qFnIR_dWoWQqNkVNISbbYJ4AqBEk-aXnqorwthh4hBI';
const supabase = createClient(url, key);

async function forceStableImages() {
  console.log('Forçando URLs estáveis para todos os artigos...');
  const { data } = await supabase.from('portal_posts').select('id');
  
  if (data) {
    for (const post of data) {
      const stableUrl = `https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80&sig=${post.id.slice(0, 8)}-${Date.now()}`;
      await supabase.from('portal_posts').update({ image_url: stableUrl }).eq('id', post.id);
    }
  }
  console.log('Todas as imagens foram estabilizadas!');
}
forceStableImages();
