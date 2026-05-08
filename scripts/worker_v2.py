import time
import requests
import json
from supabase import create_client, Client

url = 'https://iueoqdwhrnxkgjrqybwo.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZW9xZHdocm54a2dqcnF5YndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEyODY3MywiZXhwIjoyMDkzNzA0NjczfQ.qFnIR_dWoWQqNkVNISbbYJ4AqBEk-aXnqorwthh4hBI'
supabase: Client = create_client(url, key)

def generate_with_ollama(prompt):
    print('--- Gerando com Ollama (Poder Total 8GB) ---')
    try:
        response = requests.post('http://localhost:11434/api/generate', 
            json={
                'model': 'llama3:8b-instruct-q4_0',
                'prompt': prompt,
                'stream': False,
                'options': {
                    'temperature': 0.6,
                    'num_predict': 3000,
                    'top_p': 0.9
                }
            }, timeout=900)
        return response.json().get('response', '')
    except Exception as e:
        print(f'Erro no Ollama: {e}')
        return None

def process_queue():
    res = supabase.table('portal_posts').select('*').eq('status', 'queued').execute()
    posts = res.data

    if not posts:
        return

    for post in posts:
        post_id = post['id']
        topic = post['title']
        print(f'Processando Artigo: {topic} (ID: {post_id})')
        
        supabase.table('portal_posts').update({'status': 'generating'}).eq('id', post_id).execute()
        
        prompt = f"""
        Aja como Editor-Chefe Sênior do Portal M4. Produza um artigo de elite pronto para publicação.
        TEMA: {topic}
        
        REGRAS ZERO-REVIEW (OBRIGATÓRIAS):
        1. 3ª PESSOA INSTITUCIONAL: Use 'O Portal M4 analisa', 'Observa-se'. Proibido 'Eu' ou 'Nós'.
        2. PROFUNDIDADE: Mínimo de 1200 palavras.
        3. FONTES: Cite dados e fontes reais de mercado (Bloomberg, Forbes, etc).
        4. ESTRUTURA: Markdown com subtítulos H2, Lead impactante e Visão M4 ao final.
        5. ZERO EMOJIS e ZERO CARACTERES ESPECIAIS decorativos.
        
        Escreva o artigo completo agora em Português do Brasil.
        """
        
        content = generate_with_ollama(prompt)
        
        if content and len(content) > 1000:
            # Seleção de Imagem Exclusiva
            contextKeywords = ["professional", "technology", "business", "minimalist", "luxury"]
            import random
            randomContext = random.choice(contextKeywords)
            searchTerm = topic.split(' ')[0].lower()
            finalImageUrl = f"https://source.unsplash.com/1400x800/?{searchTerm},{randomContext}&sig={post_id[:8]}"

            # Limpeza final
            content = content.replace('***', '').replace('**', '').replace('__', '')
            excerpt = content[:250].strip().split('\n')[0] + '...'
            
            # PROTOCOLO ZERO-REVIEW: Publicacao Direta
            supabase.table('portal_posts').update({
                'content': content,
                'excerpt': excerpt,
                'image_url': finalImageUrl,
                'status': 'published',
                'published_at': 'now()',
                'reviewer_notes': '✅ PUBLICADO AUTOMATICAMENTE: Protocolo Zero-Review 8GB validado.',
                'updated_at': 'now()'
            }).eq('id', post_id).execute()
            print(f'Sucesso: Artigo {post_id} PUBLICADO DIRETAMENTE.')
        else:
            print(f'Erro ou texto curto para {post_id}')
            supabase.table('portal_posts').update({'status': 'review', 'reviewer_notes': '⚠️ Falha na geracao automática.'}).eq('id', post_id).execute()

if __name__ == '__main__':
    print('M4 Worker 8GB: MODO AUTONOMIA TOTAL ATIVADO!')
    while True:
        try:
            process_queue()
        except Exception as e:
            print(f'Erro no loop: {e}')
        time.sleep(15)
