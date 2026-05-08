import time
import requests
import json
import random
from datetime import datetime, timedelta, timezone
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
    # Força horário de Brasília (UTC-3)
    br_tz = timezone(timedelta(hours=-3))
    now = datetime.now(br_tz)
    
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

def get_recent_titles(limit=30):
    """Busca os títulos mais recentes para evitar repetição."""
    try:
        res = supabase.table('portal_posts').select('title').order('created_at', desc=True).limit(limit).execute()
        return [row['title'] for row in (res.data or [])]
    except:
        return []

def title_already_exists(title, recent_titles):
    """Verifica se o título (ou algo muito parecido) já existe."""
    title_lower = title.lower().strip()
    for existing in recent_titles:
        existing_lower = existing.lower().strip()
        # Compara os primeiros 30 caracteres para detectar duplicatas óbvias
        if title_lower[:30] == existing_lower[:30]:
            return True
        # Detecta sobreposição alta de palavras
        words_new = set(title_lower.split())
        words_old = set(existing_lower.split())
        if len(words_new) > 3 and words_new & words_old:
            overlap = len(words_new & words_old) / len(words_new | words_old)
            if overlap > 0.65:
                return True
    return False

def generate_auto_topic(recent_titles):
    tags = ["Mercado Financeiro", "Inteligência Artificial", "Investimentos", "Tecnologia", "Empreendedorismo", "Carreira", "Economia Digital", "Criptoativos", "Startups"]
    try:
        tags_res = supabase.table('portal_settings').select('*').eq('key', 'topic_tags').execute()
        if tags_res.data:
            tags = json.loads(tags_res.data[0]['value'])
    except:
        pass
    
    base_tag = random.choice(tags)
    
    # Passa os últimos 10 títulos para a IA evitar repetição
    forbidden = "\n".join(f"- {t}" for t in recent_titles[:10]) if recent_titles else "Nenhum ainda."
    
    prompt = f"""Você é o Editor-Chefe do Portal M4, especialista em finanças, tecnologia e mercado.
Crie UM ÚNICO título de artigo jornalístico ORIGINAL e EXCLUSIVO sobre o tema: {base_tag}.

REGRA ABSOLUTA: O título DEVE SER COMPLETAMENTE DIFERENTE dos títulos abaixo (que já foram publicados):
{forbidden}

CRITÉRIOS:
- Título jornalístico de alto impacto (estilo Bloomberg/Forbes)
- Específico e com dados/contexto (ex: "Selic a 14,75%: o que muda para fundos e CDBs em 2026")
- Máximo 120 caracteres
- Em português do Brasil
- SEM aspas na resposta

Responda APENAS o título, sem explicações."""
    
    new_title = generate_content(prompt) or f"Análise Exclusiva: O Futuro de {base_tag} em 2026"
    # Remove aspas que a IA possa inserir
    return new_title.strip().strip('"').strip("'")

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
                    # CARREGA TÍTULOS RECENTES PARA CURADORIA
                    recent_titles = get_recent_titles(30)
                    
                    # Tenta gerar um título único (até 3 tentativas)
                    new_topic = None
                    for attempt in range(3):
                        candidate = generate_auto_topic(recent_titles)
                        if not title_already_exists(candidate, recent_titles):
                            new_topic = candidate
                            break
                        print(f">>> CURADORIA: Título duplicado na tentativa {attempt+1}, regerando...")
                    
                    if not new_topic:
                        print(">>> CURADORIA: Impossível gerar título único após 3 tentativas. Pulando ciclo.")
                        return
                    
                    print(f'>>> CRONOGRAMA ATIVO: Gerando pauta ({count+1}/{config["dailyCount"]}): {new_topic}')
                    slug = f"auto-{int(time.time())}-{new_topic.lower()[:50].replace(' ', '-')}"
                    
                    ins = supabase.table('portal_posts').insert({
                        'title': new_topic,
                        'slug': slug,
                        'status': 'generating',
                        'content': 'Gerando via Cronograma Autonomo...',
                        'excerpt': 'Aguardando IA...',
                        'category': 'GERAL',
                        'is_active': True
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
        
        # ESTILOS DE ABERTURA ROTATIVOS - sorteio garante variedade entre artigos
        OPENING_STYLES = [
            {
                "nome": "DADO_CHOCANTE",
                "instrucao": "Comece com um dado ou estatística surpreendente e específica que desafie o senso comum do leitor sobre o tema. Ex: 'Em 2025, 73% dos gestores de fundos...'"
            },
            {
                "nome": "PERGUNTA_RETORICA",
                "instrucao": "Abra com uma pergunta retórica direta e provocativa que force o leitor a refletir imediatamente. A pergunta deve gerar tensão ou curiosidade. Ex: 'O que acontece quando a maior economia do mundo...'"
            },
            {
                "nome": "CENA_VIVIDA",
                "instrucao": "Construa uma cena concreta e cinematográfica (2-3 frases) que situe o leitor em um momento específico relacionado ao tema. Sem metáforas clichês. Ex: 'Era terça-feira quando os terminais da Nasdaq registraram...'"
            },
            {
                "nome": "PARADOXO_INSTIGANTE",
                "instrucao": "Comece com um paradoxo ou contradição aparente sobre o tema que só fará sentido ao longo do texto. Ex: 'Quanto mais dinheiro circula neste mercado, menor é a chance de enriquecimento individual.'"
            },
            {
                "nome": "DECLARACAO_OUSADA",
                "instrucao": "Abra com uma declaração direta, ousada e controversa sobre o tema, como um editorial de alto nível. Sem rodeios. Ex: 'A era dos juros fáceis acabou e nenhum investidor brasileiro está preparado para isso.'"
            },
            {
                "nome": "CONTEXTO_HISTORICO",
                "instrucao": "Situe o leitor com um marco histórico específico e relevante que cria contraste com o presente. Ex: 'Quando o Plano Real completou 30 anos, o Brasil ainda carregava...'"
            },
            {
                "nome": "CITACAO_AUTORIDADE",
                "instrucao": "Comece com uma citação real ou atribuída a uma autoridade do setor (economista, CEO, Banco Central) que sintetize o conflito central do artigo. Use aspas e nome da fonte."
            },
            {
                "nome": "CONTRASTE_DRAMATICO",
                "instrucao": "Abra contrastando dois cenários opostos em frases curtas e impactantes. Ex: 'De um lado, recordes na bolsa. Do outro, inadimplência no maior nível em uma década.'"
            },
            {
                "nome": "NUMERO_IMPACTANTE",
                "instrucao": "Comece com um número específico e impactante (em moeda, percentual ou volume) seguido de seu contexto imediato. Ex: 'R$ 2,4 trilhões — esse é o tamanho do buraco fiscal que o Brasil precisará fechar...'"
            },
            {
                "nome": "VIRADA_NARRATIVA",
                "instrucao": "Inicie apresentando o que 'todo mundo acredita' sobre o tema e logo quebre essa expectativa com a realidade. Ex: 'A crença popular diz que investir em imóveis é sempre seguro. Os dados de 2025 contam uma história diferente.'"
            }
        ]
        
        style = random.choice(OPENING_STYLES)
        print(f">>> ESTILO DE ABERTURA: {style['nome']}")
        
        prompt = f"""Você é o Editor-Chefe Sênior do Portal M4, referência em jornalismo financeiro e tecnológico no Brasil.

TEMA DO ARTIGO: {topic}

== REGRA DE ABERTURA (OBRIGATÓRIA) ==
Estilo sorteado: {style['nome']}
Instrução de abertura: {style['instrucao']}
O primeiro parágrafo DEVE seguir este estilo. Proibido começar com "Nos últimos anos", "Em um cenário", "No contexto atual", "Com o avanço" ou qualquer frase genérica.

== ESTRUTURA DO ARTIGO ==
1. LEAD (estilo acima, 3-4 linhas impactantes)
2. ## [Subtítulo H2 - Análise do Cenário]
3. ## [Subtítulo H2 - Dados e Fontes] (cite Bloomberg, Reuters, IBGE, Banco Central, Gartner)
4. ## [Subtítulo H2 - Impacto Prático] (o que o leitor deve fazer/pensar)
5. ## Visão M4 (projeção estratégica exclusiva do Portal M4)

== REGRAS ABSOLUTAS ==
- Texto puro, SEM asteriscos, SEM markdown bold (**palavra**)
- Tom humano, fluente e inteligente — não robótico
- Mínimo 800 palavras
- 3ª pessoa (proibido "eu", "nós", "você")
- No final: espaço duplo, então 10 hashtags relevantes, depois 10 palavras-chave separadas por vírgula

Escreva agora em português do Brasil:"""

        content = generate_content(prompt)
        
        if content:
            # Novo motor de imagens: Pollinations.ai (Conceitual sem pessoas)
            import urllib.parse
            clean_topic = ''.join(c for c in topic if c.isalnum() or c.isspace())
            prompt_img = f"Abstract conceptual 3d render about {clean_topic}, corporate business style, dark premium background, neon lights, no faces, no people, highly detailed, 8k"
            encoded_prompt = urllib.parse.quote(prompt_img)
            image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1400&height=800&nologo=true&seed={int(time.time())}"

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
