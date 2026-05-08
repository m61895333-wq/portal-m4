import time
import requests
import json
from supabase import create_client

# CONFIGURACOES M4
SUPABASE_URL = "https://iueoqdwhrnxkgjrqybwo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZW9xZHdocm54a2dqcnF5YndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEyODY3MywiZXhwIjoyMDkzNzA0NjczfQ.qFnIR_dWoWQqNkVNISbbYJ4AqBEk-aXnqorwthh4hBI"
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3:8b-instruct-q4_0"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_content(prompt):
    try:
        response = requests.post(OLLAMA_URL, 
            json={
                'model': MODEL,
                'prompt': prompt,
                'stream': False,
                'options': {
                    'temperature': 0.7,
                    'num_predict': 4000,
                    'top_p': 0.9,
                    'num_ctx': 16384
                }
            }, timeout=1200)
        return response.json().get('response', '')
    except Exception as e:
        print(f'Erro no Ollama: {e}')
        return None

def process_queue():
    # MODO ARTESAO: Pega apenas 1 por vez para foco total
    res = supabase.table('portal_posts').select('*').eq('status', 'queued').limit(1).execute()
    posts = res.data

    if not posts:
        print('Fila vazia. Aguardando pautas...')
        return

    for post in posts:
        post_id = post['id']
        topic = post['title']
        print(f'>>> MODO ARTESAO INICIADO: {topic}')
        
        supabase.table('portal_posts').update({'status': 'generating'}).eq('id', post_id).execute()
        
        # PROMPT DE ELITE M4 (SEM ASTERISCOS)
        prompt = f"""
        Aja como Editor-Chefe Sênior do Portal M4. Sua missão é produzir um artigo de elite.
        TEMA: {topic}
        
        REGRAS SOBERANAS:
        1. Texto com mais de 1200 palavras, profundo e institucional.
        2. Idioma: Português Brasil (PT-BR).
        3. Formatação: Use apenas texto puro. PROIBIDO usar asteriscos (**), negritos ou qualquer marcação Markdown.
        4. No final, inclua sempre exatamente 10 hashtags e 10 palavras-chave relevantes.
        5. O tom deve ser de autoridade máxima em finanças e tecnologia.
        
        ESTRUTURA:
        - Título de impacto (sem aspas ou asteriscos)
        - Introdução profunda
        - Pelo menos 5 subtítulos de desenvolvimento
        - Conclusão estratégica
        - Bloco de Hashtags e Keywords
        
        IMPORTANTE: Não use nenhuma marcação de formatação além de quebras de linha.
        """
        
        content = generate_content(prompt)
        
        if content:
            # Gerar Resumo curto
            summary_prompt = f"Crie um resumo de 2 frases para este texto (Texto puro): {content[:1000]}"
            excerpt = generate_content(summary_prompt) or "Analise profunda sobre o tema."
            
            # Gerar Categoria
            cat_prompt = f"Qual categoria melhor define este tema: '{topic}'? Escolha apenas uma das seguintes: MERCADO FINANCEIRO, INVESTIMENTOS, INTELIGENCIA ARTIFICIAL, TECNOLOGIA, CARREIRA, EDUCAO FINANCEIRA, EMPREENDEDORISMO. Responda apenas o nome da categoria."
            category = generate_content(cat_prompt) or "TECNOLOGIA"
            category = category.upper().strip()

            # Gerar Data de Publicacao (1 hora apos finalizar)
            scheduled_at = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() + 3600))

            supabase.table('portal_posts').update({
                'content': content,
                'excerpt': excerpt,
                'category': category,
                'status': 'review',
                'scheduled_at': scheduled_at,
                'published_at': None
            }).eq('id', post_id).execute()
            
            print(f'>>> ARTIGO FINALIZADO COM SUCESSO: {topic}')
        else:
            supabase.table('portal_posts').update({'status': 'queued'}).eq('id', post_id).execute()
            print(f'!!! FALHA NA GERACAO: {topic}')

if __name__ == "__main__":
    print("M4 ARTISAN WORKER v3.1 - ATIVO")
    while True:
        try:
            process_queue()
        except Exception as e:
            print(f"Erro no loop principal: {e}")
        time.sleep(30)
