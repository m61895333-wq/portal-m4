const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('systemctl status m4-worker', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({
  host: '87.99.139.73',
  port: 22,
  username: 'root',
  password: 'Hb}4p&xdZhw]2j7$ev+&@P'
});
