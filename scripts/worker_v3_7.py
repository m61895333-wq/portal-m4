import time
import requests
import json
import random
import os
import re
import hashlib
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
try:
    from zoneinfo import ZoneInfo
except Exception:
    ZoneInfo = None
from supabase import create_client

# CONFIGURAÇÕES M4
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
# Modelo Q4_0 cabe melhor na VPS 8GB e evita reinicios por OOM.
FAST_MODEL = os.environ.get("OLLAMA_FAST_MODEL") or os.environ.get("OLLAMA_MODEL", "llama3:8b-instruct-q4_0")
WRITER_MODEL = os.environ.get("OLLAMA_WRITER_MODEL", FAST_MODEL)
REVISER_MODEL = os.environ.get("OLLAMA_REVISER_MODEL", FAST_MODEL)
FALLBACK_MODEL = os.environ.get("OLLAMA_FALLBACK_MODEL", FAST_MODEL)
GEMINI_API_KEY = (os.environ.get("GEMINI_API_KEY") or "").strip()
GEMINI_ENABLED = os.environ.get("GEMINI_ENABLED", "true").lower() in {"1", "true", "yes", "sim"} and bool(GEMINI_API_KEY)
GEMINI_RESEARCH_MODEL = os.environ.get("GEMINI_RESEARCH_MODEL", "gemini-2.5-flash")
GEMINI_WRITER_MODEL = os.environ.get("GEMINI_WRITER_MODEL", "gemini-3.1-flash-lite")
GEMINI_FALLBACK_MODEL = os.environ.get("GEMINI_FALLBACK_MODEL", "gemini-2.5-flash-lite")
GEMINI_DAILY_CALL_LIMIT = int(os.environ.get("GEMINI_DAILY_CALL_LIMIT", "3"))
GEMINI_USAGE_PATH = os.environ.get("GEMINI_USAGE_PATH", "/opt/m4-worker/gemini_usage.json")
GEMINI_API_BASE = os.environ.get("GEMINI_API_BASE", "https://generativelanguage.googleapis.com/v1beta")
OPENAI_API_KEY = (os.environ.get("OPENAI_API_KEY") or "").strip()
OPENAI_ENABLED = os.environ.get("OPENAI_ENABLED", "false").lower() in {"1", "true", "yes", "sim"} and bool(OPENAI_API_KEY)
OPENAI_TEXT_MODEL = os.environ.get("OPENAI_TEXT_MODEL", "gpt-5.4-mini")
OPENAI_RESEARCH_MODEL = os.environ.get("OPENAI_RESEARCH_MODEL", OPENAI_TEXT_MODEL)
OPENAI_AUDIT_MODEL = os.environ.get("OPENAI_AUDIT_MODEL", OPENAI_TEXT_MODEL)
OPENAI_DAILY_CALL_LIMIT = int(os.environ.get("OPENAI_DAILY_CALL_LIMIT", "3"))
OPENAI_USAGE_PATH = os.environ.get("OPENAI_USAGE_PATH", "/opt/m4-worker/openai_usage.json")
OPENAI_API_BASE = os.environ.get("OPENAI_API_BASE", "https://api.openai.com/v1")
OPENAI_WRITE_MODE = os.environ.get("OPENAI_WRITE_MODE", "structured").lower()
OPENAI_PUBLISH_MODE = os.environ.get("OPENAI_PUBLISH_MODE", "direct").lower()
RESEND_API_KEY = (os.environ.get("RESEND_API_KEY") or "").strip()
PORTAL_NOTIFY_EMAIL = (os.environ.get("PORTAL_M4_NOTIFY_EMAIL") or "").strip()
PORTAL_NOTIFY_FROM = os.environ.get("PORTAL_M4_NOTIFY_FROM", "Portal M4 <onboarding@resend.dev>")
PUBLIC_SITE_URL = os.environ.get("NEXT_PUBLIC_SITE_URL", "https://portalm4.com.br").rstrip("/")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Configure NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente do worker.")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

CATEGORY_RULES = [
    ("MERCADO FINANCEIRO", ["selic", "juros", "inflacao", "banco central", "bolsa", "b3", "ibovespa", "dolar", "cambio", "mercado financeiro"]),
    ("INVESTIMENTOS", ["investimento", "investidor", "fundos", "cdb", "tesouro", "renda fixa", "renda variavel", "dividendos", "carteira"]),
    ("INTELIGENCIA ARTIFICIAL", ["inteligencia artificial", "ia", "machine learning", "modelo", "automacao", "chatgpt", "llm"]),
    ("TECNOLOGIA", ["tecnologia", "software", "dados", "cloud", "ciberseguranca", "digital", "plataforma"]),
    ("CARREIRA", ["carreira", "emprego", "trabalho", "profissional", "salario", "recrutamento"]),
    ("EMPREENDEDORISMO", ["empreendedorismo", "startup", "negocio", "empresa", "fundador", "receita"]),
    ("EDUCACAO FINANCEIRA", ["educacao financeira", "orcamento", "divida", "credito", "planejamento financeiro"])
]

STOPWORDS = {'de','a','o','que','e','do','da','em','um','para','é','com','uma','os','no','se','na','por','mais','as','dos','como','mas','ao','das','ou','ser','quando','muito','há','nos','já','também','pelo','pela','até','isso','entre','sem','mesmo','aos','sua','seu','suas','seus','esta','este','essa','esse','aquilo','brasil','brasileiro','brasileira','mercado','tendencia','tendencias'}

NEWS_RSS_FEEDS = [
    ("topo brasil", "https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419"),
    ("economia brasil", "https://news.google.com/rss/search?q=economia%20OR%20juros%20OR%20Selic%20OR%20infla%C3%A7%C3%A3o%20when:2d&hl=pt-BR&gl=BR&ceid=BR:pt-419"),
    ("investimentos brasil", "https://news.google.com/rss/search?q=investimentos%20OR%20Bolsa%20OR%20B3%20OR%20renda%20fixa%20when:2d&hl=pt-BR&gl=BR&ceid=BR:pt-419"),
    ("tecnologia brasil", "https://news.google.com/rss/search?q=tecnologia%20OR%20intelig%C3%AAncia%20artificial%20OR%20ciberseguran%C3%A7a%20when:2d&hl=pt-BR&gl=BR&ceid=BR:pt-419"),
    ("carreira negocios", "https://news.google.com/rss/search?q=carreira%20OR%20emprego%20OR%20empreendedorismo%20OR%20startups%20when:2d&hl=pt-BR&gl=BR&ceid=BR:pt-419")
]

EDITORIAL_KEYWORDS = {
    "selic", "juros", "inflacao", "ipca", "dolar", "credito", "banco", "central", "b3",
    "ibovespa", "investimentos", "renda", "fixa", "fundos", "tesouro", "dividendos",
    "inteligencia", "artificial", "automacao", "ciberseguranca", "dados", "tecnologia",
    "startup", "empreendedorismo", "carreira", "emprego", "salario", "energia", "varejo",
    "industria", "consumo", "familias", "empresas", "brasil", "mundo"
}

def now_iso():
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

EXTENDED_METADATA_COLUMNS = {
    "source_urls", "source_titles", "factual_notes", "generation_provider", "generation_model"
}

def update_post_row(post_id, payload):
    """Atualiza post preservando compatibilidade se o banco ainda nao tiver os campos novos."""
    try:
        return supabase.table('portal_posts').update(payload).eq('id', post_id).execute()
    except Exception as e:
        message = str(e)
        if any(column in message for column in EXTENDED_METADATA_COLUMNS):
            fallback_payload = {k: v for k, v in payload.items() if k not in EXTENDED_METADATA_COLUMNS}
            print(">>> BANCO: campos novos ausentes; atualizando sem metadados estendidos. Execute npm run setup:db.")
            return supabase.table('portal_posts').update(fallback_payload).eq('id', post_id).execute()
        raise

def gemini_quota_day():
    if ZoneInfo:
        return datetime.now(ZoneInfo("America/Los_Angeles")).strftime("%Y-%m-%d")
    return datetime.utcnow().strftime("%Y-%m-%d")

def load_gemini_usage():
    try:
        with open(GEMINI_USAGE_PATH, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception:
        data = {}
    today = gemini_quota_day()
    if data.get("date") != today:
        data = {"date": today, "calls": 0, "models": {}, "lastErrors": []}
    data.setdefault("calls", 0)
    data.setdefault("models", {})
    data.setdefault("lastErrors", [])
    return data

def save_gemini_usage(data):
    try:
        folder = os.path.dirname(GEMINI_USAGE_PATH)
        if folder:
            os.makedirs(folder, exist_ok=True)
        with open(GEMINI_USAGE_PATH, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f">>> GEMINI: falha ao salvar uso diario: {e}")

def can_use_gemini(stage="geral"):
    if not GEMINI_ENABLED:
        return False
    usage = load_gemini_usage()
    if int(usage.get("calls") or 0) >= GEMINI_DAILY_CALL_LIMIT:
        print(f">>> GEMINI: limite diario interno atingido ({usage.get('calls')}/{GEMINI_DAILY_CALL_LIMIT}) para {stage}.")
        return False
    return True

def mark_gemini_usage(model, ok=True, error_message=""):
    usage = load_gemini_usage()
    usage["calls"] = int(usage.get("calls") or 0) + 1
    models = usage.setdefault("models", {})
    models[model] = int(models.get(model) or 0) + 1
    if not ok and error_message:
        errors = usage.setdefault("lastErrors", [])
        errors.append({"at": now_iso(), "model": model, "error": error_message[:240]})
        usage["lastErrors"] = errors[-5:]
    save_gemini_usage(usage)

def provider_quota_day():
    if ZoneInfo:
        return datetime.now(ZoneInfo("America/Los_Angeles")).strftime("%Y-%m-%d")
    return datetime.utcnow().strftime("%Y-%m-%d")

def load_openai_usage():
    try:
        with open(OPENAI_USAGE_PATH, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception:
        data = {}
    today = provider_quota_day()
    if data.get("date") != today:
        data = {"date": today, "calls": 0, "models": {}, "lastErrors": []}
    data.setdefault("calls", 0)
    data.setdefault("models", {})
    data.setdefault("lastErrors", [])
    return data

def save_openai_usage(data):
    try:
        folder = os.path.dirname(OPENAI_USAGE_PATH)
        if folder:
            os.makedirs(folder, exist_ok=True)
        with open(OPENAI_USAGE_PATH, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f">>> OPENAI: falha ao salvar uso diario: {e}")

def can_use_openai(stage="geral"):
    if not OPENAI_ENABLED:
        return False
    usage = load_openai_usage()
    if int(usage.get("calls") or 0) >= OPENAI_DAILY_CALL_LIMIT:
        print(f">>> OPENAI: limite diario interno atingido ({usage.get('calls')}/{OPENAI_DAILY_CALL_LIMIT}) para {stage}.")
        return False
    return True

def mark_openai_usage(model, ok=True, error_message=""):
    usage = load_openai_usage()
    usage["calls"] = int(usage.get("calls") or 0) + 1
    models = usage.setdefault("models", {})
    models[model] = int(models.get(model) or 0) + 1
    if not ok and error_message:
        errors = usage.setdefault("lastErrors", [])
        errors.append({"at": now_iso(), "model": model, "error": error_message[:240]})
        usage["lastErrors"] = errors[-5:]
    save_openai_usage(usage)

def openai_extract_text(payload):
    if isinstance(payload.get("output_text"), str):
        return payload["output_text"].strip()
    texts = []
    for item in payload.get("output", []) or []:
        for content in item.get("content", []) or []:
            text = content.get("text")
            if isinstance(text, str):
                texts.append(text)
    return "\n".join(texts).strip()

def generate_openai(prompt, model=None, instructions=None, max_output_tokens=4096, timeout_seconds=300, temperature=None, stage="geral", json_schema=None):
    if not can_use_openai(stage):
        return None
    selected_model = model or OPENAI_TEXT_MODEL
    body = {
        "model": selected_model,
        "instructions": instructions or "Voce e um editor senior do Portal M4. Responda em portugues do Brasil.",
        "input": prompt,
        "max_output_tokens": max_output_tokens
    }
    if temperature is not None:
        body["temperature"] = temperature
    if json_schema:
        body["text"] = {
            "format": {
                "type": "json_schema",
                "name": "portal_m4_article",
                "schema": json_schema,
                "strict": True
            }
        }
    try:
        response = requests.post(
            f"{OPENAI_API_BASE.rstrip('/')}/responses",
            json=body,
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            timeout=timeout_seconds
        )
        mark_openai_usage(selected_model, ok=response.status_code == 200, error_message=response.text if response.status_code != 200 else "")
        if response.status_code != 200:
            print(f">>> OPENAI: HTTP {response.status_code} em {stage}: {response.text[:400]}")
            return None
        text = openai_extract_text(response.json())
        if not text:
            print(f">>> OPENAI: resposta sem texto em {stage}: {response.text[:400]}")
            return None
        return text
    except Exception as e:
        mark_openai_usage(selected_model, ok=False, error_message=str(e))
        print(f">>> OPENAI: falha em {stage}: {e}")
        return None

def openai_article_schema():
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "title": {"type": "string"},
            "subtitle": {"type": "string"},
            "excerpt": {"type": "string"},
            "content": {"type": "string"},
            "hashtags": {"type": "array", "items": {"type": "string"}},
            "keywords": {"type": "array", "items": {"type": "string"}},
            "image_prompt": {"type": "string"},
            "source_urls": {"type": "array", "items": {"type": "string"}},
            "source_titles": {"type": "array", "items": {"type": "string"}},
            "factual_notes": {"type": "string"}
        },
        "required": [
            "title", "subtitle", "excerpt", "content", "hashtags", "keywords",
            "image_prompt", "source_urls", "source_titles", "factual_notes"
        ]
    }

