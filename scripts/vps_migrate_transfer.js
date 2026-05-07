const { Client } = require('ssh2');

const hetznerConfig = {
  host: '87.99.139.73',
  port: 22,
  username: 'root',
  password: 'Hb}4p&xdZhw]2j7$ev+&@P'
};

const brazilIp = '129.121.32.198';
const brazilPort = 22022;
const brazilPass = 'kjNBUYsf04684bkwj@kgfwefehb';

const conn = new Client();
conn.on('ready', () => {
  console.log('HETZNER Connected. Starting Migration Sequence...');
  
  // Parar serviços para garantir integridade do banco
  const cmd = `
    cd /opt/salex-stack && docker compose down && \
    tar -czvf /tmp/salex-stack.tar.gz -C /opt salex-stack && \
    sshpass -p '${brazilPass}' scp -P ${brazilPort} -o StrictHostKeyChecking=no /tmp/salex-stack.tar.gz root@${brazilIp}:/opt/
  `;

  console.log('Executing Down, Tar and SCP...');
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Hetzner part finished with code ' + code);
      conn.end();
    }).on('data', (d) => process.stdout.write(d)).stderr.on('data', (d) => process.stderr.write(d));
  });
}).on('error', (err) => console.error(err)).connect(hetznerConfig);
