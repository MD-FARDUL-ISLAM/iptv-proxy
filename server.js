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
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            },
            redirect: 'follow'
        });

        // কপি এবং ফ্লেক্সিবল হেডার সেটআপ
        response.headers.forEach((val, key) => {
            if (key.toLowerCase() !== 'content-security-policy' && key.toLowerCase() !== 'x-frame-options') {
                res.setHeader(key, val);
            }
        });
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(response.status);

        // স্ট্রিম সরাসরি পাইপ করা
        response.body.pipe(res);
    } catch (err) {
        res.status(502).send('Proxy Error: ' + err.message);
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT}`);
});