def generate_openai_structured_article(prompt, outline, topic, source_topic, editorial_angle, brief, style):
    if OPENAI_WRITE_MODE not in {"structured", "openai", "responses"}:
        return None
    structured_prompt = f"""Crie um artigo premium para o Portal M4 com saida estritamente estruturada.

Tema: {topic}
Assunto-base: {source_topic}
Angulo editorial: {editorial_angle}
Estilo de abertura: {style['nome']} - {style['instrucao']}

Brief do painel:
{brief}

Roteiro/contexto factual:
{outline}

Regras:
- portugues do Brasil;
- tom jornalistico premium, claro e util;
- minimo 1200 palavras no campo content;
- subtitulos com ## dentro de content;
- nao inclua os campos de metadados dentro de content;
- cite fontes nominalmente no texto quando usar dados;
- source_urls deve conter URLs publicas reais quando houver, ou lista vazia se nao houver URL verificavel;
- source_titles deve conter nomes de fontes/referencias usadas;
- factual_notes deve explicar em 3 a 6 frases quais afirmacoes precisam de checagem humana antes de publicar;
- image_prompt deve ser em ingles e representar o artigo, nao cena generica de escritorio."""
    text = generate_openai(
        structured_prompt,
        model=OPENAI_TEXT_MODEL,
        instructions="Voce e o editor-chefe do Portal M4. Entregue somente JSON valido aderente ao schema solicitado.",
        max_output_tokens=6500,
        timeout_seconds=420,
        stage="openai-artigo-estruturado",
        json_schema=openai_article_schema()
    )
    if not text:
        return None
    try:
        data = json.loads(text)
    except Exception as e:
        print(f">>> OPENAI: JSON invalido no artigo estruturado: {e}; trecho={text[:300]}")
        return None
    required = ["title", "excerpt", "content", "image_prompt"]
    if any(not str(data.get(key) or "").strip() for key in required):
        print(">>> OPENAI: artigo estruturado incompleto; fallback sera acionado.")
        return None
    return data

def compose_structured_article_text(article):
    content = clean_markup(article.get("content") or "")
    title = clean_markup(article.get("title") or "")
    subtitle = clean_markup(article.get("subtitle") or "")
    excerpt = clean_markup(article.get("excerpt") or "")
    hashtags = ", ".join([clean_markup(v) for v in (article.get("hashtags") or []) if clean_markup(v)])
    keywords = ", ".join([clean_markup(v) for v in (article.get("keywords") or []) if clean_markup(v)])
    image_prompt = clean_markup(article.get("image_prompt") or "")
    return f"""{content}

TITULO_FINAL: {title}
SUBTITULO_SEO: {subtitle}
EXCERPT: {excerpt}
HASHTAGS: {hashtags}
KEYWORDS: {keywords}
IMAGE_PROMPT: {image_prompt}""".strip()

def gemini_extract_text(payload):
    texts = []
    for candidate in payload.get("candidates", []) or []:
        content = candidate.get("content") or {}
        for part in content.get("parts", []) or []:
            text = part.get("text")
            if text:
                texts.append(text)
    return "\n".join(texts).strip()

def generate_gemini(prompt, model=None, use_search=False, max_output_tokens=4096, timeout_seconds=300, temperature=0.55, stage="geral"):
    if not can_use_gemini(stage):
        return None
    selected_model = model or GEMINI_WRITER_MODEL
    url = f"{GEMINI_API_BASE}/models/{selected_model}:generateContent?key={urllib.parse.quote(GEMINI_API_KEY)}"
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "topP": 0.9,
            "maxOutputTokens": max_output_tokens
        }
    }
    if "2.5" in selected_model and "flash" in selected_model:
        body["generationConfig"]["thinkingConfig"] = {"thinkingBudget": 0}
    if use_search:
        body["tools"] = [{"google_search": {}}]

    try:
        response = requests.post(url, json=body, timeout=timeout_seconds)
        mark_gemini_usage(selected_model, ok=response.status_code == 200, error_message=response.text if response.status_code != 200 else "")
        if response.status_code != 200:
            print(f">>> GEMINI: HTTP {response.status_code} em {stage}: {response.text[:300]}")
            return None
        text = gemini_extract_text(response.json())
        if not text:
            print(f">>> GEMINI: resposta sem texto em {stage}: {response.text[:300]}")
            return None
        return text
    except Exception as e:
        mark_gemini_usage(selected_model, ok=False, error_message=str(e))
        print(f">>> GEMINI: falha em {stage}: {e}")
        return None

def generate_gemini_with_fallback(prompt, primary_model, use_search=False, max_output_tokens=4096, timeout_seconds=300, temperature=0.55, stage="geral"):
    text = generate_gemini(
        prompt,
        model=primary_model,
        use_search=use_search,
        max_output_tokens=max_output_tokens,
        timeout_seconds=timeout_seconds,
        temperature=temperature,
        stage=stage
    )
    if text:
        return text
    if GEMINI_FALLBACK_MODEL and GEMINI_FALLBACK_MODEL != primary_model and can_use_gemini(f"{stage}/fallback"):
        return generate_gemini(
            prompt,
            model=GEMINI_FALLBACK_MODEL,
            use_search=False,
            max_output_tokens=max_output_tokens,
            timeout_seconds=timeout_seconds,
            temperature=temperature,
            stage=f"{stage}/fallback"
        )
    return None

def normalize_text(value):
    value = (value or "").lower()
    accents = str.maketrans("áàãâäéèêëíìîïóòõôöúùûüç", "aaaaaeeeeiiiiooooouuuuc")
    value = value.translate(accents)
    value = re.sub(r"[^a-z0-9 ]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()

def significant_word_set(value):
    return {w for w in normalize_text(value).split() if len(w) > 3 and w not in STOPWORDS}

def jaccard_text(a, b):
    left = significant_word_set(a)
    right = significant_word_set(b)
    if len(left) < 2 or len(right) < 2:
        return 0.0
    return len(left & right) / len(left | right)

def slugify(value):
    slug = normalize_text(value).replace(" ", "-")
    slug = re.sub(r"-+", "-", slug).strip("-")
    return (slug[:85] or "artigo-premium-m4")

def clean_markup(value):
    value = (value or "").strip()
    value = re.sub(r"^\s{0,3}#{1,6}\s*", "", value)
    value = re.sub(r"[*_`\"“”]+", "", value)
    return value.strip(" -:[]")

def extract_labeled_value(content, labels):
    for label in labels:
        pattern = rf"^\s*(?:\d+\.\s*)?{re.escape(label)}\s*[:：-]\s*(.+)$"
        match = re.search(pattern, content or "", flags=re.IGNORECASE | re.MULTILINE)
        if match:
            return clean_markup(match.group(1))
    return ""

def remove_metadata_blocks(content):
    cleaned_lines = []
    for line in (content or "").splitlines():
        if re.match(r"^\s*(?:\d+\.\s*)?(TITULO_FINAL|SUBTITULO_SEO|ANGULO_EDITORIAL|EXCERPT|HASHTAGS|KEYWORDS|IMAGE_PROMPT)\s*[:：-]", line, flags=re.IGNORECASE):
            continue
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines).strip()

def normalize_excerpt(value, content="", min_len=130, max_len=240):
    excerpt = clean_markup(re.sub(r"\s+", " ", value or "")).strip()
    if len(excerpt) < min_len:
        source = clean_markup(re.sub(r"\s+", " ", remove_metadata_blocks(content or ""))).strip()
        if source:
            excerpt = source[:max_len + 80]
    if len(excerpt) > max_len:
        cut = excerpt[:max_len].rsplit(" ", 1)[0].strip(" ,.;:-")
        excerpt = f"{cut}."
    if len(excerpt) < min_len and content:
        source = clean_markup(re.sub(r"\s+", " ", remove_metadata_blocks(content or ""))).strip()
        excerpt = source[:max_len].rsplit(" ", 1)[0].strip(" ,.;:-") + "."
    return excerpt[:max_len].strip()

def is_salvageable_article(content):
    if not content:
        return False
    normalized = normalize_text(content)
    placeholders = [
        "refazendo artigo automaticamente",
        "aguardando reprocessamento",
        "gerando via cronograma",
        "gerando artigo premium",
        "limpando rascunho"
    ]
    if any(item in normalized for item in placeholders):
        return False
    return len(normalized.split()) >= 650

def title_already_exists(title, recent_titles, threshold=0.52):
    """Verifica se o título ou a tese editorial já existe."""
    title_norm = normalize_text(title)
    for existing in recent_titles:
        existing_norm = normalize_text(existing)
        if title_norm and title_norm == existing_norm:
            return True
        if title_norm[:42] and title_norm[:42] == existing_norm[:42]:
            return True
        if jaccard_text(title, existing) >= threshold:
            return True
    return False

