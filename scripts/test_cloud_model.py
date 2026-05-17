import requests
import json
import os

url = os.environ.get("OLLAMA_TEST_URL", "http://localhost:11434/api/generate")
data = {
    "model": os.environ.get("OLLAMA_TEST_MODEL", "llama3.1"),
    "prompt": "oi",
    "stream": False
}

try:
    response = requests.post(url, json=data, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Erro: {e}")
