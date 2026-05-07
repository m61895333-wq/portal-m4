const { Client } = require('ssh2');

const conn = new Client();
const commands = [
  'mkdir -p /opt/m4-worker',
  'python3 -m venv /opt/m4-worker/venv',
  '/opt/m4-worker/venv/bin/pip install supabase requests'
];

conn.on('ready', () => {
  console.log('VPS Connected. Setting up Worker environment...');
  
  const executeCommand = (index) => {
    if (index >= commands.length) {
      console.log('Worker environment ready!');
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
