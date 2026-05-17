import json
import os
import pathlib
import sys
import urllib.error
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_env_file(path: pathlib.Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def extract_output_text(payload: dict) -> str:
    if isinstance(payload.get("output_text"), str):
        return payload["output_text"].strip()

    parts = []
    for item in payload.get("output", []) or []:
        for content in item.get("content", []) or []:
            text = content.get("text")
            if isinstance(text, str):
                parts.append(text)
    return "\n".join(parts).strip()


def main() -> int:
    load_env_file(ROOT / ".env.local")
    load_env_file(ROOT / ".env")

    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        print("Configure OPENAI_API_KEY em .env.local antes de executar o teste.", file=sys.stderr)
        return 1

    model = os.environ.get("OPENAI_TEXT_MODEL", "gpt-5.4-mini").strip()
    prompt = """
Voce e o motor editorial do Portal M4.

Produza um teste curto em portugues do Brasil sobre:
"Como a inteligencia artificial muda a produtividade de pequenas empresas em 2026".

Formato obrigatorio:
TITULO:
RESUMO:
TEXTO:

Regras:
- tom premium, claro e jornalistico;
- nada de emoji;
- nada de markdown;
- texto com 500 a 700 palavras;
- cite riscos, oportunidades e uma decisao pratica para o leitor.
""".strip()

    body = {
        "model": model,
        "instructions": "Voce escreve artigos premium em portugues do Brasil para o Portal M4.",
        "input": prompt,
        "max_output_tokens": 1800,
    }

    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        print(f"OpenAI HTTP {exc.code}: {details[:1000]}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Falha ao chamar OpenAI: {exc}", file=sys.stderr)
        return 1

    output_text = extract_output_text(payload)
    if not output_text:
        print("Resposta recebida, mas sem texto extraivel:", file=sys.stderr)
        print(json.dumps(payload, ensure_ascii=False, indent=2)[:2000], file=sys.stderr)
        return 1

    print(f"MODELO: {model}")
    print("=" * 80)
    print(output_text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
