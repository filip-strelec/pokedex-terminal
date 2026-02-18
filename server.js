const express = require('express');
const expressWs = require('express-ws');
const pty = require('node-pty');
const path = require('path');

const app = express();
expressWs(app);

app.use(express.static(path.join(__dirname, 'public')));

app.ws('/terminal', (ws) => {
  let term = null;

  // First message carries caught data from browser localStorage
  ws.once('message', (msg) => {
    let caughtInit = '[]';
    let mode = 'pokedex'; // 'pokedex' or 'shell'

    try {
      const init = JSON.parse(msg.toString());
      if (init.type === 'init') {
        caughtInit = JSON.stringify(init.caught || []);
        mode = init.mode || 'pokedex';
      }
    } catch {}

    // Spawn either Pokédex app or restricted shell
    if (mode === 'shell') {
      term = pty.spawn('node', ['restricted-shell.js'], {
        name: 'xterm-256color',
        cols: 120,
        rows: 40,
        cwd: __dirname,
        env: { ...process.env, FORCE_COLOR: '3' },
      });
    } else {
      term = pty.spawn('node', ['index.js'], {
        name: 'xterm-256color',
        cols: 120,
        rows: 40,
        cwd: __dirname,
        env: { ...process.env, FORCE_COLOR: '3', WEB_MODE: '1', CAUGHT_INIT: caughtInit },
      });
    }

    term.on('data', (data) => {
      if (mode === 'pokedex') {
        // Intercept OSC 9999 sync sequences → forward as JSON to browser
        const syncRe = /\x1b\]9999;(.+?)\x07/g;
        let match;
        while ((match = syncRe.exec(data)) !== null) {
          try {
            ws.send(JSON.stringify({ type: 'sync', caught: JSON.parse(match[1]) }));
          } catch {}
        }
        // Strip sync sequences, send rest as terminal output
        const clean = data.replace(syncRe, '');
        if (clean) {
          try { ws.send(clean); } catch {}
        }
      } else {
        // Shell mode: send all output directly
        try { ws.send(data); } catch {}
      }
    });

    // Detect when Pokédex app exits → notify browser to switch to shell
    term.on('exit', () => {
      if (mode === 'pokedex') {
        try {
          ws.send(JSON.stringify({ type: 'app-exited' }));
        } catch {}
      }
    });

    ws.on('message', (msg) => {
      const str = msg.toString();
      try {
        const parsed = JSON.parse(str);
        if (parsed.type === 'resize') { term.resize(parsed.cols, parsed.rows); return; }
      } catch {}
      term.write(str);
    });
  });

  ws.on('close', () => {
    if (term) term.kill();
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pokédex running at http://localhost:${PORT}`));

