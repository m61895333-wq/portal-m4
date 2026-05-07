const { Client } = require('ssh2');
const fs = require('fs');

const config = {
  host: '2.24.221.50',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('D:/04 Portal M4/web/scripts/antigravity_key'),
  passphrase: '123456'
};

const supabaseUrl = 'https://iueoqdwhrnxkgjrqybwo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZW9xZHdocm54a2dqcnF5YndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEyODY3MywiZXhwIjoyMDkzNzA0NjczfQ.qFnIR_dWoWQqNkVNISbbYJ4AqBEk-aXnqorwthh4hBI';

const pythonCode = `
import time
import requests
import json
from supabase import create_client, Client

url = "${supabaseUrl}"
key = "${supabaseKey}"
supabase: Client = create_client(url, key)

def generate_with_ollama(prompt):
    print(f"--- Gerando com Ollama (8GB Power) ---")
    try:
        response = requests.post('http://localhost:11434/api/generate', 
            json={
                'model': 'llama3:8b-instruct-q4_0',
                'prompt': prompt,
                'stream': False,
                'options': {
                    'temperature': 0.7,
                    'num_predict': 2000
                }
            }, timeout=600)
        return response.json().get('response', '')
    except Exception as e:
        print(f"Erro no Ollama: {e}")
        return None

def process_queue():
    res = supabase.table('portal_posts').select('*').eq('status', 'queued').execute()
    posts = res.data

    if not posts:
        return

    for post in posts:
        post_id = post['id']
        topic = post['title']
        print(f"Processando Artigo: {topic} (ID: {post_id})")
        
        supabase.table('portal_posts').update({'status': 'generating'}).eq('id', post_id).execute()
        
        prompt = f"""
        Aja como Editor-Chefe Sênior do Portal M4.
        Assunto: {topic}
        Regras de Ouro:
        1. SEM EMOJIS.
        2. Português do Brasil culto e impecável.
        3. Tom Premium e Profissional.
        4. Estruture em Markdown com subtítulos H2.
        5. Crie pelo menos 3 seções profundas.
        
        Escreva o artigo completo agora em Português do Brasil.
        """
        
        content = generate_with_ollama(prompt)
        
        if content:
            excerpt = content[:200] + "..." if len(content) > 200 else content
            supabase.table('portal_posts').update({
                'content': content,
                'excerpt': excerpt,
                'status': 'review',
                'updated_at': 'now()'
            }).eq('id', post_id).execute()
            print(f"Sucesso: Artigo {post_id} enviado para Revisão.")
        else:
            print(f"Erro ao gerar conteúdo para {post_id}")
            supabase.table('portal_posts').update({'status': 'queued'}).eq('id', post_id).execute()

if __name__ == "__main__":
    print("M4 Worker Iniciado na SUPER VPS de 8GB!")
    while True:
        try:
            process_queue()
        except Exception as e:
            print(f"Erro no loop: {e}")
        time.sleep(10)
`;

const serviceCode = `
[Unit]
Description=M4 Portal AI Worker 8GB
After=network.target ollama.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/m4-worker
ExecStart=/opt/m4-worker/venv/bin/python3 /opt/m4-worker/worker.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('Deploying M4 Worker to 8GB VPS...');
  conn.exec('mkdir -p /opt/m4-worker && python3 -m venv /opt/m4-worker/venv && /opt/m4-worker/venv/bin/pip install supabase requests', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
        conn.sftp((err2, sftp) => {
            if (err2) throw err2;
            
            const writeWorker = () => {
              const s = sftp.createWriteStream('/opt/m4-worker/worker.py');
              s.on('close', () => {
                console.log('worker.py uploaded.');
                writeService();
              });
              s.write(pythonCode);
              s.end();
            };

            const writeService = () => {
              const s = sftp.createWriteStream('/etc/systemd/system/m4-worker.service');
              s.on('close', () => {
                console.log('m4-worker.service uploaded.');
                enableService();
              });
              s.write(serviceCode);
              s.end();
            };

            const enableService = () => {
              conn.exec('systemctl daemon-reload && systemctl enable m4-worker && systemctl start m4-worker', (err3, stream3) => {
                if (err3) throw err3;
                stream3.on('close', () => {
                  console.log('Worker Live on 8GB US VPS!');
                  conn.end();
                }).on('data', (d) => process.stdout.write(d));
              });
            };

            writeWorker();
        });
    });
  });
}).connect(config);
