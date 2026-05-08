const { createClient } = require('@supabase/supabase-js');
const url = 'https://iueoqdwhrnxkgjrqybwo.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZW9xZHdocm54a2dqcnF5YndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEyODY3MywiZXhwIjoyMDkzNzA0NjczfQ.qFnIR_dWoWQqNkVNISbbYJ4AqBEk-aXnqorwthh4hBI';
const supabase = createClient(url, key);

async function initPageViewsTable() {
  console.log('Verificando/Criando tabela de Page Views...');
  // Nota: Via JS nao podemos criar tabelas, mas podemos testar se ela existe
  // Se nao existir, Marcus precisaria rodar o SQL no Dashboard.
  // Vou tentar inserir um registro de teste.
  const { error } = await supabase.from('portal_page_views').insert({ path: '/init-test' });
  
  if (error) {
    console.log('AVISO: A tabela portal_page_views pode nao existir ainda.');
    console.log('Erro:', error.message);
  } else {
    console.log('Tabela portal_page_views confirmada e ativa!');
  }
}
initPageViewsTable();
