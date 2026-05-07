const { Client } = require('ssh2');

const config = {
  host: '129.121.32.198',
  port: 22022,
  username: 'root',
  password: 'kjNBUYsf04684bkwj@kgfwefehb'
};

const conn = new Client();
const commands = [
  'curl -fsSL https://ollama.com/install.sh | sh',
  'systemctl enable ollama',
  'systemctl start ollama',
  'sleep 5',
  'ollama pull llama3:8b-instruct-q4_0'
];

conn.on('ready', () => {
  console.log('BRAZIL VPS Connected. Stage 2 (Ollama & Model)...');
  
  const executeCommand = (index) => {
    if (index >= commands.length) {
      console.log('Stage 2 Finished!');
      conn.end();
      return;
    }

    const cmd = commands[index];
    console.log(`\nExecuting: ${cmd}`);
    
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(`Error executing ${cmd}:`, err);
        conn.end();
        return;
      }
      
      stream.on('close', (code) => {
        console.log(`Finished with code ${code}`);
        executeCommand(index + 1);
      }).on('data', (data) => {
        process.stdout.write(data);
      }).stderr.on('data', (data) => {
        process.stderr.write(data);
      });
    });
  };

  executeCommand(0);
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
