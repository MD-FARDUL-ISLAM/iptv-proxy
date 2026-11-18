const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.get('/', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(200).send('IPTV Proxy Server is Running Smoothly!');
    }

    try {
        const proxyOrigin = `https://${req.get('host')}`;
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            },
            redirect: 'follow'
        });

        const contentType = response.headers.get('content-type') || '';

        if (targetUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('x-mpegurl')) {
            let playlistText = await response.text();
            const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

            const rewrittenLines = playlistText.split(/\r?\n/).map(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) {
                    return line.replace(/URI="([^"]+)"/g, (match, uri) => {
                        const absUri = new URL(uri, baseUrl).href;
                        return `URI="${proxyOrigin}/?url=${encodeURIComponent(absUri)}"`;
                    });
                }
                const absoluteSegmentUrl = new URL(trimmed, baseUrl).href;
                return `${proxyOrigin}/?url=${encodeURIComponent(absoluteSegmentUrl)}`;
            });

            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.status(response.status).send(rewrittenLines.join('\n'));
        }

        response.headers.forEach((val, key) => {
            const lowerKey = key.toLowerCase();
            if (lowerKey !== 'content-security-policy' && lowerKey !== 'x-frame-options' && lowerKey !== 'content-encoding') {
                res.setHeader(key, val);
            }
        });
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(response.status);
        response.body.pipe(res);

    } catch (err) {
        res.status(502).send('Proxy Error: ' + err.message);
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT}`);
});