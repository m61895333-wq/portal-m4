const { Client } = require('ssh2');

const config = {
  host: '129.121.32.198',
  port: 22022,
  username: 'root',
  password: 'kjNBUYsf04684bkwj@kgfwefehb'
};

const conn = new Client();
const commands = [
  'tar -xzvf /opt/salex-stack.tar.gz -C /opt',
  'cd /opt/salex-stack && docker compose up -d'
];

conn.on('ready', () => {
  console.log('BRAZIL Connected. Deploying Salex Stack...');
  
  const executeCommand = (index) => {
    if (index >= commands.length) {
      console.log('Salex Stack Live in Brazil!');
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
