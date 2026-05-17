const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const WORKER_LOCAL = path.join(__dirname, 'worker_v3_7.py');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    process.env[key] ??= rawValue.replace(/^"|"$/g, '');
  }
}

loadEnvFile(path.join(__dirname, '..', '.env.local'));

const WORKER_REMOTE = process.env.PORTAL_M4_WORKER_REMOTE_PATH || '/opt/m4-worker/worker.py';
const host = process.env.PORTAL_M4_VPS_HOST;
const port = Number(process.env.PORTAL_M4_VPS_PORT || 22);
const username = process.env.PORTAL_M4_VPS_USER || 'root';
const password = process.env.PORTAL_M4_VPS_PASSWORD;
const privateKeyPath = process.env.PORTAL_M4_VPS_PRIVATE_KEY_PATH;

if (!host) {
  console.error('Defina PORTAL_M4_VPS_HOST antes de executar o deploy do worker.');
  process.exit(1);
}

const auth = {};
if (privateKeyPath) {
  auth.privateKey = fs.readFileSync(privateKeyPath);
} else if (password) {
  auth.password = password;
} else {
  console.error('Defina PORTAL_M4_VPS_PASSWORD ou PORTAL_M4_VPS_PRIVATE_KEY_PATH.');
  process.exit(1);
}

const conn = new Client();

function buildWorkerEnv() {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`Defina ${key} no ambiente local antes de fazer deploy do worker.`);
      process.exit(1);
    }
  }

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://portalm4.com.br',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434/api/generate',
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3:8b-instruct-q4_0',
    OLLAMA_FAST_MODEL: process.env.OLLAMA_FAST_MODEL || process.env.OLLAMA_MODEL || 'llama3:8b-instruct-q4_0',
    OLLAMA_WRITER_MODEL: process.env.OLLAMA_WRITER_MODEL || process.env.OLLAMA_MODEL || 'llama3:8b-instruct-q4_0',
    OLLAMA_REVISER_MODEL: process.env.OLLAMA_REVISER_MODEL || 'qwen2.5:3b-instruct',
    OLLAMA_FALLBACK_MODEL: process.env.OLLAMA_FALLBACK_MODEL || process.env.OLLAMA_MODEL || 'llama3:8b-instruct-q4_0',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    GEMINI_ENABLED: process.env.GEMINI_ENABLED || 'true',
    GEMINI_RESEARCH_MODEL: process.env.GEMINI_RESEARCH_MODEL || 'gemini-2.5-flash',
    GEMINI_WRITER_MODEL: process.env.GEMINI_WRITER_MODEL || 'gemini-3.1-flash-lite',
    GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite',
    GEMINI_DAILY_CALL_LIMIT: process.env.GEMINI_DAILY_CALL_LIMIT || '3',
    GEMINI_USAGE_PATH: process.env.GEMINI_USAGE_PATH || '/opt/m4-worker/gemini_usage.json',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    OPENAI_ENABLED: process.env.OPENAI_ENABLED || 'false',
    OPENAI_TEXT_MODEL: process.env.OPENAI_TEXT_MODEL || 'gpt-5.4-mini',
    OPENAI_RESEARCH_MODEL: process.env.OPENAI_RESEARCH_MODEL || process.env.OPENAI_TEXT_MODEL || 'gpt-5.4-mini',
    OPENAI_AUDIT_MODEL: process.env.OPENAI_AUDIT_MODEL || process.env.OPENAI_TEXT_MODEL || 'gpt-5.4-mini',
    OPENAI_DAILY_CALL_LIMIT: process.env.OPENAI_DAILY_CALL_LIMIT || '3',
    OPENAI_USAGE_PATH: process.env.OPENAI_USAGE_PATH || '/opt/m4-worker/openai_usage.json',
    OPENAI_WRITE_MODE: process.env.OPENAI_WRITE_MODE || 'structured',
    OPENAI_PUBLISH_MODE: process.env.OPENAI_PUBLISH_MODE || 'direct',
    RESEND_API_KEY: process.env.RESEND_API_KEY || '',
    PORTAL_M4_NOTIFY_EMAIL: process.env.PORTAL_M4_NOTIFY_EMAIL || '',
    PORTAL_M4_NOTIFY_FROM: process.env.PORTAL_M4_NOTIFY_FROM || 'Portal M4 <onboarding@resend.dev>'
  };

  return Object.entries(env)
    .map(([key, value]) => `${key}=${JSON.stringify(String(value))}`)
    .join('\n') + '\n';
}

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      stream.on('data', d => process.stdout.write(d.toString()));
      stream.stderr.on('data', d => process.stderr.write(d.toString()));
      stream.on('close', code => code === 0 ? resolve() : reject(new Error(`Comando falhou (${code}): ${command}`)));
    });
  });
}

conn.on('ready', () => {
  console.log('[SSH] VPS conectada!');
  
  // Passo 1: envia o arquivo
  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP erro:', err); conn.end(); return; }

    const workerCode = fs.readFileSync(WORKER_LOCAL);
    const writeStream = sftp.createWriteStream(WORKER_REMOTE);

    writeStream.on('close', () => {
      console.log('[SSH] worker.py atualizado em', WORKER_REMOTE);
      const envStream = sftp.createWriteStream('/opt/m4-worker/.env');
      envStream.on('close', async () => {
        console.log('[SSH] EnvironmentFile atualizado em /opt/m4-worker/.env');
        try {
          await exec(conn, "chmod 600 /opt/m4-worker/.env && mkdir -p /etc/systemd/system/m4-worker.service.d && printf '[Service]\\nEnvironmentFile=/opt/m4-worker/.env\\n' > /etc/systemd/system/m4-worker.service.d/env.conf && systemctl daemon-reload && systemctl restart m4-worker && sleep 4 && systemctl status m4-worker --no-pager | tail -20");
          console.log('\n[SSH] Servico reiniciado com sucesso.');
        } catch (err) {
          console.error('[SSH] Falha ao reiniciar servico:', err.message);
        } finally {
          conn.end();
        }
      });
      envStream.end(buildWorkerEnv());
    });

    writeStream.end(workerCode);
  });

}).on('error', (err) => {
  console.error('[SSH] Erro de conexao:', err.message);
}).connect({
  host,
  port,
  username,
  ...auth,
  readyTimeout: 15000
});
