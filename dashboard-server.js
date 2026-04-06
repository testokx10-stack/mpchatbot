const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3001;
const BOT_SCRIPT = 'index.js';
const LOG_LIMIT = 400;
const DASHBOARD_PASSWORD = 'Mediaprestigeadmin';

let isAuthenticated = false;

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
};

const runtimeState = {
    botProcess: null,
    botStartedAt: null,
    botLogs: ['Control server ready. Start the bot from the dashboard.'],
    botStatus: 'stopped',
    dashboardStartedAt: new Date().toISOString()
};

function pushBotLog(message) {
    const line = `[${new Date().toLocaleTimeString()}] ${message}`;
    runtimeState.botLogs.push(line);

    if (runtimeState.botLogs.length > LOG_LIMIT) {
        runtimeState.botLogs = runtimeState.botLogs.slice(-LOG_LIMIT);
    }

    console.log(line);
}

function createJsonResponse(res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1_000_000) {
                reject(new Error('Request body too large'));
            }
        });

        req.on('end', () => {
            if (!body) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(body));
            } catch {
                reject(new Error('Invalid JSON body'));
            }
        });

        req.on('error', reject);
    });
}

function getRuntimeStatus() {
    return {
        botStatus: runtimeState.botStatus,
        botPid: runtimeState.botProcess && !runtimeState.botProcess.killed ? runtimeState.botProcess.pid : null,
        botStartedAt: runtimeState.botStartedAt,
        dashboardStartedAt: runtimeState.dashboardStartedAt,
        logCount: runtimeState.botLogs.length
    };
}

function startBot() {
    if (runtimeState.botProcess && !runtimeState.botProcess.killed) {
        return { ok: true, alreadyRunning: true, status: getRuntimeStatus() };
    }

    const child = spawn(process.execPath, [BOT_SCRIPT], {
        cwd: __dirname,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
    });

    runtimeState.botProcess = child;
    runtimeState.botStartedAt = new Date().toISOString();
    runtimeState.botStatus = 'starting';
    pushBotLog(`Bot launch requested. PID ${child.pid}.`);

    child.stdout.on('data', chunk => {
        const lines = chunk.toString().split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
            pushBotLog(`BOT: ${line}`);
            if (line.toLowerCase().includes('ready')) {
                runtimeState.botStatus = 'running';
            }
        }
    });

    child.stderr.on('data', chunk => {
        const lines = chunk.toString().split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
            pushBotLog(`BOT ERROR: ${line}`);
        }
    });

    child.on('exit', (code, signal) => {
        pushBotLog(`Bot stopped. Exit code: ${code ?? 'null'} Signal: ${signal ?? 'none'}`);
        runtimeState.botProcess = null;
        runtimeState.botStatus = 'stopped';
        runtimeState.botStartedAt = null;
    });

    child.on('error', error => {
        pushBotLog(`Bot process error: ${error.message}`);
        runtimeState.botStatus = 'stopped';
        runtimeState.botProcess = null;
        runtimeState.botStartedAt = null;
    });

    return { ok: true, alreadyRunning: false, status: getRuntimeStatus() };
}

function stopBot() {
    if (!runtimeState.botProcess || runtimeState.botProcess.killed) {
        runtimeState.botProcess = null;
        runtimeState.botStatus = 'stopped';
        runtimeState.botStartedAt = null;
        return { ok: true, alreadyStopped: true, status: getRuntimeStatus() };
    }

    runtimeState.botStatus = 'stopping';
    pushBotLog('Bot stop requested.');

    try {
        runtimeState.botProcess.kill('SIGINT');
    } catch (error) {
        pushBotLog(`Bot stop failed: ${error.message}`);
        try {
            runtimeState.botProcess.kill();
        } catch {
            // ignore secondary failure
        }
    }

    return { ok: true, alreadyStopped: false, status: getRuntimeStatus() };
}

function serveLeads(res) {
    const leadsPath = path.join(__dirname, 'leads.csv');

    fs.readFile(leadsPath, 'utf8', (err, data) => {
        if (err) {
            createJsonResponse(res, 500, { error: 'Failed to read leads data' });
            return;
        }

        const lines = data.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const leads = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length >= headers.length) {
                const lead = {};
                headers.forEach((header, index) => {
                    lead[header] = values[index] || '';
                });
                leads.push(lead);
            }
        }

        createJsonResponse(res, 200, leads);
    });
}

function serveStaticFile(req, res) {
    let filePath = req.url === '/' ? '/dashboard.html' : req.url;
    filePath = path.join(__dirname, filePath);

    const extname = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>404 - File Not Found</h1>');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`Server Error: ${err.code}`);
            }
            return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Authentication endpoints
    if (req.method === 'POST' && req.url === '/api/auth/login') {
        readRequestBody(req).then(body => {
            if (body.password === DASHBOARD_PASSWORD) {
                isAuthenticated = true;
                createJsonResponse(res, 200, { ok: true });
            } else {
                createJsonResponse(res, 401, { error: 'Invalid password' });
            }
        }).catch(() => createJsonResponse(res, 400, { error: 'Invalid request' }));
        return;
    }

    if (req.method === 'GET' && req.url === '/api/auth/check') {
        createJsonResponse(res, 200, { authenticated: isAuthenticated });
        return;
    }

    if (req.method === 'POST' && req.url === '/api/auth/logout') {
        isAuthenticated = false;
        createJsonResponse(res, 200, { ok: true });
        return;
    }

    // Protect all API endpoints except auth
    if (req.url.startsWith('/api/') && !req.url.startsWith('/api/auth/') && !isAuthenticated) {
        createJsonResponse(res, 401, { error: 'Authentication required' });
        return;
    }

    if (req.method === 'GET' && req.url === '/api/leads') {
        serveLeads(res);
        return;
    }

    if (req.method === 'GET' && req.url === '/api/control/status') {
        createJsonResponse(res, 200, getRuntimeStatus());
        return;
    }

    if (req.method === 'GET' && req.url === '/api/control/logs') {
        createJsonResponse(res, 200, { lines: runtimeState.botLogs });
        return;
    }

    if (req.method === 'POST' && req.url === '/api/control/start') {
        createJsonResponse(res, 200, startBot());
        return;
    }

    if (req.method === 'POST' && req.url === '/api/control/stop') {
        createJsonResponse(res, 200, stopBot());
        return;
    }

    if (req.method === 'POST' && req.url === '/api/control/restart') {
        stopBot();
        setTimeout(() => startBot(), 1200);
        createJsonResponse(res, 200, { ok: true, restarting: true, status: getRuntimeStatus() });
        return;
    }

    if (req.method === 'POST' && req.url === '/api/control/clear-logs') {
        runtimeState.botLogs = ['Logs cleared from dashboard.'];
        createJsonResponse(res, 200, { ok: true });
        return;
    }

    if (req.method === 'POST' && req.url === '/api/control/open-dashboard') {
        createJsonResponse(res, 200, { ok: true, url: `http://localhost:${PORT}` });
        return;
    }

    if (req.method !== 'GET') {
        let bodyError = null;
        try {
            await readRequestBody(req);
        } catch (error) {
            bodyError = error;
        }

        if (bodyError) {
            createJsonResponse(res, 400, { error: bodyError.message });
            return;
        }
    }

    serveStaticFile(req, res);
});

server.listen(PORT, () => {
    console.log(`Control server running at http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
    stopBot();
    server.close(() => {
        process.exit(0);
    });
});