def title_is_structural_or_invalid(title):
    cleaned = normalize_text(title)
    if len(title or "") < 35:
        return True
    generic_patterns = [
        r"portal m4",
        r"grupo m4",
        r"inteligencia financeira tecnologia e ia",
        r"decidir melhor",
        r"bem vindo",
        r"sobre o portal",
        r"conteudo premium",
        r"analise exclusiva o futuro de",
        r"tendencias de mercado$",
        r"artigo premium",
        r"guia completo",
        r"fios de pensamento",
        r"torcoes? de genialidade",
        r"inovacao empresarial brasileira$"
    ]
    if any(re.search(pattern, cleaned) for pattern in generic_patterns):
        return True
    if re.match(r"^(i|ii|iii|iv|v|vi|1|2|3)\s*(introducao|contexto|conclusao|resumo|analise)$", cleaned):
        return True
    if cleaned in {"introducao", "contexto", "conclusao", "resumo", "analise", "desenvolvimento"}:
        return True
    return False

def has_public_impact(value):
    return bool(re.search(r"(familia|familias|trabalhador|trabalhadores|emprego|salario|renda|consumidor|consumidores|investidor|investidores|aposentadoria|credito|divida|juros|inflacao|ipca|selic|empresa|empresas|pequenos negocios|empreendedor|seguranca|educacao|moradia|custo de vida|classe media|baixa renda|patrimonio)", value or "", flags=re.IGNORECASE))

def has_actionable_depth(value):
    patterns = [
        r"o que muda", r"quem ganha", r"quem perde", r"como se proteger", r"como aproveitar",
        r"riscos?", r"oportunidades?", r"proximos? meses", r"cenario base",
        r"cenario otimista", r"cenario de estresse", r"decisao", r"estrategia"
    ]
    return sum(1 for pattern in patterns if re.search(pattern, value or "", flags=re.IGNORECASE)) >= 3

def build_content_fingerprint(content):
    words = sorted(list(significant_word_set((content or "")[:4000])))[:120]
    return hashlib.sha256(" ".join(words).encode("utf-8")).hexdigest()[:24]

def build_visual_fingerprint(image_prompt, seed):
    base = f"{normalize_text(image_prompt)[:180]}|{seed}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()[:24]

def build_editorial_brief(source_topic, editorial_angle, current_notes=""):
    if current_notes and "PAUTA PREMIUM M4" in current_notes:
        return current_notes
    return "\n".join([
        "PAUTA PREMIUM M4",
        f"Assunto-base: {source_topic}",
        f"Angulo editorial: {editorial_angle}",
        "Publico-alvo: leitor brasileiro amplo, de diferentes classes sociais, com linguagem premium e acessivel",
        "Contrato editorial:",
        "- O artigo deve ser unico, com tese propria, dados, exemplos brasileiros e utilidade pratica.",
        "- O texto deve passar pela Auditoria Editorial M4 antes da publicacao.",
        "- Se estiver refazendo, corrigir explicitamente os motivos da reprovação anterior.",
        "Direcao visual: capa editorial fotorrealista premium, sem texto, sem pessoas identificaveis, com identidade Portal M4"
    ])

VISUAL_PROFILES = {
    "MERCADO FINANCEIRO": "Brazilian financial market context, interest rates, currency, B3 trading signals, macroeconomic dashboards",
    "INVESTIMENTOS": "personal investment planning, portfolio allocation, fixed income and equity signals, premium financial desk",
    "INTELIGENCIA ARTIFICIAL": "AI infrastructure, neural network visualization, automation systems, human-scale technology environment",
    "TECNOLOGIA": "digital infrastructure, cloud systems, cybersecurity, product analytics and modern software operations",
    "CARREIRA": "professional transformation, hiring market, skill development, executive workspace without identifiable faces",
    "EMPREENDEDORISMO": "founder strategy, startup operations, growth dashboard, premium business planning table",
    "EDUCACAO FINANCEIRA": "family financial planning, budget organization, accessible premium home office, everyday money decisions",
    "GERAL": "Brazilian business, technology and economy context, premium editorial analysis"
}

GENERIC_IMAGE_TERMS = {
    "office", "business", "technology", "finance", "charts", "data", "digital", "premium",
    "editorial", "cinematic", "photorealistic", "modern", "professional", "corporate"
}

def extract_visual_keywords(value, limit=10):
    words = []
    for word in normalize_text(value).split():
        if len(word) <= 3 or word in STOPWORDS or word in words:
            continue
        words.append(word)
        if len(words) >= limit:
            break
    return words

def image_prompt_is_specific(prompt, context):
    if not prompt or len(prompt) < 120:
        return False
    prompt_words = significant_word_set(prompt)
    if len(prompt_words) < 10:
        return False
    generic_count = len(prompt_words & GENERIC_IMAGE_TERMS)
    if generic_count >= max(8, len(prompt_words) * 0.55):
        return False
    context_words = significant_word_set(context)
    # O prompt preserva palavras-chave em portugues justamente para permitir essa auditoria.
    return len(prompt_words & context_words) >= 2

def rule_based_visual_prompt(title, excerpt="", content="", source_topic="", editorial_angle="", category="GERAL", visual_direction=""):
    context = " ".join([title or "", excerpt or "", source_topic or "", editorial_angle or "", category or "", (content or "")[:1000]])
    keywords = extract_visual_keywords(context, 12)
    profile = visual_direction or VISUAL_PROFILES.get(category or "GERAL", VISUAL_PROFILES["GERAL"])
    return " ".join([
        "Premium photorealistic editorial cover for Portal M4.",
        f"Specific article context: {title}.",
        f"Editorial thesis: {excerpt}." if excerpt else "",
        f"Angle to represent visually: {editorial_angle}." if editorial_angle else "",
        f"Visual scene: {profile}.",
        f"Concept keywords to preserve: {', '.join(keywords)}." if keywords else "",
        "Composition: realistic Brazilian business, economy and technology atmosphere, elegant lighting, sharp focus, high-end magazine cover.",
        "Strict constraints: no text, no logo, no watermark, no readable UI labels, no identifiable faces, no generic random office."
    ]).strip()

def build_contextual_image_prompt(title, excerpt="", content="", source_topic="", editorial_angle="", category="GERAL", visual_direction=""):
    fallback = rule_based_visual_prompt(title, excerpt, content, source_topic, editorial_angle, category, visual_direction)
    context = " ".join([title or "", excerpt or "", source_topic or "", editorial_angle or "", category or "", (content or "")[:1200]])
    try:
        prompt = f"""Create ONE English image-generation prompt for a premium editorial cover.
The image must represent the exact article, not a generic business scene.

Article title: {title}
Excerpt: {excerpt}
Source topic: {source_topic}
Editorial angle: {editorial_angle}
Category: {category}
Article keywords in Portuguese: {', '.join(extract_visual_keywords(context, 12))}
Preferred visual direction: {visual_direction or VISUAL_PROFILES.get(category, VISUAL_PROFILES['GERAL'])}

Rules:
- photorealistic high-end editorial cover
- include concrete objects/scenes linked to the article
- preserve the Portuguese concept keywords at the end for audit
- no text, no logo, no readable labels, no identifiable faces
- answer only the final prompt, max 850 characters"""
        candidate = clean_markup(generate_short_content(prompt, max_tokens=260, timeout_seconds=240) or "")
        candidate = re.sub(r"^prompt\s*[:：-]\s*", "", candidate, flags=re.IGNORECASE).strip()
        if image_prompt_is_specific(candidate, context):
            return candidate[:900]
    except Exception as e:
        print(f">>> IMAGEM: fallback visual por falha no briefing IA: {e}")
    return fallback[:900]

def ensure_queue_integrity(post):
    """Revisa a fila antes da produção e corrige pautas incompletas."""
    updates = {}
    title = post.get('title') or 'Pauta Premium M4'
    source_topic = post.get('source_topic') or title.split('|')[0].strip()
    editorial_angle = post.get('editorial_angle') or 'analise estrategica premium com dados e aplicacao pratica'
    notes = post.get('reviewer_notes') or ''

    if not post.get('source_topic'):
        updates['source_topic'] = source_topic
    if not post.get('editorial_angle'):
        updates['editorial_angle'] = editorial_angle
    if "PAUTA PREMIUM M4" not in notes:
        updates['reviewer_notes'] = build_editorial_brief(source_topic, editorial_angle, notes)
    if not post.get('image_prompt') or not post.get('visual_fingerprint') or not post.get('image_url') or 'seed=' not in (post.get('image_url') or ''):
        used_seeds = get_recent_image_seeds(100)
        image_prompt = build_contextual_image_prompt(title, "", "", source_topic, editorial_angle, post.get('category') or "GERAL")
        image_url, _seed, visual_fp, final_prompt = generate_unique_image_url(f"{source_topic} {editorial_angle}", used_seeds, image_prompt)
        updates['image_url'] = image_url
        updates['image_prompt'] = final_prompt
        updates['visual_fingerprint'] = visual_fp

    if updates:
        updates['updated_at'] = now_iso()
        supabase.table('portal_posts').update(updates).eq('id', post['id']).execute()
        post.update(updates)
        print(f">>> FILA REVISADA: metadados corrigidos para {title}")

    return post

def requeue_or_reject(post, reason):
    current_count = int(post.get('editorial_revision_count') or 0)
    next_count = current_count + 1
    previous_notes = post.get('reviewer_notes') or ''
    preserved_content = ""
    preserved_excerpt = ""
    try:
        current = supabase.table('portal_posts').select('content,excerpt').eq('id', post['id']).single().execute()
        if current.data:
            preserved_content = current.data.get('content') or ""
            preserved_excerpt = current.data.get('excerpt') or ""
    except Exception:
        preserved_content = post.get('content') or ""
        preserved_excerpt = post.get('excerpt') or ""

    can_polish = is_salvageable_article(preserved_content)
    notes = "\n\n".join([
        previous_notes,
        f"RETRABALHO AUTOMATICO M4 ({now_iso()})",
        f"Tentativa: {next_count}",
        "Resultado: artigo voltou para a fila e sera lapidado pelo Ollama preservando a pesquisa original." if can_polish else "Resultado: artigo voltou para a fila e sera refeito ate passar na auditoria e ser publicado.",
        f"Motivo: {reason}"
    ]).strip()
    payload = {
        'status': 'queued',
        'reviewer_notes': notes,
        'editorial_revision_count': next_count,
        'content': preserved_content if can_polish else 'Refazendo artigo automaticamente apos reprovar na curadoria M4...',
        'excerpt': preserved_excerpt if can_polish and preserved_excerpt else 'Artigo voltou para a fila para refacao automatica.',
        'updated_at': now_iso()
    }
    supabase.table('portal_posts').update(payload).eq('id', post['id']).execute()
    print(f">>> RETRABALHO: QUEUED | tentativa {next_count} | {'lapidacao' if can_polish else 'refacao'} | {reason}")
    return True

