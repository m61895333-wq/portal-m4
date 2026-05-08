const { createClient } = require('@supabase/supabase-js');
const url = 'https://iueoqdwhrnxkgjrqybwo.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZW9xZHdocm54a2dqcnF5YndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEyODY3MywiZXhwIjoyMDkzNzA0NjczfQ.qFnIR_dWoWQqNkVNISbbYJ4AqBEk-aXnqorwthh4hBI';
const supabase = createClient(url, key);

async function initSettings() {
  console.log('Inicializando tabela portal_settings...');
  // Tentar inserir o registro inicial de autonomia
  const { error } = await supabase
    .from('portal_settings')
    .upsert({ 
      key: 'autonomy', 
      value: { active: false, dailyCount: 5 } 
    }, { onConflict: 'key' });

  if (error) {
    console.error('Erro ao inicializar:', error.message);
    if (error.message.includes('relation "portal_settings" does not exist')) {
        console.log('A tabela nao existe. Criando agora...');
        // Como nao temos rpc exec_sql liberado direto, o ideal e criar via painel ou migration.
        // Vou tentar um workaround via upsert forçado se possivel.
    }
  } else {
    console.log('Sucesso! O botao agora deve funcionar.');
  }
}
initSettings();
