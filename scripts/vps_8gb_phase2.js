const { Client } = require('ssh2');

const brazilConfig = {
  host: '129.121.32.198',
  port: 22022,
  username: 'root',
  password: 'kjNBUYsf04684bkwj@kgfwefehb'
};

const usIp = '2.24.221.50';
const usPass = 'kjNBUYsf04684bkwj@kgfwefehb'; // Assuming same password or I'll use key

const conn = new Client();
conn.on('ready', () => {
  console.log('BRAZIL VPS Connected. Starting Phase 2 Transfer to 8GB US...');
  
  const cmd = `
    apt-get update && apt-get install -y sshpass && \
    cd /opt/salex-stack && docker compose down && \
    tar -czvf /tmp/salex-stack.tar.gz -C /opt salex-stack && \
    sshpass -p '${usPass}' scp -o StrictHostKeyChecking=no /tmp/salex-stack.tar.gz root@${usIp}:/opt/
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Transfer Finished with code ' + code);
      conn.end();
    }).on('data', (d) => process.stdout.write(d)).stderr.on('data', (d) => process.stderr.write(d));
  });
}).connect(brazilConfig);
