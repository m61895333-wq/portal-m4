const { Client } = require('ssh2');
const fs = require('fs');

const config = {
  host: '2.24.221.50',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('D:/04 Portal M4/web/scripts/antigravity_key'),
  passphrase: '123456'
};

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to US 8GB. Uploading tar...');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut('D:/04 Portal M4/web/scripts/salex-stack.tar.gz', '/opt/salex-stack.tar.gz', (err2) => {
      if (err2) throw err2;
      console.log('Upload Finished! Un-tarring and Starting...');
      conn.exec('tar -xzvf /opt/salex-stack.tar.gz -C /opt && cd /opt/salex-stack && docker compose up -d', (err3, stream) => {
        if (err3) throw err3;
        stream.on('close', () => {
          console.log('Salex Stack Live on 8GB US VPS!');
          conn.end();
        }).on('data', (d) => process.stdout.write(d)).stderr.on('data', (d) => process.stderr.write(d));
      });
    });
  });
}).connect(config);
