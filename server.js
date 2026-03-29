const express = require('express');
const { v4: uuidv4 } = require('uuid');
const CryptoJS = require('crypto-js');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'messages.json');

// Trust proxy headers (needed for tunnels/cloud hosting)
app.set('trust proxy', true);

// ====== File-based message store (survives restarts) ======
function loadMessages() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            return new Map(JSON.parse(data));
        }
    } catch (err) {
        console.log('Starting with fresh message store');
    }
    return new Map();
}

function saveMessages() {
    try {
        const data = JSON.stringify([...messages]);
        fs.writeFileSync(DB_FILE, data, 'utf8');
    } catch (err) {
        console.error('Failed to save messages:', err.message);
    }
}

const messages = loadMessages();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ====== Create a new secret message ======
app.post('/api/messages', (req, res) => {
    const { content, password, expiresIn, maxViews } = req.body;

    if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Message content is required' });
    }

    if (content.length > 10000) {
        return res.status(400).json({ error: 'Message too long (max 10,000 characters)' });
    }

    const id = uuidv4();
    const now = Date.now();

    const expirationMinutes = expiresIn || 1440;
    const expiresAt = now + (expirationMinutes * 60 * 1000);

    const encryptionKey = password || id;
    const encrypted = CryptoJS.AES.encrypt(content, encryptionKey).toString();

    messages.set(id, {
        content: encrypted,
        hasPassword: !!password,
        expiresAt,
        maxViews: maxViews || 1,
        viewCount: 0,
        createdAt: now
    });

    saveMessages(); // Save to file

    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('x-forwarded-host') || req.get('host');
    const link = `${protocol}://${host}/view/${id}`;

    res.json({
        id,
        link,
        expiresAt: new Date(expiresAt).toISOString(),
        hasPassword: !!password
    });
});

// ====== Check if message exists ======
app.get('/api/messages/:id/check', (req, res) => {
    const { id } = req.params;
    const message = messages.get(id);

    if (!message) {
        return res.json({ exists: false });
    }

    if (Date.now() > message.expiresAt) {
        messages.delete(id);
        saveMessages();
        return res.json({ exists: false });
    }

    res.json({
        exists: true,
        hasPassword: message.hasPassword,
        expiresAt: new Date(message.expiresAt).toISOString()
    });
});

// ====== Reveal (and destroy) a message ======
app.post('/api/messages/:id/reveal', (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    const message = messages.get(id);

    if (!message) {
        return res.status(404).json({ error: 'Message not found or already destroyed' });
    }

    if (Date.now() > message.expiresAt) {
        messages.delete(id);
        saveMessages();
        return res.status(404).json({ error: 'Message has expired' });
    }

    const decryptionKey = password || id;
    try {
        const decrypted = CryptoJS.AES.decrypt(message.content, decryptionKey);
        const content = decrypted.toString(CryptoJS.enc.Utf8);

        if (!content) {
            return res.status(403).json({ error: 'Invalid password' });
        }

        message.viewCount++;

        if (message.viewCount >= message.maxViews) {
            messages.delete(id);
        }

        saveMessages(); // Save after view/destroy

        res.json({
            content,
            destroyed: message.viewCount >= message.maxViews,
            viewCount: message.viewCount,
            maxViews: message.maxViews
        });
    } catch (err) {
        return res.status(403).json({ error: 'Invalid password' });
    }
});

// ====== Manually destroy a message ======
app.delete('/api/messages/:id', (req, res) => {
    const { id } = req.params;
    if (messages.has(id)) {
        messages.delete(id);
        saveMessages();
        return res.json({ destroyed: true });
    }
    res.status(404).json({ error: 'Message not found' });
});

// Serve the view page
app.get('/view/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view.html'));
});

// Cleanup expired messages every 5 minutes
setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [id, msg] of messages) {
        if (now > msg.expiresAt) {
            messages.delete(id);
            changed = true;
        }
    }
    if (changed) saveMessages();
}, 5 * 60 * 1000);

app.listen(PORT, () => {
    console.log(`🔥 BurNote is running at http://localhost:${PORT}`);
});
