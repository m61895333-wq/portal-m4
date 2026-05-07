const { createClient } = require('@supabase/supabase-js');
const url = 'https://iueoqdwhrnxkgjrqybwo.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZW9xZHdocm54a2dqcnF5YndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEyODY3MywiZXhwIjoyMDkzNzA0NjczfQ.qFnIR_dWoWQqNkVNISbbYJ4AqBEk-aXnqorwthh4hBI';
const supabase = createClient(url, key);

async function publish() {
  const { data, error } = await supabase.from('portal_posts').select('id').eq('status', 'review').limit(1);
  if (error) {
    console.error(error);
    return;
  }
  if (data && data.length > 0) {
    const { error: error2 } = await supabase.from('portal_posts').update({ status: 'published' }).eq('id', data[0].id);
    if (error2) console.error(error2);
    else console.log('Post published: ' + data[0].id);
  } else {
    console.log('No posts in review.');
  }
}
publish();
