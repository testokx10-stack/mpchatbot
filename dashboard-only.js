const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;
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

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1e6) {
                reject(new Error('Body too large'));
            }
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch {
                resolve({});
            }
        });
        req.on('error', reject);
    });
}

function createJsonResponse(res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
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
            const values = lines[i].split(',');
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

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

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

    if (req.url.startsWith('/api/') && !req.url.startsWith('/api/auth/') && !isAuthenticated) {
        createJsonResponse(res, 401, { error: 'Authentication required' });
        return;
    }

    if (req.method === 'GET' && req.url === '/api/leads') {
        serveLeads(res);
        return;
    }

    if (req.method === 'GET' && req.url === '/api/control/status') {
        createJsonResponse(res, 200, { status: 'dashboard-only', note: 'Bot runs locally - connect via API' });
        return;
    }

    if (req.method === 'GET' && req.url === '/api/control/logs') {
        createJsonResponse(res, 200, { lines: ['Dashboard-only mode - connect to local bot for full control'] });
        return;
    }

    if (req.method === 'GET' && req.url === '/api/info') {
        createJsonResponse(res, 200, { 
            mode: 'dashboard-only',
            botUrl: process.env.BOT_API_URL || 'http://localhost:3000',
            note: 'Configure BOT_API_URL to connect to remote bot'
        });
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
    console.log(`Dashboard server running at http://localhost:${PORT} (or on Fly.io)`);
});

process.on('SIGINT', () => {
    server.close(() => {
        process.exit(0);
    });
});