import { spawn } from 'node:child_process';
import http from 'node:http';
import process from 'node:process';
import readline from 'node:readline';

const proxyPort = Number(process.env.PLAYWRIGHT_PROXY_PORT ?? '13080');
const devCommand = process.platform === 'win32' ? 'pnpm dev' : 'pnpm';
const devArgs = process.platform === 'win32' ? [] : ['dev'];
const child = spawn(devCommand, devArgs, {
  cwd: process.cwd(),
  detached: process.platform !== 'win32',
  env: process.env,
  shell: process.platform === 'win32',
  stdio: ['ignore', 'pipe', 'pipe'],
});

let proxyServer;
let shuttingDown = false;
let targetOrigin;

function writeLine(stream, line) {
  stream.write(`${line}\n`);
}

function startProxy(origin) {
  if (proxyServer) {
    return;
  }

  targetOrigin = origin;
  proxyServer = http.createServer((request, response) => {
    const upstreamUrl = new URL(request.url ?? '/', targetOrigin);
    const upstreamRequest = http.request(
      upstreamUrl,
      {
        method: request.method,
        headers: {
          ...request.headers,
          host: upstreamUrl.host,
        },
      },
      (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      },
    );

    upstreamRequest.on('error', (error) => {
      if (!response.headersSent) {
        response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      }
      response.end(`Proxy request failed: ${error.message}`);
    });

    request.pipe(upstreamRequest);
  });

  proxyServer.on('clientError', (_error, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });

  proxyServer.on('error', async (error) => {
    writeLine(process.stderr, `Playwright proxy failed: ${error.message}`);
    await shutdown(1);
  });

  proxyServer.listen(proxyPort, '127.0.0.1', () => {
    writeLine(process.stdout, `Playwright proxy ready on http://127.0.0.1:${proxyPort}`);
  });
}

function attachOutput(stream, writer) {
  const lineReader = readline.createInterface({ input: stream });
  lineReader.on('line', (line) => {
    writer(line);
    const match = line.match(/Serving on (https?:\/\/\S+)/);
    if (match) {
      startProxy(match[1]);
    }
  });
}

async function terminateChild() {
  if (child.exitCode !== null) {
    return;
  }

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      killer.on('exit', () => resolve());
      killer.on('error', () => resolve());
    });
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }

  await new Promise((resolve) => setTimeout(resolve, 250));

  if (child.exitCode === null) {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  if (proxyServer) {
    await new Promise((resolve) => proxyServer.close(() => resolve()));
  }

  await terminateChild();
  process.exit(exitCode);
}

attachOutput(child.stdout, (line) => writeLine(process.stdout, line));
attachOutput(child.stderr, (line) => writeLine(process.stderr, line));

child.on('exit', (code) => {
  if (shuttingDown) {
    process.exit(0);
    return;
  }

  if (proxyServer) {
    void shutdown(code ?? 0);
    return;
  }

  process.exit(code ?? 1);
});

process.on('SIGINT', () => {
  void shutdown(0);
});

process.on('SIGTERM', () => {
  void shutdown(0);
});