const { createClient } = require('@supabase/supabase-js');
const url = 'https://iueoqdwhrnxkgjrqybwo.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZW9xZHdocm54a2dqcnF5YndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEyODY3MywiZXhwIjoyMDkzNzA0NjczfQ.qFnIR_dWoWQqNkVNISbbYJ4AqBEk-aXnqorwthh4hBI';
const supabase = createClient(url, key);

async function fixImages() {
  const { data } = await supabase.from('portal_posts').select('id, title').eq('image_url', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=2070&auto=format&fit=crop');
  
  if (data) {
    for (const post of data) {
      const searchTerm = post.title.split(' ')[0].toLowerCase();
      const newUrl = `https://source.unsplash.com/1400x800/?${searchTerm},professional&sig=${post.id.slice(0, 8)}`;
      await supabase.from('portal_posts').update({ image_url: newUrl }).eq('id', post.id);
      console.log(`Imagem corrigida para: ${post.title}`);
    }
  }
}
fixImages();
