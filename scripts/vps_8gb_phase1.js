const { Client } = require('ssh2');
const fs = require('fs');

const config = {
  host: '2.24.221.50',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('D:/04 Portal M4/web/scripts/antigravity_key'),
  passphrase: '123456'
};

const conn = new Client();
const commands = [
  'apt-get update && apt-get install -y curl python3-pip python3-venv',
  'curl -fsSL https://get.docker.com | sh',
  'curl -fsSL https://ollama.com/install.sh | sh',
  'ollama pull llama3:8b-instruct-q4_0'
];

conn.on('ready', () => {
  console.log('8GB VPS Connected. Starting Phase 1 (Docker & Ollama)...');
  
  const executeCommand = (index) => {
    if (index >= commands.length) {
      console.log('Phase 1 Finished!');
      conn.end();
      return;
    }

    const cmd = commands[index];
    console.log(`\nExecuting: ${cmd}`);
    
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream.on('close', () => executeCommand(index + 1))
            .on('data', (d) => process.stdout.write(d))
            .stderr.on('data', (d) => process.stderr.write(d));
    });
  };

  executeCommand(0);
}).connect(config);