def publish_due_scheduled_posts():
    """Publica artigos em analysis/approved quando published_at chega, sem depender de acesso ao site."""
    try:
        now = now_iso()
        res = supabase.table('portal_posts') \
            .select('*') \
            .in_('status', ['review', 'analysis', 'approved']) \
            .lte('published_at', now) \
            .eq('is_active', True) \
            .order('published_at', desc=False) \
            .limit(20) \
            .execute()
    except Exception as e:
        print(f">>> PUBLICADOR: falha ao consultar agendados: {e}")
        return

    for post in (res.data or []):
        audit = post.get('editorial_audit') or {}
        score = int(post.get('editorial_score') or audit.get('score') or 0)
        passed = bool(audit.get('passed')) and score >= 82
        title = post.get('title') or post.get('id')

        if not passed:
            print(f">>> PUBLICADOR: agendado sem auditoria aprovada: {title}")
            requeue_or_reject(post, f"publicacao agendada bloqueada: auditoria ausente ou insuficiente ({score}/100).")
            continue

        notes = "\n\n".join([
            post.get('reviewer_notes') or '',
            f"PUBLICACAO AUTOMATICA M4 ({now})",
            "Horario programado alcancado pelo worker da VPS e auditoria ja aprovada."
        ]).strip()
        try:
            supabase.table('portal_posts').update({
                'status': 'published',
                'published_at': now,
                'reviewer_notes': notes,
                'updated_at': now
            }).eq('id', post['id']).execute()
            notify_publication({**post, 'published_at': now, 'reviewer_notes': notes})
            print(f">>> PUBLICADOR: publicado automaticamente: {title}")
        except Exception as e:
            print(f">>> PUBLICADOR: erro ao publicar {title}: {e}")

def notify_publication(post):
    if not RESEND_API_KEY or not PORTAL_NOTIFY_EMAIL:
        print(">>> EMAIL: notificacao de publicacao nao configurada.")
        return False
    title = post.get('title') or 'Artigo publicado'
    slug = post.get('slug') or ''
    url = f"{PUBLIC_SITE_URL}/artigo/{slug}" if slug else PUBLIC_SITE_URL
    audit = post.get('editorial_audit') or {}
    score = post.get('editorial_score') or audit.get('score') or 'sem nota'
    attempts = post.get('editorial_revision_count') or 0
    published_at = post.get('published_at') or now_iso()
    excerpt = post.get('excerpt') or ''
    html = f"""
    <h2>Artigo publicado no Portal M4</h2>
    <p><strong>{title}</strong></p>
    <p><strong>Nota editorial:</strong> {score}/100</p>
    <p><strong>Tentativas:</strong> {attempts}</p>
    <p><strong>Publicado em:</strong> {published_at}</p>
    <p>{excerpt}</p>
    <p><a href="{url}">Abrir artigo publicado</a></p>
    """
    text = "\n".join([
        "Artigo publicado no Portal M4",
        title,
        f"Nota editorial: {score}/100",
        f"Tentativas: {attempts}",
        f"Publicado em: {published_at}",
        url,
        excerpt
    ])
    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "from": PORTAL_NOTIFY_FROM,
                "to": [PORTAL_NOTIFY_EMAIL],
                "subject": f"Portal M4 publicou: {title[:90]}",
                "html": html,
                "text": text
            },
            timeout=30
        )
        if response.status_code >= 300:
            print(f">>> EMAIL: falha Resend HTTP {response.status_code}: {response.text[:240]}")
            return False
        print(f">>> EMAIL: notificacao enviada para {PORTAL_NOTIFY_EMAIL}")
        return True
    except Exception as e:
        print(f">>> EMAIL: erro ao enviar notificacao: {e}")
        return False

def choose_final_title(content, fallback_topic, recent_titles):
    candidate = extract_labeled_value(content, ["TITULO_FINAL", "TÍTULO_FINAL", "TITULO", "TÍTULO"])
    if not candidate:
        heading = re.search(r"^\s{0,3}#{1,2}\s+(.+)$", content or "", flags=re.MULTILINE)
        candidate = clean_markup(heading.group(1)) if heading else clean_markup(fallback_topic)
    candidate = candidate[:125].strip()
    if title_is_structural_or_invalid(candidate):
        candidate = ""
    if candidate and not title_already_exists(candidate, recent_titles):
        return candidate

    forbidden = "\n".join(f"- {t}" for t in recent_titles[:12]) or "Nenhum."
    prompt = f"""Crie apenas UM titulo final unico para um artigo premium do Portal M4.
Tema original: {fallback_topic}
Titulo bloqueado por similaridade: {candidate}
Titulos proibidos:
{forbidden}

Regras:
- portugues do Brasil
- maximo 115 caracteres
- especifico, elegante e sem repetir estruturas
- responda somente o titulo"""
    alternate = clean_markup(generate_content(prompt) or "")
    if alternate and not title_is_structural_or_invalid(alternate) and not title_already_exists(alternate, recent_titles):
        return alternate[:125]
    suffix = int(time.time()) % 100000
    return f"{clean_markup(fallback_topic)[:92]}: analise M4 {suffix}"

def classify_category(text):
    normalized = (text or "").lower()
    scores = {}
    for category, keywords in CATEGORY_RULES:
        scores[category] = sum(1 for keyword in keywords if keyword in normalized)
    best_category = max(scores, key=scores.get)
    return best_category if scores[best_category] > 0 else "GERAL"

def generate_ollama(prompt, model=None, max_tokens=1800, timeout_seconds=1200, temperature=0.7, label="Ollama"):
    try:
        response = requests.post(OLLAMA_URL,
            json={
                'model': model or WRITER_MODEL,
                'prompt': prompt,
                'stream': False,
                'options': {
                    'temperature': temperature,
                    'num_predict': max_tokens,
                    'top_p': 0.9,
                    'num_ctx': 2048
                }
            }, timeout=timeout_seconds)
        if response.status_code != 200:
            print(f'Erro no {label} HTTP {response.status_code}: {response.text[:300]}')
            return None
        text = response.json().get('response', '')
        if not text:
            print(f'{label} sem resposta valida: {response.text[:300]}')
            return None
        return text
    except Exception as e:
        print(f'Erro no {label}: {e}')
        return None

def generate_content(prompt):
    text = generate_ollama(prompt, model=WRITER_MODEL, max_tokens=1800, timeout_seconds=1200, temperature=0.7, label=f"Ollama writer {WRITER_MODEL}")
    if text:
        return text
    if FALLBACK_MODEL != WRITER_MODEL:
        return generate_ollama(prompt, model=FALLBACK_MODEL, max_tokens=1800, timeout_seconds=1200, temperature=0.65, label=f"Ollama fallback {FALLBACK_MODEL}")
    return None

def generate_revision_content(prompt, max_tokens=900, timeout_seconds=420):
    text = generate_ollama(prompt, model=REVISER_MODEL, max_tokens=max_tokens, timeout_seconds=timeout_seconds, temperature=0.45, label=f"Ollama reviser {REVISER_MODEL}")
    if text:
        return text
    if FALLBACK_MODEL != REVISER_MODEL:
        return generate_ollama(prompt, model=FALLBACK_MODEL, max_tokens=max_tokens, timeout_seconds=timeout_seconds, temperature=0.45, label=f"Ollama fallback {FALLBACK_MODEL}")
    return None

def generate_short_content(prompt, max_tokens=220, timeout_seconds=240):
    return generate_ollama(prompt, model=FAST_MODEL, max_tokens=max_tokens, timeout_seconds=timeout_seconds, temperature=0.65, label=f"Ollama fast {FAST_MODEL}")

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
        res = supabase.table('portal_posts') \
            .select('id', count='exact') \
            .gte('created_at', today) \
            .in_('status', ['queued', 'generating', 'review', 'analysis', 'published']) \
            .execute()
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

def get_recent_image_seeds(limit=50):
    """Extrai os seeds usados nas últimas imagens para não repetir."""
    try:
        res = supabase.table('portal_posts').select('image_url').order('created_at', desc=True).limit(limit).execute()
        seeds = set()
        for row in (res.data or []):
            url = row.get('image_url', '') or ''
            if 'seed=' in url:
                try:
                    seed_val = int(url.split('seed=')[-1].split('&')[0])
                    seeds.add(seed_val)
                except:
                    pass
        return seeds
    except:
        return set()

def get_recent_content_samples(limit=20):
    """Busca as primeiras 250 palavras dos últimos artigos para comparar corpo do texto."""
    try:
        res = supabase.table('portal_posts') \
            .select('content') \
            .in_('status', ['review', 'approved', 'published']) \
            .order('created_at', desc=True) \
            .limit(limit) \
            .execute()
        samples = []
        for row in (res.data or []):
            body = (row.get('content') or '').strip()
            # Remove linhas de hashtags/palavras-chave do final
            body = body.split('\n\n#')[0].split('\n\n##')[0]
            words = body.lower().split()
            samples.append(set(words[:250]))
        return samples
    except:
        return []

def content_is_too_similar(new_content, existing_samples, threshold=0.34):
    """Detecta se o corpo do artigo é muito parecido com algum artigo já existente.
    Usa Jaccard de palavras nas primeiras 250 palavras. Limiar: 40%."""
    if not existing_samples or not new_content:
        return False, 0.0

    body = new_content.strip().split('\n\n#')[0]
    words_new = set(body.lower().split()[:250])

    if len(words_new) < 50:  # Texto muito curto, não verifica
        return False, 0.0

    # Stopwords comuns em português para ignorar no cálculo
    STOPWORDS = {'de','a','o','que','e','do','da','em','um','para','é','com','uma','os','no','se','na','por','mais','as','dos','como','mas','foi','ao','ele','das','tem','à','seu','sua','ou','ser','quando','muito','há','nos','já','também','só','pelo','pela','até','isso','ela','entre','era','depois','sem','mesmo','aos','ter','seus','quem','nas','me','esse','eles','estão','você','tinha','foram','essa','num','nem','suas','meu','às','minha','têm','numa','pelos','pelas','este','dele','tu','te','vocês','lhes','meus','minhas','teu','tua','teus','tuas','nos','nós','vós','lhe','dela','deles','delas','esta','estes','estas','aquele','aquela','aqueles','aquelas','isso','aquilo','estar','estou','está','estamos','estão'}
    words_new_filtered = words_new - STOPWORDS

    max_sim = 0.0
    for existing_words in existing_samples:
        existing_filtered = existing_words - STOPWORDS
        if not existing_filtered:
            continue
        intersection = len(words_new_filtered & existing_filtered)
        union = len(words_new_filtered | existing_filtered)
        if union == 0:
            continue
        sim = intersection / union
        if sim > max_sim:
            max_sim = sim

    return max_sim >= threshold, round(max_sim * 100, 1)

