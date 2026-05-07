const { Client } = require('ssh2');

const conn = new Client();
const commands = [
  'hostname',
  'df -h',
  'free -m',
  'fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo "/swapfile none swap sw 0 0" >> /etc/fstab',
  'apt-get update && apt-get install -y curl python3-pip python3-venv'
];

conn.on('ready', () => {
  console.log('VPS Connected. Starting Setup...');
  
  const executeCommand = (index) => {
    if (index >= commands.length) {
      console.log('Setup Finished Successfully!');
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
