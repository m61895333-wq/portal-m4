const { Client } = require('ssh2');

const config = {
  host: '129.121.32.198',
  port: 22022,
  username: 'root',
  password: 'kjNBUYsf04684bkwj@kgfwefehb'
};

const conn = new Client();
const commands = [
  'curl -fsSL https://get.docker.com | sh',
  'curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose',
  'chmod +x /usr/local/bin/docker-compose',
  'mkdir -p /opt/salex-stack'
];

conn.on('ready', () => {
  console.log('BRAZIL VPS Connected. Installing Docker for Salex Stack...');
  
  const executeCommand = (index) => {
    if (index >= commands.length) {
      console.log('Docker Ready on Brazil VPS!');
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