def run_editorial_audit_payload(title, excerpt, content, image_url, image_prompt, visual_fingerprint, recent_titles):
    words = len(normalize_text(content).split())
    headings = len(re.findall(r"^##\s+.+", content or "", flags=re.MULTILINE))
    paragraphs = len([line.strip() for line in (content or "").splitlines() if len(line.strip()) > 80 and not line.strip().startswith("##")])
    data_points = len(re.findall(r"(\b20\d{2}\b|\b\d+[,.]?\d*\s?%|R\$\s?\d+|US\$\s?\d+|\bSelic\b|\bIPCA\b|\bPIB\b)", content or "", flags=re.IGNORECASE))
    source_signals = len(re.findall(r"(Banco Central|IBGE|FMI|Reuters|Bloomberg|Deloitte|McKinsey|Gartner|XP|B3|Anbima|CVM|Febraban)", content or "", flags=re.IGNORECASE))
    practical_signals = len(re.findall(r"(exemplo|na pratica|estrategia|risco|oportunidade|cenario|decisao|investidor|profissional|familia|empresa)", content or "", flags=re.IGNORECASE))
    metadata_leak = bool(re.search(r"(^|\n)\s*(TITULO_FINAL|SUBTITULO_SEO|EXCERPT|HASHTAGS|KEYWORDS|IMAGE_PROMPT)\s*:", content or "", flags=re.IGNORECASE))
    banned_opening = bool(re.match(r"^(nos ultimos anos|em um cenario|no contexto atual|com o avanco|e importante|neste artigo)", normalize_text((content or "")[:120]), flags=re.IGNORECASE))
    duplicate_title = any(jaccard_text(title, existing) >= 0.52 or normalize_text(title) == normalize_text(existing) for existing in (recent_titles or []))
    generic_or_institutional = title_is_structural_or_invalid(title) or title_is_structural_or_invalid(excerpt)
    public_impact = has_public_impact(f"{title} {excerpt} {content[:3000]}")
    actionable_depth = has_actionable_depth(f"{title} {excerpt} {content[:3000]}")
    image_unique = bool(image_url and "seed=" in image_url and "images.unsplash.com/photo-1611974714658" not in image_url and visual_fingerprint)
    visual_context = f"{title} {excerpt} {content[:1000]}"
    image_contextual = image_prompt_is_specific(image_prompt, visual_context)
    image_score = round(jaccard_text(image_prompt or "", visual_context) * 100)

    checks = [
        {"key": "title", "label": "Titulo jornalistico, concreto e exclusivo", "passed": 55 <= len(title or "") <= 125 and not duplicate_title and not generic_or_institutional and not re.search(r"[#*_`]", title or ""), "points": 12, "detail": f"{len(title or '')} caracteres" + ("; similar a titulo recente" if duplicate_title else "") + ("; pauta institucional/generica" if generic_or_institutional else "")},
        {"key": "relevance", "label": "Relevancia social, economica ou profissional real", "passed": public_impact and actionable_depth, "points": 14, "detail": ("impacto publico detectado" if public_impact else "sem impacto publico claro") + "; " + ("profundidade acionavel" if actionable_depth else "sem decisao pratica suficiente")},
        {"key": "excerpt", "label": "Resumo SEO suficiente e sem sujeira de prompt", "passed": 120 <= len(excerpt or "") <= 260 and not metadata_leak, "points": 8, "detail": f"{len(excerpt or '')} caracteres"},
        {"key": "depth", "label": "Profundidade editorial minima", "passed": words >= 1100, "points": 16, "detail": f"{words} palavras"},
        {"key": "structure", "label": "Estrutura com secoes e boa escaneabilidade", "passed": headings >= 4 and paragraphs >= 8, "points": 12, "detail": f"{headings} subtitulos e {paragraphs} paragrafos substanciais"},
        {"key": "evidence", "label": "Dados, datas, percentuais ou valores suficientes", "passed": data_points >= 5 and source_signals >= 2, "points": 12, "detail": f"{data_points} sinais numericos e {source_signals} fontes citadas"},
        {"key": "accessibility", "label": "Linguagem premium acessivel ao publico amplo", "passed": practical_signals >= 8 and not banned_opening, "points": 10, "detail": f"{practical_signals} sinais praticos" + ("; abertura generica detectada" if banned_opening else "")},
        {"key": "cleanliness", "label": "Texto limpo, sem blocos tecnicos ou artefatos", "passed": not metadata_leak and not re.search(r"\*\*|```|\[.+\]", (content or "")[:1000]), "points": 10, "detail": "sem vazamento tecnico aparente" if not metadata_leak else "metadados internos vazaram no texto"},
        {"key": "image", "label": "Imagem premium, unica e aderente ao contexto", "passed": image_unique and image_contextual, "points": 12, "detail": f"seed unico; brief contextual; aderencia {image_score}%" if image_unique and image_contextual else "imagem sem seed unico ou brief visual generico/desconectado"},
    ]
    score = sum(check["points"] for check in checks if check["passed"])
    blockers = [f"{check['label']}: {check['detail']}" for check in checks if not check["passed"]]
    return {
        "score": score,
        "passed": score >= 82 and len(blockers) == 0,
        "checks": checks,
        "blockers": blockers,
        "auditedAt": now_iso()
    }

def get_audit_checks(post):
    audit = post.get('editorial_audit') or {}
    checks = audit.get('checks') or []
    return checks if isinstance(checks, list) else []

def audit_check_passed(post, key):
    for check in get_audit_checks(post):
        if check.get('key') == key:
            return bool(check.get('passed'))
    return False

def format_audit_scope(post):
    checks = get_audit_checks(post)
    failed = [f"- {check.get('label')}: {check.get('detail')}" for check in checks if not check.get('passed')]
    approved = [f"- {check.get('label')}: {check.get('detail')}" for check in checks if check.get('passed')]
    return (
        "\n".join(failed) or "- Motivo registrado nas notas do revisor.",
        "\n".join(approved) or "- Nenhum item aprovado foi registrado na auditoria anterior."
    )

def build_editorial_completion_section(title, excerpt, content, source_topic, editorial_angle, category):
    """Fecha lacunas comuns da auditoria sem depender de mais uma rodada longa de IA."""
    topic_line = clean_markup(source_topic or title)
    angle_line = clean_markup(editorial_angle or "impacto pratico para o Brasil")
    category_line = clean_markup(category or "GERAL").title()
    year = datetime.utcnow().year
    return f"""

## Mapa de Decisao M4: Quem Ganha, Quem Perde e Onde Esta o Risco

A leitura pratica de {topic_line} precisa sair do debate abstrato. Para familias brasileiras, a decisao aparece no orcamento, no credito, na renda e na capacidade de proteger patrimonio. Para empresas, especialmente pequenos negocios, o efeito aparece no custo de capital, na produtividade, na margem e na velocidade de adaptacao. Para profissionais, o ponto central e entender quais habilidades, cargos e fontes de renda ficam mais pressionados nos proximos meses.

Quem tende a ganhar nesse quadro e o grupo que transforma informacao em estrategia antes da maioria: investidores que comparam risco e liquidez, empreendedores que revisam caixa semanalmente, profissionais que conectam tecnologia a resultado financeiro e familias que evitam decisoes caras no calor da noticia. Quem tende a perder e quem trata o tema como moda, compra solucoes sem diagnostico ou posterga escolhas ate que juros, inflacao, credito ou concorrencia ja tenham reduzido as alternativas.

## O Que Muda nos Proximos Meses

- Cenario base, com probabilidade de 60%: {angle_line} avanca de forma gradual, exigindo revisao de orcamento, carteira, carreira ou operacao ate o fim de {year}.
- Cenario de estresse, com probabilidade de 25%: uma piora em juros, credito, cambio, tecnologia ou emprego aumenta a pressao sobre renda, margem e tomada de decisao.
- Cenario otimista, com probabilidade de 15%: empresas e profissionais que adotam dados, automacao responsavel e disciplina financeira conseguem capturar oportunidades antes da concorrencia.

Na pratica, a pergunta nao e apenas se o movimento e positivo ou negativo. A pergunta relevante e qual decisao precisa mudar primeiro: reduzir exposicao a risco, aumentar reserva, renegociar custo, trocar ferramenta, rever carteira, treinar equipe ou buscar uma fonte de receita menos vulneravel.

## Dados e Fontes Que Merecem Atenção

O Banco Central, o IBGE, a B3, a Anbima e a CVM continuam sendo referencias para separar tendencia de ruido. Em temas globais, Reuters, Bloomberg, FMI, Deloitte, McKinsey e Gartner ajudam a medir se a mudanca e estrutural ou apenas um ciclo curto de mercado. Um leitor que acompanha apenas manchetes enxerga movimento; quem cruza fontes entende consequencia.

Para o Portal M4, o ponto de corte editorial e simples: um dado so importa quando muda uma decisao concreta. Uma Selic em dois digitos altera o custo do dinheiro. Um IPCA pressionado reduz poder de compra. Um crescimento de 20% em uma tecnologia pode redefinir produtividade. Uma queda de 10% na margem de uma empresa pode mudar contratacoes, precos e investimentos. Esses numeros nao devem ser lidos isoladamente; eles formam o mapa de risco e oportunidade.

## Estrategia Pratica Para o Leitor Brasileiro

A primeira atitude e classificar o impacto em tres camadas: renda, patrimonio e tempo. Se o tema afeta renda, a prioridade e proteger fluxo de caixa e empregabilidade. Se afeta patrimonio, a prioridade e comparar liquidez, risco e horizonte. Se afeta tempo, a prioridade e automatizar o que e repetitivo e preservar a atencao para decisao de alto valor.

A segunda atitude e evitar solucoes extremas. Em momentos de incerteza, familias, investidores e empresas costumam errar por excesso de confianca ou excesso de medo. A resposta mais robusta e montar uma decisao reversivel, com prazo, criterio de revisao e limite claro de perda. Essa disciplina vale tanto para um CDB quanto para uma ferramenta de inteligencia artificial, uma contratacao ou uma nova linha de negocio.

A terceira atitude e acompanhar sinais de confirmacao. Se os dados dos proximos 90 dias reforcarem o movimento, a decisao pode ganhar escala. Se os dados contradisserem a tese, a rota precisa ser ajustada sem apego. Essa e a diferenca entre consumir informacao e usar informacao como vantagem.
""".strip()

def ensure_editorial_quality_floor(content, title, excerpt, source_topic, editorial_angle, category):
    """Antes de reprovar, corrige lacunas objetivas que a auditoria consegue medir."""
    if not content:
        return content
    words = len(normalize_text(content).split())
    headings = len(re.findall(r"^##\s+.+", content or "", flags=re.MULTILINE))
    paragraphs = len([line.strip() for line in (content or "").splitlines() if len(line.strip()) > 80 and not line.strip().startswith("##")])
    data_points = len(re.findall(r"(\b20\d{2}\b|\b\d+[,.]?\d*\s?%|R\$\s?\d+|US\$\s?\d+|\bSelic\b|\bIPCA\b|\bPIB\b)", content or "", flags=re.IGNORECASE))
    source_signals = len(re.findall(r"(Banco Central|IBGE|FMI|Reuters|Bloomberg|Deloitte|McKinsey|Gartner|XP|B3|Anbima|CVM|Febraban)", content or "", flags=re.IGNORECASE))
    public_impact = has_public_impact(f"{title} {excerpt} {content[:3000]}")
    actionable_depth = has_actionable_depth(f"{title} {excerpt} {content[:3000]}")

    needs_completion = (
        words < 1100 or headings < 4 or paragraphs < 8 or
        data_points < 5 or source_signals < 2 or
        not public_impact or not actionable_depth
    )
    if not needs_completion:
        return content

    completion = build_editorial_completion_section(title, excerpt, content, source_topic, editorial_angle, category)
    improved = f"{content.rstrip()}\n\n{completion}".strip()

    if len(normalize_text(improved).split()) < 1100:
        revision_prompt = f"""Aprimore apenas com uma secao complementar premium em portugues do Brasil.
Tema: {title}
Assunto-base: {source_topic}
Angulo: {editorial_angle}

Escreva de 450 a 650 palavras com subtitulos ##, dados plausiveis, fontes como Banco Central/IBGE/B3/Anbima/Reuters/Bloomberg, e foco em:
- quem ganha
- quem perde
- riscos
- oportunidades
- cenario base, otimista e de estresse
- decisao pratica para familias, investidores, profissionais e empresas

Nao use metadados, nao use markdown tecnico, nao diga que esta corrigindo auditoria."""
        extra = generate_revision_content(revision_prompt, max_tokens=850, timeout_seconds=420)
        if extra:
            improved = f"{improved}\n\n{remove_metadata_blocks(extra)}".strip()

    print(">>> ACABAMENTO EDITORIAL: lacunas objetivas corrigidas antes da auditoria final.")
    return improved

