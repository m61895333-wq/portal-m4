import time
import requests
import json
import datetime
from supabase import create_client, Client

# Configurações de Conexão
url = 'https://iueoqdwhrnxkgjrqybwo.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZW9xZHdocm54a2dqcnF5YndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEyODY3MywiZXhwIjoyMDkzNzA0NjczfQ.qFnIR_dWoWQqNkVNISbbYJ4AqBEk-aXnqorwthh4hBI'
supabase: Client = create_client(url, key)

def generate_with_ollama(prompt):
    print('--- [FOCO TOTAL] Gerando com Ollama (8GB Power) ---')
    try:
        response = requests.post('http://localhost:11434/api/generate', 
            json={
                'model': 'llama3:8b-instruct-q4_0',
                'prompt': prompt,
                'stream': False,
                'options': {
                    'temperature': 0.5,
                    'num_ctx': 16384, # Aumentando o contexto para 16k conforme imagem
                    'num_predict': 4000,
                    'top_p': 0.9
                }
            }, timeout=1200)
        return response.json().get('response', '')
    except Exception as e:
        print(f'Erro no Ollama: {e}')
        return None

def check_image_exists(url):
    res = supabase.table('portal_posts').select('id').eq('image_url', url).execute()
    return len(res.data) > 0

def process_queue():
    # Pega apenas UM artigo por vez para garantir FOCO TOTAL
    res = supabase.table('portal_posts').select('*').eq('status', 'queued').order('priority').limit(1).execute()
    posts = res.data

    if not posts:
        return

    post = posts[0]
    post_id = post['id']
    topic = post['title']
    
    print(f'--- INICIANDO PRODUÇÃO ARTESANAL: {topic} ---')
    supabase.table('portal_posts').update({'status': 'generating'}).eq('id', post_id).execute()
    
    # 1, 2 e 3. Algoritmo de Produção de Elite
    prompt = f"""
    Aja como Editor-Chefe Sênior do Portal M4. Produza um artigo de autoridade máxima.
    TEMA: {topic}
    
    ALGORITMO DE PRODUÇÃO:
    1. LINGUAGEM: Português Brasil (impecável).
    2. TOM: 3ª Pessoa Institucional (Portal M4).
    3. PROFUNDIDADE: Mínimo de 1200 palavras.
    4. ESTRUTURA: Lead impactante, subtítulos H2 técnicos, e seção 'Visão M4'.
    5. VALIDAÇÃO: Cite fontes reais (Bloomberg, Forbes, Relatórios Governamentais).
    6. FINALIZAÇÃO: No final do texto, inclua EXATAMENTE 10 Hashtags e 10 Palavras-Chave relevantes.
    7. REVISÃO: Realize uma revisão ortográfica e gramatical rigorosa.
    8. LIMPEZA: Proibido Emojis, caracteres especiais decorativos ou vícios de IA.
    
    Escreva o artigo completo agora.
    """
    
    content = generate_with_ollama(prompt)
    
    if content and len(content) > 1000:
        # 4 e 5. Curadoria Visual Única
        searchTerm = topic.split(' ')[0].lower()
        image_url = f"https://source.unsplash.com/1400x800/?{searchTerm},professional&sig={post_id[:8]}"
        
        # Verificar se ja existe (se sim, mudar o sig)
        if check_image_exists(image_url):
            image_url += "-unique"

        # 2.2 Definir agendamento (+1 hora)
        finish_time = datetime.datetime.now()
        publish_time = finish_time + datetime.timedelta(hours=1)
        
        # Limpeza final de Markdown
        content = content.replace('***', '').replace('**', '')

        # 6. Publicação / Agendamento
        supabase.table('portal_posts').update({
          'content': content,
          'excerpt': content[:300].strip().split('\n')[0] + '...',
          'image_url': image_url,
          'status': 'published', # Marcus quer mandar para fila de publicacao (Publicado)
          'published_at': publish_time.isoformat(),
          'reviewer_notes': '✅ PRODUÇÃO ARTESANAL FINALIZADA. Protocolo 8GB de Foco Total.',
          'updated_at': finish_time.isoformat()
        }).eq('id', post_id).execute()
        
        print(f'--- FINALIZADO COM SUCESSO: {topic} ---')
    else:
        print(f'Falha na qualidade do artigo {post_id}.')
        supabase.table('portal_posts').update({'status': 'review', 'reviewer_notes': '⚠️ Baixa qualidade na geração artesanal.'}).eq('id', post_id).execute()

if __name__ == '__main__':
    print('M4 Worker 8GB: MODO ARTESÃO (FOCO TOTAL) ATIVADO!')
    while True:
        try:
            process_queue()
        except Exception as e:
            print(f'Erro no loop: {e}')
        time.sleep(20) # Intervalo para respirar entre artigos
