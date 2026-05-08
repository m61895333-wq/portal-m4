import time
import requests
import json
import random
from datetime import datetime, timedelta
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

def get_autonomy_config():
    res = supabase.table('portal_settings').select('*').eq('key', 'autonomy_status').single().execute()
    if res.data:
        return json.loads(res.data['value'])
    return {"active": False, "dailyCount": 5}

def get_today_count():
    today = datetime.utcnow().strftime('%Y-%m-%d')
    res = supabase.table('portal_posts').select('id', count='exact').gte('created_at', today).execute()
    return res.count or 0

def generate_auto_topic():
    # Busca tags estrategicas para se inspirar
    tags_res = supabase.table('portal_settings').select('*').eq('key', 'topic_tags').single().execute()
    tags = []
    if tags_res.data:
        tags = json.loads(tags_res.data['value'])
    
    base_tag = random.choice(tags) if tags else "Mercado Financeiro e IA"
    
    prompt = f"Como Editor-Chefe do Portal M4, crie um título de artigo de alto impacto sobre {base_tag}. O título deve ser profissional, instigante e focado em elite financeira/tecnológica. Responda apenas o título."
    return generate_content(prompt) or f"Tendências Globais: O Futuro de {base_tag}"

def process_queue():
    # 1. Tenta pegar algo da fila manual/batch
    res = supabase.table('portal_posts').select('*').eq('status', 'queued').limit(1).execute()
    posts = res.data

    # 2. Se a fila estiver vazia, verifica Autonomia Proativa
    if not posts:
        config = get_autonomy_config()
        if config.get('active'):
            count = get_today_count()
            if count < config.get('dailyCount', 5):
                print(f'>>> AUTONOMIA ATIVA: Gerando pauta automática ({count+1}/{config["dailyCount"]})')
                new_topic = generate_auto_topic()
                slug = f"auto-{int(time.time())}-{new_topic.lower().replace(' ', '-')[:50]}"
                
                # Cria o post ja em status 'generating' para o proprio worker assumir
                ins = supabase.table('portal_posts').insert({
                    'title': new_topic,
                    'slug': slug,
                    'status': 'generating',
                    'content': 'Gerando via Autonomia Total...',
                    'category': 'GERAL'
                }).execute()
                if ins.data:
                    posts = ins.data
            else:
                print('>>> Meta diária batida. Aguardando próximo ciclo.')
                return
        else:
            print('>>> Fila vazia e Autonomia Desativada.')
            return

    for post in posts:
        post_id = post['id']
        topic = post['title']
        print(f'>>> PRODUCAO INICIADA (v3.6): {topic}')
        
        supabase.table('portal_posts').update({'status': 'generating'}).eq('id', post_id).execute()
        
        # PROMPT DE ELITE COM PROTOCOLO SEO M4
        prompt = f"""
        Aja como Editor-Chefe Sênior do Portal M4. 
        TEMA: {topic}
        
        ESTRUTURA OBRIGATÓRIA:
        1. Título de impacto.
        2. Introdução Profunda.
        3. Desenvolvimento em 5 a 7 subtítulos institucionais.
        4. Conclusão Estratégica.
        5. Lista de Fontes de Pesquisa.
        
        REGRAS DE SEO (IMPORTANTE):
        Após as fontes, pule DUAS LINHAS.
        Em seguida, escreva EXATAMENTE 10 Hashtags relevantes começando com #.
        Abaixo das hashtags, escreva EXATAMENTE 10 Palavras-Chave separadas por vírgula.
        
        RESTRIÇÕES: Texto puro, SEM asteriscos (**), SEM Markdown. Mínimo 1200 palavras.
        """
        
        content = generate_content(prompt)
        
        if content:
            # Inteligencia Visual v3.5 integrada
            image_prompt = f"3 keywords em inglês para imagem deste tema '{topic}':"
            visual_keywords = generate_content(image_prompt) or "business,technology"
            image_url = f"https://loremflickr.com/1400/800/{visual_keywords.strip().replace(' ', '')}/all?lock={post_id[:5]}"

            # Gerar Metadados
            cat_prompt = f"Qual categoria: MERCADO FINANCEIRO, INVESTIMENTOS, INTELIGENCIA ARTIFICIAL, TECNOLOGIA, CARREIRA, EMPREENDEDORISMO? Responda uma."
            category = generate_content(cat_prompt) or "TECNOLOGIA"
            
            scheduled_at = (datetime.utcnow() + timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%SZ')

            supabase.table('portal_posts').update({
                'content': content,
                'category': category.upper().strip(),
                'image_url': image_url,
                'status': 'review',
                'scheduled_at': scheduled_at,
                'reviewer_notes': f"SEO M4 Ativo | Autonomia v3.6 | Keywords Visual: {visual_keywords}"
            }).eq('id', post_id).execute()
            
            print(f'>>> ARTIGO FINALIZADO COM SUCESSO: {topic}')
        else:
            supabase.table('portal_posts').update({'status': 'queued'}).eq('id', post_id).execute()

if __name__ == "__main__":
    print("M4 SOVEREIGN WORKER v3.6 - AUTONOMIA TOTAL & SEO BLINDADO")
    while True:
        try:
            process_queue()
        except Exception as e:
            print(f"Erro no loop: {e}")
        time.sleep(30)