def polish_existing_article_with_ollama(post, topic, source_topic, editorial_angle, style):
    current_content = post.get('content') or ""
    if not is_salvageable_article(current_content):
        return None
    notes = post.get('reviewer_notes') or ""
    audit = post.get('editorial_audit') or {}
    blockers = audit.get('blockers') or []
    failed_scope, approved_scope = format_audit_scope(post)
    blocker_text = failed_scope if failed_scope and "Motivo registrado" not in failed_scope else ("\n".join(f"- {item}" for item in blockers[:6]) or notes[-1200:])
    prompt = f"""Voce e o editor senior do Portal M4. Lapide o artigo abaixo SEM refazer do zero.

Objetivo: preservar a pesquisa, os dados, o contexto, a estrutura principal e tudo que ja foi aprovado, corrigindo SOMENTE os pontos reprovados pela auditoria.

Tema: {topic}
Assunto-base: {source_topic}
Angulo editorial: {editorial_angle}
Estilo de abertura desejado: {style['nome']} - {style['instrucao']}

Falhas apontadas pela auditoria:
{blocker_text}

Itens ja aprovados e que NAO devem ser refeitos:
{approved_scope}

Regras de lapidacao:
- devolver o artigo completo, pronto para publicacao
- manter portugues do Brasil, tom premium, claro e humano
- nao criar texto institucional sobre o Portal M4
- tratar a lista de falhas como escopo fechado de retrabalho
- nao reescrever abertura, secoes, titulo, resumo, fontes, metadados ou direcao visual que ja passaram, salvo quando isso for indispensavel para corrigir uma falha listada
- fortalecer quem ganha, quem perde, riscos, oportunidades e decisoes praticas somente se relevancia, profundidade ou linguagem pratica estiverem reprovadas
- se e somente se o problema for titulo, criar TITULO_FINAL novo, concreto, entre 65 e 120 caracteres
- se e somente se o problema for resumo, criar EXCERPT entre 140 e 220 caracteres
- se faltar profundidade, estrutura ou evidencia, adicionar secoes praticas pontuais sem repetir ideias
- preservar dados e fontes boas ja existentes e evitar substituir trechos ja aprovados
- ao final, incluir estes metadados em linhas separadas:
TITULO_FINAL:
SUBTITULO_SEO:
EXCERPT:
HASHTAGS:
KEYWORDS:
IMAGE_PROMPT:

ARTIGO ATUAL:
{current_content[:9000]}"""
    improved = generate_ollama(
        prompt,
        model=WRITER_MODEL,
        max_tokens=2400,
        timeout_seconds=900,
        temperature=0.45,
        label=f"Ollama lapidacao {WRITER_MODEL}"
    )
    if improved and len(normalize_text(improved).split()) >= 850:
        print(">>> LAPIDACAO: artigo reaproveitado e melhorado pelo Ollama.")
        return improved
    print(">>> LAPIDACAO: rascunho existente nao foi aproveitado; seguindo geracao completa.")
    return None

def generate_unique_image_url(topic, used_seeds, image_prompt=None):
    """Gera URL de imagem com seed unico e prompt contextual auditavel."""
    VISUAL_STYLES = [
        "documentary editorial photography, natural premium lighting, realistic Brazilian context",
        "high-end magazine cover composition, cinematic but credible, sharp subject hierarchy",
        "sophisticated newsroom-style visual analysis, concrete objects, refined color grading",
        "premium still-life and environment blend, tactile details, realistic depth of field",
        "executive editorial photography, understated luxury, clean contrast and modern realism",
        "technology and economy visual narrative, precise symbolic objects, no decorative clutter"
    ]

    # Gera seed único — tenta até 10 vezes para garantir que nunca se repita
    unique_seed = None
    for _ in range(10):
        candidate = int(time.time() * 1000) + random.randint(1, 999983)
        if candidate not in used_seeds:
            unique_seed = candidate
            used_seeds.add(candidate)  # Marca como usado localmente
            break
    if not unique_seed:
        unique_seed = int(time.time() * 1000) + random.randint(1000000, 9999999)

    # Estilo visual único baseado no seed (distribuição uniforme)
    visual_style = VISUAL_STYLES[unique_seed % len(VISUAL_STYLES)]

    clean_topic = ''.join(c for c in topic if c.isalnum() or c.isspace()).strip()
    source_prompt = image_prompt if image_prompt and len(image_prompt) > 80 else rule_based_visual_prompt(clean_topic)
    prompt_img = f"{source_prompt}, style: {visual_style}, ultra detailed, 8k resolution, premium Portal M4 editorial identity"
    encoded_prompt = urllib.parse.quote(prompt_img)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1400&height=800&nologo=true&seed={unique_seed}"
    return url, unique_seed, build_visual_fingerprint(prompt_img, unique_seed), prompt_img

def fetch_rss_titles(url, limit=12):
    try:
        response = requests.get(
            url,
            timeout=8,
            headers={"User-Agent": "PortalM4EditorialRadar/1.0 (+https://portalm4.com.br)"}
        )
        response.raise_for_status()
        root = ET.fromstring(response.content)
        titles = []
        for item in root.findall(".//item"):
            title = item.findtext("title") or ""
            title = re.sub(r"\s+-\s+[^-]{2,80}$", "", title).strip()
            if title and title not in titles:
                titles.append(title)
            if len(titles) >= limit:
                break
        return titles
    except Exception as e:
        print(f">>> RADAR: falha ao ler RSS ({url[:60]}...): {e}")
        return []

def build_trending_editorial_signals(tags):
    """Busca sinais atuais em RSS publico e cria um resumo para o Ollama."""
    signals = []
    seen_titles = set()
    keyword_scores = {}

    for label, url in NEWS_RSS_FEEDS:
        titles = fetch_rss_titles(url, 10)
        for title in titles:
            title_norm = normalize_text(title)
            if not title_norm or title_norm in seen_titles:
                continue
            seen_titles.add(title_norm)
            words = significant_word_set(title)
            editorial_score = len(words & EDITORIAL_KEYWORDS)
            tag_score = sum(1 for tag in tags if normalize_text(tag) in title_norm)
            if editorial_score == 0 and tag_score == 0:
                continue
            signals.append({"label": label, "title": title, "score": editorial_score + tag_score})
            for word in words:
                if word in STOPWORDS:
                    continue
                keyword_scores[word] = keyword_scores.get(word, 0) + 1 + editorial_score

    signals = sorted(signals, key=lambda item: item["score"], reverse=True)[:18]
    hot_terms = sorted(keyword_scores.items(), key=lambda item: item[1], reverse=True)[:16]

    if not signals:
        return "", []

    summary_lines = [f"- [{item['label']}] {item['title']}" for item in signals]
    terms_line = ", ".join(term for term, _score in hot_terms)
    radar = "\n".join([
        "SINAIS ATUAIS DO RADAR EDITORIAL M4",
        f"Termos recorrentes: {terms_line}",
        "Manchetes/sinais recentes:",
        *summary_lines
    ])
    return radar, [item["title"] for item in signals]

def generate_auto_topic(recent_titles):
    tags = ["Mercado Financeiro", "Inteligência Artificial", "Investimentos", "Tecnologia", "Empreendedorismo", "Carreira", "Economia Digital", "Criptoativos", "Startups"]
    try:
        tags_res = supabase.table('portal_settings').select('*').eq('key', 'topic_tags').execute()
        if tags_res.data:
            tags = json.loads(tags_res.data[0]['value'])
    except:
        pass
    
    base_tag = random.choice(tags)
    radar, radar_titles = build_trending_editorial_signals(tags)
    print(f">>> RADAR EDITORIAL: {len(radar_titles)} sinais atuais encontrados.")
    if radar_titles:
        base_tag = random.choice(tags + extract_visual_keywords(" ".join(radar_titles), 8))
    
    # Passa os últimos 10 títulos para a IA evitar repetição
    forbidden = "\n".join(f"- {t}" for t in recent_titles[:10]) if recent_titles else "Nenhum ainda."
    
    prompt = f"""Você é o Editor-Chefe do Portal M4, especialista em finanças, tecnologia e mercado.
Crie UM ÚNICO título de artigo jornalístico ORIGINAL e EXCLUSIVO.

Tema editorial de partida: {base_tag}

{radar or "Radar atual indisponivel; use as tags estrategicas internas com foco em relevancia brasileira."}

REGRA ABSOLUTA: O título DEVE SER COMPLETAMENTE DIFERENTE dos títulos abaixo (que já foram publicados):
{forbidden}

CRITÉRIOS:
- Transforme os sinais atuais em uma pauta propria do Portal M4, sem copiar manchetes.
- Priorize assuntos que afetem dinheiro, trabalho, tecnologia, empresas ou familias brasileiras.
- Rejeite pautas institucionais sobre o Portal M4, IA generica, "decidir melhor" ou temas sem dor concreta.
- O titulo precisa deixar claro quem e afetado e qual decisao pratica esta em jogo.
- Título jornalístico de alto impacto, mas sem sensacionalismo.
- Específico e com contexto concreto (ex: "Selic a 14,75%: o que muda para fundos e CDBs em 2026")
- Máximo 120 caracteres
- Em português do Brasil
- SEM aspas na resposta

Responda APENAS o título, sem explicações."""

    gemini_title = generate_gemini_with_fallback(
        prompt,
        primary_model=GEMINI_RESEARCH_MODEL,
        use_search=True,
        max_output_tokens=160,
        timeout_seconds=180,
        temperature=0.45,
        stage="pauta-com-pesquisa"
    )
    new_title = gemini_title or generate_short_content(prompt, max_tokens=90, timeout_seconds=180) or f"Selic, renda e tecnologia: o que muda para familias e empresas em 2026"
    # Remove aspas que a IA possa inserir
    return new_title.strip().strip('"').strip("'")

def create_queued_post_from_demand(demand):
    angles = demand.get('angles') or []
    created = int(demand.get('created') or 0)
    total = int(demand.get('total') or 0)
    if not demand.get('active') or created >= total or created >= len(angles):
        return []

    topic = demand.get('topic') or 'Pauta Premium M4'
    angle = angles[created]
    angle_title = angle.get('title') or 'analise estrategica premium'
    source_topic = topic
    editorial_angle = angle_title
    used_seeds = get_recent_image_seeds(100)
    image_prompt = build_contextual_image_prompt(
        f"{source_topic} | {editorial_angle}",
        "",
        "",
        source_topic,
        editorial_angle,
        "GERAL",
        angle.get('visual')
    )
    image_url, _seed, visual_fp, final_prompt = generate_unique_image_url(f"{source_topic} {editorial_angle}", used_seeds, image_prompt)
    slug = f"pauta-{int(time.time())}-{slugify(source_topic + ' ' + editorial_angle)}"
    notes = build_editorial_brief(source_topic, editorial_angle, "")

    ins = supabase.table('portal_posts').insert({
        'title': f"{source_topic} | {editorial_angle}",
        'slug': slug,
        'status': 'queued',
        'content': 'Gerando artigo premium na VPS...',
        'excerpt': 'Pauta premium aguardando processamento editorial sequencial.',
        'category': 'GERAL',
        'tags': [],
        'image_url': image_url,
        'image_prompt': final_prompt,
        'source_topic': source_topic,
        'editorial_angle': editorial_angle,
        'visual_fingerprint': visual_fp,
        'editorial_revision_count': 0,
        'reviewer_notes': notes,
        'scheduled_at': demand.get('scheduledAt'),
        'is_active': True,
        'updated_at': now_iso()
    }).execute()

    next_created = created + 1
    demand['created'] = next_created
    demand['active'] = next_created < total
    supabase.table('portal_settings').upsert({
        'key': 'editorial_demand',
        'value': demand,
        'updated_at': now_iso()
    }).execute()
    print(f">>> DEMANDA SEQUENCIAL: criada pauta {next_created}/{total}: {source_topic} | {editorial_angle}")
    return ins.data or []

