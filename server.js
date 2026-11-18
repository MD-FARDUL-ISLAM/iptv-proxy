const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

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
        const proxyOrigin = `${req.protocol}://${req.get('host')}`;
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            },
            redirect: 'follow'
        });

        const contentType = response.headers.get('Content-Type') || '';
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');
        newHeaders.delete('Content-Security-Policy');
        newHeaders.delete('X-Frame-Options');

        // যদি ফাইলটি .m3u8 বা প্লেলিস্ট হয়, তবে ভেতরের লিংকগুলো প্রক্সি দিয়ে রিরাইট করে দিতে হবে
        if (targetUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('x-mpegURL')) {
            let playlistText = await response.text();
            const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

            const rewrittenLines = playlistText.split('\n').map(line => {
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

            newHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
            return res.status(response.status).send(rewrittenLines.join('\n'));
        }

        // সাধারণ স্ট্রিম বা বাইনারি ফাইল হলে সরাসরি পাইপ করা
        response.headers.forEach((val, key) => {
            if (key.toLowerCase() !== 'content-security-policy' && key.toLowerCase() !== 'x-frame-options') {
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