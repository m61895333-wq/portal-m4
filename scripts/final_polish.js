const { createClient } = require('@supabase/supabase-js');
const url = 'https://iueoqdwhrnxkgjrqybwo.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZW9xZHdocm54a2dqcnF5YndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEyODY3MywiZXhwIjoyMDkzNzA0NjczfQ.qFnIR_dWoWQqNkVNISbbYJ4AqBEk-aXnqorwthh4hBI';
const supabase = createClient(url, key);

// Lista de fotos Premium para garantir variedade imediata
const premiumPhotos = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1454165833467-03a05dcdad79?q=80&w=1400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1400&auto=format&fit=crop"
];

async function finalPolish() {
  console.log('--- POLIMENTO FINAL DO PORTAL M4 ---');
  const { data } = await supabase.from('portal_posts').select('*');
  
  if (data) {
    for (let i = 0; i < data.length; i++) {
      const post = data[i];
      const photo = premiumPhotos[i % premiumPhotos.length] + `&sig=${post.id.slice(0, 8)}`;
      
      const cleanContent = post.content.replace(/\*\*/g, '').replace(/\*/g, '');
      const cleanTitle = post.title.replace(/\*\*/g, '').replace(/\*/g, '');

      await supabase.from('portal_posts').update({
        image_url: photo,
        content: cleanContent,
        title: cleanTitle
      }).eq('id', post.id);
      
      console.log(`Polido: ${post.id}`);
    }
  }
  console.log('--- SISTEMA LIMPO E VARIADO ---');
}
finalPolish();
