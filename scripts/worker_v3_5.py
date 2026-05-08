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
    res = supabase.table('portal_posts').select('*').eq('status', 'queued').limit(1).execute()
    posts = res.data

    if not posts:
        return

    for post in posts:
        post_id = post['id']
        topic = post['title']
        print(f'>>> INICIANDO DIRETORIA DE ARTE E REDACAO: {topic}')
        
        supabase.table('portal_posts').update({'status': 'generating'}).eq('id', post_id).execute()
        
        # 1. GERACAO DO CONTEUDO
        prompt = f"""
        Aja como Editor-Chefe Sênior do Portal M4. 
        TEMA: {topic}
        REGRAS: Texto puro, sem asteriscos (**), profundo (1200+ palavras), tom de autoridade.
        Inclua 10 hashtags e 10 keywords no fim.
        """
        content = generate_content(prompt)
        
        if content:
            # 2. INTELIGENCIA VISUAL: Gerar Keywords para Busca de Imagem Premium
            image_prompt = f"Com base neste tema '{topic}', gere 3 palavras-chave em inglês, separadas por vírgula, para buscar uma imagem profissional e luxuosa no Unsplash. Ex: 'business,office,minimalist'. Responda APENAS as palavras."
            visual_keywords = generate_content(image_prompt) or "business,technology,minimal"
            visual_keywords = visual_keywords.lower().strip().replace(" ", "")

            # 3. GERACAO DE METADADOS
            excerpt_prompt = f"Resuma em 2 frases (texto puro): {content[:1000]}"
            excerpt = generate_content(excerpt_prompt) or "Analise profunda."
            
            cat_prompt = f"Escolha uma: MERCADO FINANCEIRO, INVESTIMENTOS, INTELIGENCIA ARTIFICIAL, TECNOLOGIA, CARREIRA, EMPREENDEDORISMO. Responda apenas o nome."
            category = generate_content(cat_prompt) or "TECNOLOGIA"
            category = category.upper().strip()

            # URL DINAMICA BASEADA NA INTELIGENCIA DA IA
            # Usamos o LoremFlickr como Proxy estavel para o Unsplash Search
            image_url = f"https://loremflickr.com/1400/800/{visual_keywords}/all?lock={int(time.time())}"

            scheduled_at = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() + 3600))

            supabase.table('portal_posts').update({
                'content': content,
                'excerpt': excerpt,
                'category': category,
                'image_url': image_url,
                'status': 'review',
                'scheduled_at': scheduled_at,
                'reviewer_notes': f"Imagem escolhida via IA: Keywords[{visual_keywords}]"
            }).eq('id', post_id).execute()
            
            print(f'>>> ARTIGO E IMAGEM FINALIZADOS: {topic}')
        else:
            supabase.table('portal_posts').update({'status': 'queued'}).eq('id', post_id).execute()

if __name__ == "__main__":
    print("M4 ARTISAN WORKER v3.5 (IA VISUAL) - ATIVO")
    while True:
        try:
            process_queue()
        except Exception as e:
            print(f"Erro: {e}")
        time.sleep(30)
