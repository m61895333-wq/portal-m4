const { Client } = require('ssh2');
const fs = require('fs');

const config = {
  host: '129.121.32.198',
  port: 22022,
  username: 'root',
  password: 'kjNBUYsf04684bkwj@kgfwefehb'
};

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to Brazil. Downloading tar...');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastGet('/tmp/salex-stack.tar.gz', 'D:/04 Portal M4/web/scripts/salex-stack.tar.gz', (err2) => {
      if (err2) throw err2;
      console.log('Download Finished!');
      conn.end();
    });
  });
}).connect(config);
