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
    try:
        res = supabase.table('portal_settings').select('*').eq('key', 'autonomy').execute()
        if res.data:
            return res.data[0]['value']
    except:
        pass
    return {"active": False, "dailyCount": 5, "startTime": "08:00", "activeDays": ["seg", "ter", "qua", "qui", "sex"]}

def is_in_working_window(config):
    now = datetime.now() # Usa hora local do servidor (VPS)
    
    # 1. Verifica Dia da Semana
    days_map = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"]
    current_day = days_map[int(now.strftime('%w'))]
    active_days = config.get('activeDays', [])
    
    if current_day not in active_days:
        print(f">>> FORA DO CALENDARIO: Hoje ({current_day}) nao e dia de operacao.")
        return False
        
    # 2. Verifica Horario de Inicio
    start_time_str = config.get('startTime', '08:00')
    current_time_str = now.strftime('%H:%M')
    
    if current_time_str < start_time_str:
        print(f">>> AGUARDANDO HORARIO: Agora ({current_time_str}) | Inicio ({start_time_str})")
        return False
        
    return True

def get_today_count():
    try:
        today = datetime.utcnow().strftime('%Y-%m-%d')
        res = supabase.table('portal_posts').select('id', count='exact').gte('created_at', today).execute()
        return res.count or 0
    except:
        return 0

def generate_auto_topic():
    tags = ["Mercado Financeiro", "Inteligência Artificial", "Investimentos", "Tecnologia", "Empreendedorismo"]
    try:
        tags_res = supabase.table('portal_settings').select('*').eq('key', 'topic_tags').execute()
        if tags_res.data:
            tags = json.loads(tags_res.data[0]['value'])
    except:
        pass
    
    base_tag = random.choice(tags)
    prompt = f"Como Editor-Chefe do Portal M4, crie um título de artigo de alto impacto sobre {base_tag}. Responda apenas o título."
    return generate_content(prompt) or f"Tendências Globais: O Futuro de {base_tag}"

def process_queue():
    # 1. Prioridade total para a fila manual
    res = supabase.table('portal_posts').select('*').eq('status', 'queued').limit(1).execute()
    posts = res.data

    # 2. Se a fila manual estiver vazia, verifica Cronograma de Autonomia
    if not posts:
        config = get_autonomy_config()
        if config.get('active'):
            # VERIFICA JANELA TEMPORAL (HORA E DIA)
            if is_in_working_window(config):
                count = get_today_count()
                if count < config.get('dailyCount', 5):
                    print(f'>>> CRONOGRAMA ATIVO: Gerando pauta ({count+1}/{config["dailyCount"]})')
                    new_topic = generate_auto_topic()
                    slug = f"auto-{int(time.time())}-{new_topic.lower().replace(' ', '-')[:50]}"
                    
                    ins = supabase.table('portal_posts').insert({
                        'title': new_topic,
                        'slug': slug,
                        'status': 'generating',
                        'content': 'Gerando via Cronograma Autonomo...',
                        'category': 'GERAL'
                    }).execute()
                    if ins.data:
                        posts = ins.data
                else:
                    print('>>> Meta diaria batida.')
                    return
            else:
                return
        else:
            return

    for post in posts:
        post_id = post['id']
        topic = post['title']
        print(f'>>> PRODUCAO INICIADA (v3.7): {topic}')
        
        supabase.table('portal_posts').update({'status': 'generating'}).eq('id', post_id).execute()
        
        prompt = f"""
        Aja como Editor-Chefe Sênior do Portal M4. TEMA: {topic}
        REGRAS: Texto puro, sem asteriscos, profundo, 10 hashtags e 10 keywords ao fim (espaço duplo).
        """
        
        content = generate_content(prompt)
        
        if content:
            image_prompt = f"3 keywords em inglês para imagem deste tema '{topic}':"
            visual_keywords = generate_content(image_prompt) or "business,technology"
            image_url = f"https://loremflickr.com/1400/800/{visual_keywords.strip().replace(' ', '')}/all?lock={int(time.time())}"

            cat_prompt = f"Qual categoria: MERCADO FINANCEIRO, INVESTIMENTOS, INTELIGENCIA ARTIFICIAL, TECNOLOGIA, CARREIRA, EMPREENDEDORISMO? Responda uma."
            category = generate_content(cat_prompt) or "TECNOLOGIA"
            
            scheduled_at = (datetime.utcnow() + timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%SZ')

            supabase.table('portal_posts').update({
                'content': content,
                'category': category.upper().strip(),
                'image_url': image_url,
                'status': 'review',
                'scheduled_at': scheduled_at
            }).eq('id', post_id).execute()
            
            print(f'>>> FINALIZADO: {topic}')
        else:
            supabase.table('portal_posts').update({'status': 'queued'}).eq('id', post_id).execute()

if __name__ == "__main__":
    print("M4 CHRONOS WORKER v3.7 - AGENDAMENTO ATIVO")
    while True:
        try:
            process_queue()
        except Exception as e:
            print(f"Erro: {e}")
        time.sleep(30)
