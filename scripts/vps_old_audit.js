const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('HETZNER VPS Connected. Auditing services...');
  conn.exec('docker ps --format "{{.Names}}" && ls /opt', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => console.error(err)).connect({
  host: '87.99.139.73',
  port: 22,
  username: 'root',
  password: 'Hb}4p&xdZhw]2j7$ev+&@P'
});
