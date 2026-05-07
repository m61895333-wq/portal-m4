const { Client } = require('ssh2');

const config = {
  host: '129.121.32.198',
  port: 22022,
  username: 'root',
  password: 'kjNBUYsf04684bkwj@kgfwefehb'
};

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected. Running pip install...');
  conn.exec('/opt/m4-worker/venv/bin/pip install supabase requests --no-cache-dir', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Pip finished with code ' + code);
      conn.end();
    }).on('data', (d) => process.stdout.write(d)).stderr.on('data', (d) => process.stderr.write(d));
  });
}).connect(config);
