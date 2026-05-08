import requests
import json

url = 'http://2.24.221.50:11434/api/generate'
data = {
    "model": "gpt-oss",
    "prompt": "oi",
    "stream": False
}

try:
    response = requests.post(url, json=data, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Erro: {e}")
