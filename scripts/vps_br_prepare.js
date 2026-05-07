const { Client } = require('ssh2');

const config = {
  host: '129.121.32.198',
  port: 22022,
  username: 'root',
  password: 'kjNBUYsf04684bkwj@kgfwefehb'
};

const conn = new Client();
const commands = [
  'fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo "/swapfile none swap sw 0 0" >> /etc/fstab',
  'apt-get update && apt-get install -y curl python3-pip python3-venv'
];

conn.on('ready', () => {
  console.log('BRAZIL VPS Connected. Starting Migration Stage 1 (System & Swap)...');
  
  const executeCommand = (index) => {
    if (index >= commands.length) {
      console.log('Stage 1 Finished!');
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
