const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const cmd = process.argv[2] || 'hostname';

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
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
  host: '2.24.221.50',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('D:/04 Portal M4/web/scripts/antigravity_key'),
  passphrase: '123456'
});
