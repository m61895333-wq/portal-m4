const { spawn } = require('child_process');

const password = 'Hb}4p&xdZhw]2j7$ev+&@P';
const host = '87.99.139.73';
const cmd = process.argv.slice(2).join(' ') || 'hostname';

console.log(`Executing: ssh root@${host} "${cmd}"`);

const child = spawn('ssh', ['-o', 'StrictHostKeyChecking=no', `root@${host}`, cmd], {
  shell: true,
  stdio: ['pipe', 'inherit', 'inherit']
});

// We need to wait a bit for the password prompt or just send it if we are sure
// However, ssh on Windows often doesn't accept password from piped stdin
// It usually requires a TTY.
// If this fails, I'll ask Marcus to use a different method.

child.stdin.write(password + '\n');
child.stdin.end();

child.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
  process.exit(code);
});