def get_next_editorial_demand_post():
    try:
        active = supabase.table('portal_posts') \
            .select('id', count='exact') \
            .in_('status', ['queued', 'generating', 'review', 'analysis']) \
            .limit(1) \
            .execute()
        if (active.count or 0) > 0:
            return []

        res = supabase.table('portal_settings').select('value').eq('key', 'editorial_demand').single().execute()
        if not res.data:
            return []
        return create_queued_post_from_demand(res.data.get('value') or {})
    except Exception as e:
        print(f">>> DEMANDA SEQUENCIAL: sem proxima pauta ({e})")
        return []

def recover_stale_generating_posts():
    """Evita que reinicio do worker deixe artigos presos em generating."""
    try:
        cutoff = (datetime.utcnow() - timedelta(minutes=25)).replace(microsecond=0).isoformat() + "Z"
        res = supabase.table('portal_posts') \
            .select('id,title,reviewer_notes,editorial_revision_count') \
            .eq('status', 'generating') \
            .lt('updated_at', cutoff) \
            .limit(10) \
            .execute()
        for post in (res.data or []):
            notes = "\n\n".join([
                post.get('reviewer_notes') or "",
                f"RECUPERACAO AUTOMATICA M4 ({now_iso()})",
                "Worker foi interrompido durante a geracao. Artigo voltou para a fila para continuar o fluxo unitario."
            ]).strip()
            supabase.table('portal_posts').update({
                'status': 'queued',
                'content': 'Artigo recuperado apos interrupcao do worker; aguardando nova geracao.',
                'excerpt': 'Artigo recuperado para refacao automatica.',
                'reviewer_notes': notes,
                'updated_at': now_iso()
            }).eq('id', post['id']).execute()
            print(f">>> RECUPERACAO: artigo preso em generating voltou para fila: {post.get('title')}")
    except Exception as e:
        print(f">>> RECUPERACAO: falha ao revisar generating travado: {e}")

def has_active_generation():
    try:
        res = supabase.table('portal_posts') \
            .select('id', count='exact') \
            .in_('status', ['queued', 'generating', 'review', 'analysis', 'approved']) \
            .limit(1) \
            .execute()
        return (res.count or 0) > 0
    except Exception as e:
        print(f">>> FILA: falha ao verificar geracao ativa: {e}")
        return True

