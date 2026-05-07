const { Client } = require('ssh2');

const conn = new Client();
const commands = [
  'curl -fsSL https://ollama.com/install.sh | sh',
  'systemctl enable ollama',
  'systemctl start ollama',
  'sleep 5',
  'ollama pull llama3:8b-instruct-q4_0'
];

conn.on('ready', () => {
  console.log('VPS Connected. Installing Ollama...');
  
  const executeCommand = (index) => {
    if (index >= commands.length) {
      console.log('Ollama Installed and Model Pulled!');
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
}).connect({
  host: '87.99.139.73',
  port: 22,
  username: 'root',
  password: 'Hb}4p&xdZhw]2j7$ev+&@P'
});