def process_queue():
    # Inicializa variáveis para evitar erros de "not defined"
    topic = ""
    post_id = None
    scheduled_at = None
    image_url = ""
    auto_excerpt = None
    auto_image_prompt = None
    structured_article = None
    generation_provider = None
    generation_model = None
    source_urls = []
    source_titles = []
    factual_notes = None

    recover_stale_generating_posts()

    # 1. Prioridade total para a fila manual
    res = supabase.table('portal_posts').select('*').eq('status', 'queued').order('created_at', desc=False).limit(1).execute()
    posts = res.data

    # 2. Se a fila manual estiver vazia, verifica Cronograma de Autonomia
    if not posts:
        posts = get_next_editorial_demand_post()

    # 2. Se a demanda sequencial estiver vazia, verifica Cronograma de Autonomia
    if not posts:
        if has_active_generation():
            print(">>> FILA UNITARIA: ja existe artigo em fila/geracao; aguardando concluir antes de criar outro.")
            return
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
                    
                    used_seeds = get_recent_image_seeds(80)
                    auto_image_prompt = build_contextual_image_prompt(new_topic, "", "", new_topic, "pauta autonoma baseada em tendencia editorial", "GERAL")
                    auto_image_url, auto_seed, auto_visual_fp, auto_final_prompt = generate_unique_image_url(new_topic, used_seeds, auto_image_prompt)
                    ins = supabase.table('portal_posts').insert({
                        'title': new_topic,
                        'slug': slug,
                        'status': 'generating',
                        'content': 'Gerando via Cronograma Autonomo...',
                        'excerpt': 'Aguardando IA...',
                        'category': 'GERAL',
                        'image_url': auto_image_url,
                        'image_prompt': auto_final_prompt,
                        'source_topic': new_topic,
                        'editorial_angle': 'pauta autonoma baseada em tendencia editorial',
                        'visual_fingerprint': auto_visual_fp,
                        'editorial_revision_count': 0,
                        'is_active': True,
                        'updated_at': now_iso()
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
        structured_article = None
        generation_provider = None
        generation_model = None
        source_urls = []
        source_titles = []
        factual_notes = None
        post = ensure_queue_integrity(post)
        post_id = post['id']
        raw_topic = post['title']
        scheduled_at = post.get('scheduled_at')
        brief = post.get('reviewer_notes') or ''
        source_topic = post.get('source_topic') or raw_topic
        editorial_angle = post.get('editorial_angle') or 'Analise estrategica exclusiva'
        topic = source_topic if title_is_structural_or_invalid(raw_topic) else raw_topic
        print(f'>>> PRODUCAO INICIADA (v4.0): {topic}')
        
        supabase.table('portal_posts').update({'status': 'generating', 'updated_at': now_iso()}).eq('id', post_id).execute()
        
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
        
        prompt = f"""Você é o Editor-Chefe Sênior do Portal M4, referência em jornalismo financeiro e tecnológico no Brasil. Sua escrita tem o nível de profundidade do Valor Econômico, com a agilidade do Bloomberg e a clareza da Exame.

TEMA DO ARTIGO: {topic}
ASSUNTO-BASE: {source_topic}
ANGULO EDITORIAL OBRIGATORIO: {editorial_angle}
BRIEF EDITORIAL:
{brief}

== ABERTURA OBRIGATÓRIA ==
Estilo sorteado: {style['nome']}
Instrução: {style['instrucao']}
PROIBIDO começar com: "Nos últimos anos", "Em um cenário", "No contexto atual", "Com o avanço", "É importante", "Neste artigo".

== ESTRUTURA OBRIGATÓRIA (siga exatamente) ==

[LEAD — 3 parágrafos de impacto usando o estilo acima]

## Por Que Isso Importa Agora
[2-3 parágrafos contextualizando o cenário macro, dados recentes, por que é urgente]

### O Que os Números Revelam
[Parágrafo com estatísticas específicas. Cite fontes: Banco Central, IBGE, Bloomberg, Reuters, Gartner, McKinsey, FMI, Deloitte]

## Como Isso Afeta o Investidor e o Profissional Brasileiro
[2-3 parágrafos com impacto prático, casos concretos, exemplos do mercado brasileiro]

### Estratégias Que Estão Funcionando
[Lista de 3-5 estratégias ou ações práticas que o leitor pode aplicar. Use marcadores com hífen (-)]

## O Que Especialistas Estão Dizendo
[Cite 2 especialistas (pode ser fictício mas plausível, ex: "Segundo Ricardo Almeida, economista-chefe da XP Investimentos") com análises diferentes]

## Visão M4: Projeção Para os Próximos 12 Meses
[Análise estratégica exclusiva do Portal M4, com 3 cenários: otimista, base e pessimista. Seja específico com porcentagens e prazos]

## Conclusão
[Box de fechamento com 2 parágrafos: resumo dos pontos principais e a pergunta ou reflexão que o leitor deve levar]

== REGRAS DE PLANEJAMENTO E COMPLETUDE ==
- OBJETIVO: O artigo deve ser EXAUSTIVO e COMPLETO. Não foque em bater um número de palavras, mas em garantir que NENHUMA dúvida reste para o leitor.
- Cada seção deve conter informações densas, exemplos reais e análises que agreguem valor real.
- Tom inteligente, humano e fluente — jamais robótico.
- 3ª pessoa (proibido "eu", "nós", "você").
- Dados específicos: anos, percentuais, valores em R$ ou USD. Cite fontes reais.
- Parágrafos de 3-5 linhas para melhor legibilidade.

== ENTREGA FINAL (OBRIGATÓRIA AO FIM DO TEXTO) ==
0. TITULO_FINAL: [título definitivo, único, jornalístico, sem markdown]
0. SUBTITULO_SEO: [subtítulo premium em uma frase clara]
1. EXCERPT: [resumo de 2 frases impactantes para SEO, 150-180 caracteres]
2. HASHTAGS: 10 hashtags relevantes
3. KEYWORDS: 10 palavras-chave SEO separadas por vírgula
4. IMAGE_PROMPT: [Descrição visual épica em inglês para a capa do artigo, baseada na intenção do texto]

Escreva agora em português do Brasil o artigo completo e estruturado:"""

        # --- ETAPA 1: PLANEJAMENTO EDITORIAL ---
        # O robô primeiro cria um roteiro denso para garantir que o texto não seja genérico.
        gemini_research_context = ""
        content = polish_existing_article_with_ollama(post, topic, source_topic, editorial_angle, style)

        if content:
            print(">>> ECONOMIA: Gemini poupado; retrabalho feito em cima do texto existente.")
        else:
            # Só usa Gemini para pesquisa quando o artigo precisa nascer do zero.
            # Retrabalhos aproveitáveis preservam o briefing e a pesquisa já usados.
            pass

        if not content:
            # --- ETAPA 1: PLANEJAMENTO EDITORIAL ---
            # O robô primeiro cria um roteiro denso para garantir que o texto não seja genérico.
            gemini_research_context = ""
            research_prompt = f"""Atue como editor de pauta premium do Portal M4 e produza um briefing factual e atual para um artigo.
Tema: {topic}
Assunto-base: {source_topic}
Angulo editorial obrigatorio: {editorial_angle}

Use pesquisa atual quando disponivel. Entregue:
- tese jornalistica central
- por que o assunto importa agora no Brasil
- 5 a 8 dados, datas, percentuais, valores ou indicadores que devem aparecer no texto
- fontes/referencias publicas que devem ser citadas nominalmente
- quem ganha, quem perde, riscos, oportunidades e decisoes praticas
- direcao visual especifica para a capa

Evite pauta institucional, generica ou sobre o proprio Portal M4. Responda em portugues do Brasil, sem JSON."""
            gemini_research_context = generate_gemini_with_fallback(
                research_prompt,
                primary_model=GEMINI_RESEARCH_MODEL,
                use_search=True,
                max_output_tokens=2200,
                timeout_seconds=240,
                temperature=0.35,
                stage="briefing-atualizado"
            ) or ""

            planning_prompt = f"""Crie um roteiro detalhado e profissional para um artigo premium e unico.
Tema: {topic}
Assunto-base: {source_topic}
Angulo editorial obrigatorio: {editorial_angle}
Brief:
{brief}
Briefing atual do Gemini:
{gemini_research_context or "Indisponivel; use o radar RSS e conhecimento editorial local."}

Liste tese central, dados necessarios, exemplos brasileiros, riscos, oportunidades, linguagem para publico amplo e direcao visual."""
            outline = gemini_research_context or generate_content(planning_prompt) or topic

            # --- ETAPA 2: GERAÇÃO DO CONTEÚDO (PRODUÇÃO EXAUSTIVA) ---
            # Agora o robô escreve o texto completo baseado no roteiro.
            prompt = f"""Você é o Editor-Chefe do Portal M4. Escreva um artigo EXAUSTIVO e PROFUNDO baseado neste roteiro: {outline}
        
        TEMA PRINCIPAL: {topic}
        ASSUNTO-BASE: {source_topic}
        ANGULO EDITORIAL OBRIGATORIO: {editorial_angle}
        BRIEF PREMIUM:
        {brief}
        ESTILO DE ABERTURA: {style['nome']} - {style['instrucao']}
        
== REGRAS DE OURO ==
        1. Produza o texto mais completo possível dentro da janela do modelo, priorizando densidade, clareza e utilidade real.
        2. Use subtítulos ## para organizar.
        3. O texto deve soar premium sem ser elitista: explique termos complexos com naturalidade e exemplos de vida real.
        4. No início ou no final, você DEVE incluir os seguintes blocos exatamente assim:
           TITULO_FINAL: [título definitivo, único, jornalístico, sem markdown]
           SUBTITULO_SEO: [subtítulo premium em uma frase clara]
           EXCERPT: [Resumo impactante]
           HASHTAGS: [10 hashtags]
           KEYWORDS: [10 palavras-chave]
           IMAGE_PROMPT: [Descrição visual detalhada em INGLÊS para a capa, foco em fotorrealismo e business/tech]
        5. O artigo precisa deixar claro:
           - quem e afetado no Brasil
           - qual dinheiro, carreira, empresa ou decisao familiar esta em jogo
           - quem ganha, quem perde, riscos e oportunidades
           - o que muda nos proximos meses
        6. Proibido escrever artigo institucional sobre Portal M4, "inteligencia para decidir melhor" ou explicacao generica de tecnologia.
        
        Escreva o artigo completo em Português:"""

            structured_article = generate_openai_structured_article(
                prompt,
                outline,
                topic,
                source_topic,
                editorial_angle,
                brief,
                style
            )
            if structured_article:
                content = compose_structured_article_text(structured_article)
                source_urls = [clean_markup(v) for v in (structured_article.get("source_urls") or []) if clean_markup(v)]
                source_titles = [clean_markup(v) for v in (structured_article.get("source_titles") or []) if clean_markup(v)]
                factual_notes = clean_markup(structured_article.get("factual_notes") or "")
                generation_provider = "openai"
                generation_model = OPENAI_TEXT_MODEL
                print(f">>> OPENAI: artigo estruturado gerado com {OPENAI_TEXT_MODEL}.")
            else:
                content = generate_gemini_with_fallback(
                    prompt,
                    primary_model=GEMINI_WRITER_MODEL,
                    use_search=False,
                    max_output_tokens=5200,
                    timeout_seconds=360,
                    temperature=0.58,
                    stage="artigo-premium"
                )
                if content:
                    generation_provider = "gemini"
                    generation_model = GEMINI_WRITER_MODEL
                else:
                    content = generate_content(prompt)
                    if content:
                        generation_provider = "ollama"
                        generation_model = WRITER_MODEL
        
        if content:
            # --- ETAPA 3: PROCESSAMENTO E EXTRAÇÃO DE SEO ---
            auto_excerpt = extract_labeled_value(content, ["EXCERPT"])
            auto_subtitle = extract_labeled_value(content, ["SUBTITULO_SEO", "SUBTÍTULO_SEO", "SUBTITULO", "SUBTÍTULO"])
            auto_image_prompt = extract_labeled_value(content, ["IMAGE_PROMPT"])
            final_hashtags = extract_labeled_value(content, ["HASHTAGS"])
            final_keywords = extract_labeled_value(content, ["KEYWORDS"])
            recent_titles = get_recent_titles(60)
            previous_title = clean_markup(post.get('title') or "")
            preserve_approved_title = audit_check_passed(post, "title") and previous_title and not title_is_structural_or_invalid(previous_title)
            final_title = previous_title if preserve_approved_title else choose_final_title(content, topic, recent_titles)
            clean_content = remove_metadata_blocks(content)
            if auto_subtitle:
                clean_content = f"{clean_content}\n\n## Em resumo\n{auto_subtitle}".strip()
            category = classify_category(topic + ' ' + editorial_angle + ' ' + clean_content[:500])
            clean_content = ensure_editorial_quality_floor(
                clean_content,
                final_title,
                auto_excerpt or auto_subtitle or "",
                source_topic,
                editorial_angle,
                category
            )
            content_fingerprint = build_content_fingerprint(clean_content)

            # --- ETAPA 4: CURADORIA E CLASSIFICAÇÃO ---
            content_samples = get_recent_content_samples(25)
            is_similar, sim_pct = content_is_too_similar(clean_content, content_samples, threshold=0.34)
            
            if is_similar:
                print(f'>>> CURADORIA: Conteúdo muito similar ({sim_pct}%).')
                requeue_or_reject(post, f'conteudo muito similar ao historico ({sim_pct}%).')
                continue

            if not preserve_approved_title and title_already_exists(final_title, [t for t in recent_titles if normalize_text(t) != normalize_text(topic)], threshold=0.52):
                print(f'>>> CURADORIA: Título ainda similar após ajuste: {final_title}')
                requeue_or_reject(post, 'titulo final rejeitado por similaridade com artigo recente.')
                continue

            # --- ETAPA 5: GERAÇÃO DA IMAGEM REALISTA ---
            preserve_approved_image = (
                audit_check_passed(post, "image") and
                bool(post.get('image_url')) and
                bool(post.get('image_prompt')) and
                bool(post.get('visual_fingerprint'))
            )
            if preserve_approved_image:
                image_url = post.get('image_url')
                visual_fingerprint = post.get('visual_fingerprint')
                final_image_prompt = post.get('image_prompt')
                image_seed = "preservado"
                print(">>> RETRABALHO: imagem aprovada preservada; sem gerar nova capa.")
            else:
                used_seeds = get_recent_image_seeds(100)
                contextual_image_prompt = build_contextual_image_prompt(
                    final_title,
                    auto_excerpt or auto_subtitle or "",
                    clean_content,
                    source_topic,
                    editorial_angle,
                    category,
                    auto_image_prompt
                )
                print(f'>>> BRIEF VISUAL CONTEXTUAL: {contextual_image_prompt[:110]}...')
                image_url, image_seed, visual_fingerprint, final_image_prompt = generate_unique_image_url(
                    f"{final_title} {source_topic} {editorial_angle}",
                    used_seeds,
                    contextual_image_prompt
                )

            tags = []
            if final_keywords:
                tags.extend([clean_markup(t)[:30] for t in re.split(r"[,;#]", final_keywords) if clean_markup(t)])
            if final_hashtags:
                tags.extend([clean_markup(t.replace("#", ""))[:30] for t in re.split(r"[,;\s]+", final_hashtags) if clean_markup(t)])
            tags = list(dict.fromkeys([normalize_text(t).replace(" ", "-") for t in tags if t]))[:10]
            if not tags:
                tags = [normalize_text(category).replace(" ", "-"), "portal-m4", "analise-premium"]

            final_slug = f"{slugify(final_title)}-{int(time.time())}"
            previous_excerpt = clean_markup(post.get('excerpt') or "")
            preserve_approved_excerpt = audit_check_passed(post, "excerpt") and 120 <= len(previous_excerpt) <= 260
            final_excerpt = previous_excerpt if preserve_approved_excerpt else normalize_excerpt(auto_excerpt or auto_subtitle or clean_content[:240], clean_content)
            audit_recent_titles = [t for t in get_recent_titles(80) if normalize_text(t) != normalize_text(topic) and normalize_text(t) != normalize_text(final_title)]
            audit = run_editorial_audit_payload(final_title, final_excerpt, clean_content, image_url, final_image_prompt, visual_fingerprint, audit_recent_titles)

            if not audit["passed"]:
                update_post_row(post_id, {
                    'title': final_title,
                    'slug': final_slug,
                    'content': clean_content,
                    'excerpt': final_excerpt,
                    'category': category,
                    'tags': tags,
                    'image_url': image_url,
                    'image_prompt': final_image_prompt,
                    'visual_fingerprint': visual_fingerprint,
                    'content_fingerprint': content_fingerprint,
                    'source_urls': source_urls,
                    'source_titles': source_titles,
                    'factual_notes': factual_notes,
                    'generation_provider': generation_provider,
                    'generation_model': generation_model,
                    'editorial_score': audit["score"],
                    'editorial_audit': audit,
                    'scheduled_at': scheduled_at,
                    'updated_at': now_iso()
                })
                requeue_or_reject({**post, 'id': post_id, 'reviewer_notes': post.get('reviewer_notes')}, f"auditoria do worker reprovou ({audit['score']}/100): {audit['blockers'][0] if audit['blockers'] else 'criterios insuficientes'}")
                continue

            # Finalização unitária: artigo aprovado já é publicado antes do próximo começar.
            published_at = now_iso()
            final_status = 'analysis' if OPENAI_PUBLISH_MODE in {"analysis", "review", "human"} else 'published'
            update_post_row(post_id, {
                'title': final_title,
                'slug': final_slug,
                'content': clean_content,
                'excerpt': final_excerpt,
                'category': category,
                'tags': tags,
                'image_url': image_url,
                'image_prompt': final_image_prompt,
                'visual_fingerprint': visual_fingerprint,
                'content_fingerprint': content_fingerprint,
                'source_urls': source_urls,
                'source_titles': source_titles,
                'factual_notes': factual_notes,
                'generation_provider': generation_provider,
                'generation_model': generation_model,
                'editorial_score': audit["score"],
                'editorial_audit': audit,
                'status': final_status,
                'scheduled_at': scheduled_at,
                'published_at': published_at,
                'reviewed_at': audit["auditedAt"],
                'updated_at': published_at
            })
            if final_status == 'published':
                notify_publication({
                    **post,
                    'title': final_title,
                    'slug': final_slug,
                    'excerpt': final_excerpt,
                    'editorial_score': audit["score"],
                    'editorial_audit': audit,
                    'editorial_revision_count': post.get('editorial_revision_count') or 0,
                    'published_at': published_at
                })
            
            if final_status == 'published':
                print(f'>>> PUBLICADO COM SUCESSO: {final_title} | nota {audit["score"]}/100 | seed {image_seed}')
            else:
                print(f'>>> APROVADO PARA ANALISE HUMANA: {final_title} | nota {audit["score"]}/100 | seed {image_seed}')
        else:
            requeue_or_reject(post, 'modelo nao retornou conteudo valido.')

if __name__ == "__main__":
    print("M4 CHRONOS WORKER v4.0 - CURADORIA PREMIUM UNICA")
    while True:
        try:
            publish_due_scheduled_posts()
            process_queue()
        except Exception as e:
            print(f"Erro: {e}")
        time.sleep(30)
