// =============================================
// BurNote v3 — Application Logic
// Features: QR, Security Score, Countdown,
//   Cipher Stream, Ember Canvas, Share API
// =============================================

// ——— State ———
let messageId = null;
let messageLink = null;
let messageExpiresAt = null;
let countdownTimer = null;
let burnCount = parseInt(localStorage.getItem('bn_burns') || '0');

// ——— Loaded ———
document.addEventListener('DOMContentLoaded', () => {
    updateBurnBadge();
    initEmberCanvas();
    initRotatingText();
    initSecurityScore();

    // Hide native share btn if not supported
    if (!navigator.share) {
        const btn = document.getElementById('nativeShareBtn');
        if (btn) btn.style.display = 'none';
    }

    // Route — view page?
    const path = window.location.pathname;
    if (path.startsWith('/view/')) {
        const id = path.split('/view/')[1];
        if (id) {
            switchView('read');
            checkMessage(id);
        }
    }

    // Textarea events
    const msg = document.getElementById('msgInput');
    if (msg) {
        msg.addEventListener('input', onMessageInput);
        msg.addEventListener('focus', () => document.getElementById('composeCard')?.classList.add('focus'));
        msg.addEventListener('blur', () => document.getElementById('composeCard')?.classList.remove('focus'));
    }

    // Password input — update security score
    const pw = document.getElementById('pwInput');
    if (pw) pw.addEventListener('input', calcSecurityScore);

    // Selects — update security score
    const expiry = document.getElementById('expirySelect');
    const views = document.getElementById('viewsSelect');
    if (expiry) expiry.addEventListener('change', calcSecurityScore);
    if (views) views.addEventListener('change', calcSecurityScore);

    // Enter on view password
    const viewPw = document.getElementById('viewPw');
    if (viewPw) viewPw.addEventListener('keydown', e => { if (e.key === 'Enter') revealMessage(); });

    // Initial security calc
    calcSecurityScore();
});

// ——— Message Input Handler ———
function onMessageInput() {
    const el = document.getElementById('msgInput');
    const len = el.value.length;
    const max = 10000;

    // Counter
    const counter = document.getElementById('charCounter');
    counter.textContent = `${len.toLocaleString()} / 10,000`;
    counter.classList.remove('warn', 'danger');
    if (len > 9000) counter.classList.add('danger');
    else if (len > 7000) counter.classList.add('warn');

    // Progress bar
    const bar = document.getElementById('charBar');
    const pct = (len / max) * 100;
    bar.style.width = pct + '%';
    bar.classList.toggle('warning', len > 8000);

    // Cipher preview
    updateCipher(el.value);

    // Auto-expand
    el.style.height = 'auto';
    el.style.height = Math.max(130, el.scrollHeight) + 'px';
}

// ——— Cipher Stream ———
function updateCipher(text) {
    const box = document.getElementById('cipherBox');
    const txt = document.getElementById('cipherText');
    if (!text.trim()) {
        box.classList.remove('active');
        txt.textContent = 'awaiting plaintext…';
        return;
    }
    box.classList.add('active');
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let cipher = '';
    const outLen = Math.min(text.length * 2 + 10, 140);
    for (let i = 0; i < outLen; i++) cipher += charset[Math.floor(Math.random() * charset.length)];
    txt.textContent = 'U2FsdGVkX1/' + cipher + '==';
}

// ——— Security Score ———
function calcSecurityScore() {
    const pw = document.getElementById('pwInput')?.value || '';
    const expiry = parseInt(document.getElementById('expirySelect')?.value || '1440');
    const views = parseInt(document.getElementById('viewsSelect')?.value || '1');

    let score = 0;
    // Password: +2 if set
    if (pw.length > 0) score += 1;
    if (pw.length >= 8) score += 1;
    // Short expiry: +1
    if (expiry <= 60) score += 1;
    // Minimal views: +1
    if (views <= 1) score += 1;
    // Bonus for very short expiry
    if (expiry <= 5) score += 1;

    score = Math.min(score, 5);

    const fill = document.getElementById('secFill');
    const val = document.getElementById('secScore');
    const hint = document.getElementById('secHint');

    val.textContent = `${score} / 5`;
    fill.style.width = (score / 5 * 100) + '%';

    fill.classList.remove('low', 'mid', 'high', 'max');
    if (score <= 1) { fill.classList.add('low'); hint.textContent = 'Low security — add a password and reduce expiry'; }
    else if (score <= 2) { fill.classList.add('mid'); hint.textContent = 'Moderate — consider a stronger password'; }
    else if (score <= 3) { fill.classList.add('high'); hint.textContent = 'Good — strong protection enabled'; }
    else { fill.classList.add('max'); hint.textContent = 'Maximum security — your message is fortress-level'; }
}

function initSecurityScore() { calcSecurityScore(); }

// ——— Rotating Hero Text ———
function initRotatingText() {
    const el = document.getElementById('heroRotate');
    if (!el) return;
    const words = ['self-destruct', 'vanish forever', 'burn on read', 'leave no trace'];
    let idx = 0;

    setInterval(() => {
        el.style.transition = 'all 0.35s ease';
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
        setTimeout(() => {
            idx = (idx + 1) % words.length;
            el.textContent = words[idx];
            el.style.transform = 'translateY(-8px)';
            requestAnimationFrame(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });
        }, 350);
    }, 3000);
}

// ——— Ember Canvas ———
function initEmberCanvas() {
    const canvas = document.getElementById('emberCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let embers = [];
    let mx = -999, my = -999;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Mouse tracking (desktop only to save mobile perf)
    if (window.matchMedia('(hover: hover)').matches) {
        document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
        document.addEventListener('mouseleave', () => { mx = -999; my = -999; });
    }

    class Ember {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + Math.random() * 100;
            this.size = Math.random() * 2.2 + 0.4;
            this.speedY = -(Math.random() * 0.6 + 0.15);
            this.speedX = (Math.random() - 0.5) * 0.25;
            this.life = 1;
            this.decay = Math.random() * 0.003 + 0.001;
            const hues = [15, 25, 35, 40];
            this.hue = hues[Math.floor(Math.random() * hues.length)];
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.life -= this.decay;

            // Mouse repulsion (desktop)
            if (mx > 0) {
                const dx = mx - this.x;
                const dy = my - this.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < 100) {
                    const f = (100 - d) / 100;
                    this.x -= (dx / d) * f * 0.8;
                    this.y -= (dy / d) * f * 0.8;
                }
            }

            if (this.life <= 0 || this.y < -10) this.reset();
        }
        draw() {
            const a = this.life * 0.4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 90%, 55%, ${a})`;
            ctx.fill();
        }
    }

    // Fewer particles on mobile
    const isMobile = window.innerWidth < 640;
    const count = isMobile ? 30 : 60;
    for (let i = 0; i < count; i++) {
        const e = new Ember();
        e.y = Math.random() * canvas.height; // Start scattered
        embers.push(e);
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Connection lines (desktop only)
        if (!isMobile) {
            for (let i = 0; i < embers.length; i++) {
                for (let j = i + 1; j < embers.length; j++) {
                    const dx = embers[i].x - embers[j].x;
                    const dy = embers[i].y - embers[j].y;
                    const d = dx * dx + dy * dy;
                    if (d < 14000) {
                        const a = (1 - d / 14000) * 0.06 * embers[i].life * embers[j].life;
                        ctx.beginPath();
                        ctx.moveTo(embers[i].x, embers[i].y);
                        ctx.lineTo(embers[j].x, embers[j].y);
                        ctx.strokeStyle = `rgba(255,107,53,${a})`;
                        ctx.lineWidth = 0.4;
                        ctx.stroke();
                    }
                }
            }
        }

        embers.forEach(e => { e.update(); e.draw(); });
        requestAnimationFrame(draw);
    }
    draw();
}

// ——— Views ———
function switchView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const v = document.getElementById(name === 'read' ? 'viewRead' : 'viewCreate');
    if (v) { v.classList.add('active'); }
}

function goHome() {
    switchView('create');
    window.history.pushState({}, '', '/');
    createAnother();
}

// ——— Create Message ———
async function createMessage() {
    const content = document.getElementById('msgInput').value.trim();
    const password = document.getElementById('pwInput').value;
    const expiresIn = parseInt(document.getElementById('expirySelect').value);
    const maxViews = parseInt(document.getElementById('viewsSelect').value);

    if (!content) {
        toast('Write a message first!', 'err');
        shake(document.getElementById('msgInput'));
        document.getElementById('msgInput').focus();
        return;
    }

    const btn = document.getElementById('createBtn');
    btn.disabled = true;
    btn.classList.add('loading');

    try {
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, password, expiresIn, maxViews })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Something went wrong');

        messageId = data.id;
        messageLink = data.link;
        messageExpiresAt = new Date(data.expiresAt).getTime();

        // Show result
        document.getElementById('linkOutput').value = data.link;
        document.getElementById('resultInfo').textContent =
            `Self-destructs in ${expiryLabel(expiresIn)} or after ${maxViews} read${maxViews > 1 ? 's' : ''}`;

        // Hide compose, show result
        document.getElementById('composeCard').style.display = 'none';
        document.getElementById('resultPanel').classList.add('show');

        // QR code
        generateQR(data.link);

        // Start countdown
        startCountdown();

        // Burn animation
        fireBurn();

        // Increment counter
        burnCount++;
        localStorage.setItem('bn_burns', burnCount.toString());
        updateBurnBadge();

        // Haptic feedback on mobile
        if (navigator.vibrate) navigator.vibrate(50);

        toast('🔥 Secret link created!', 'ok');

        // Scroll to result
        document.getElementById('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
        toast(err.message, 'err');
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

// ——— QR Code ———
function generateQR(url) {
    const container = document.getElementById('qrCode');
    container.innerHTML = '';
    try {
        if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
            const canvas = document.createElement('canvas');
            QRCode.toCanvas(canvas, url, {
                width: 150,
                margin: 1,
                color: { dark: '#000000', light: '#ffffff' }
            }, (err) => {
                if (!err) container.appendChild(canvas);
            });
        } else if (typeof QRCode !== 'undefined' && QRCode.toDataURL) {
            QRCode.toDataURL(url, { width: 150, margin: 1 }, (err, dataUrl) => {
                if (!err) {
                    const img = document.createElement('img');
                    img.src = dataUrl;
                    img.width = 150;
                    img.height = 150;
                    img.style.borderRadius = '4px';
                    container.appendChild(img);
                }
            });
        } else {
            // Fallback: hide QR section
            document.getElementById('qrSection').style.display = 'none';
        }
    } catch (e) {
        document.getElementById('qrSection').style.display = 'none';
    }
}

// ——— Countdown ———
function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    tick();
    countdownTimer = setInterval(tick, 1000);
}

function tick() {
    if (!messageExpiresAt) return;
    const diff = Math.max(0, messageExpiresAt - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    const hEl = document.getElementById('cdHours');
    const mEl = document.getElementById('cdMins');
    const sEl = document.getElementById('cdSecs');
    if (hEl) hEl.textContent = String(h).padStart(2, '0');
    if (mEl) mEl.textContent = String(m).padStart(2, '0');
    if (sEl) sEl.textContent = String(s).padStart(2, '0');

    if (diff <= 0 && countdownTimer) clearInterval(countdownTimer);
}

// ——— Share Functions ———
function copyLink() {
    const input = document.getElementById('linkOutput');
    const btn = document.getElementById('copyBtn');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 600);
        toast('📋 Copied!', 'ok');
    }).catch(() => {
        document.execCommand('copy');
        toast('📋 Copied!', 'ok');
    });
}

function shareWhatsApp() {
    if (!messageLink) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(messageLink)}`, '_blank');
    toast('Opening WhatsApp…', 'ok');
}

function shareTelegram() {
    if (!messageLink) return;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(messageLink)}&text=Secret%20message%20for%20you`, '_blank');
    toast('Opening Telegram…', 'ok');
}

function shareEmail() {
    if (!messageLink) return;
    window.open(`mailto:?subject=Secret%20Message&body=I%20sent%20you%20a%20self-destructing%20message%3A%20${encodeURIComponent(messageLink)}`, '_blank');
}

async function shareNative() {
    if (!messageLink || !navigator.share) return;
    try {
        await navigator.share({ title: 'BurNote Secret', text: 'I sent you a self-destructing message:', url: messageLink });
    } catch (e) { /* user cancelled */ }
}

// ——— Create Another ———
function createAnother() {
    document.getElementById('msgInput').value = '';
    document.getElementById('pwInput').value = '';
    document.getElementById('charCounter').textContent = '0 / 10,000';
    document.getElementById('charBar').style.width = '0%';
    document.getElementById('composeCard').style.display = '';
    document.getElementById('resultPanel').classList.remove('show');

    const cBox = document.getElementById('cipherBox');
    cBox.classList.remove('active');
    document.getElementById('cipherText').textContent = 'awaiting plaintext…';

    document.getElementById('expirySelect').value = '1440';
    document.getElementById('viewsSelect').value = '1';

    // Reset textarea height
    const ta = document.getElementById('msgInput');
    ta.style.height = '';

    messageId = null;
    messageLink = null;
    messageExpiresAt = null;
    if (countdownTimer) clearInterval(countdownTimer);

    calcSecurityScore();
    ta.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ——— Destroy Now ———
async function destroyNow() {
    if (!messageId) return;
    try {
        const res = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
        if (res.ok) {
            fireBurn();
            if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
            toast('💀 Destroyed permanently!', 'ok');
            setTimeout(createAnother, 1400);
        }
    } catch { toast('Failed to destroy', 'err'); }
}

// ——— Check Message (View Page) ———
async function checkMessage(id) {
    messageId = id;
    showReadState('readLoading');

    try {
        const res = await fetch(`/api/messages/${id}/check`);
        const data = await res.json();

        if (data.exists) {
            showReadState('readConfirm');
            if (data.hasPassword) {
                document.getElementById('readPwField').style.display = 'block';
            }
        } else {
            showReadState('readGone');
        }
    } catch {
        showReadState('readGone');
    }
}

// ——— Reveal Message ———
async function revealMessage() {
    const password = document.getElementById('viewPw')?.value || '';
    const btn = document.getElementById('revealBtn');
    btn.disabled = true;
    btn.classList.add('loading');

    try {
        const res = await fetch(`/api/messages/${messageId}/reveal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');

        document.getElementById('revealedMsg').textContent = data.content;
        showReadState('readContent');

        if (data.destroyed) {
            document.getElementById('destroyedTag').style.display = 'block';
            fireBurn();
            if (navigator.vibrate) navigator.vibrate(50);
        }

    } catch (err) {
        if (err.message.includes('password') || err.message.includes('Invalid')) {
            toast('Wrong password!', 'err');
            shake(document.getElementById('viewPw'));
        } else {
            toast(err.message, 'err');
        }
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

function showReadState(id) {
    document.querySelectorAll('.read-state').forEach(s => s.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
}

// ——— Toast ———
function toast(msg, type = 'ok') {
    const rack = document.getElementById('toastRack');
    if (!rack) return;
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.textContent = msg;
    rack.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ——— Burn Badge ———
function updateBurnBadge() {
    const el = document.getElementById('burnCount');
    if (el) el.textContent = burnCount;
}

// ——— Burn Animation ———
function fireBurn() {
    const overlay = document.getElementById('burnOverlay');
    if (!overlay) return;
    overlay.classList.add('active');

    const colors = ['#ff6b35', '#ff2d55', '#ffaa00', '#ff5500', '#ff7744', '#e01b6a', '#ffd700'];
    for (let i = 0; i < 55; i++) {
        const p = document.createElement('div');
        p.className = 'burn-particle';
        const x = Math.random() * window.innerWidth;
        const y = window.innerHeight + 20;
        const size = Math.random() * 14 + 3;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const delay = Math.random() * 0.5;
        const dur = Math.random() * 1.2 + 0.9;
        p.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};box-shadow:0 0 ${size * 2}px ${color},0 0 ${size * 4}px ${color}30;animation-delay:${delay}s;animation-duration:${dur}s;`;
        overlay.appendChild(p);
    }

    setTimeout(() => { overlay.innerHTML = ''; overlay.classList.remove('active'); }, 2500);
}

// ——— Shake ———
function shake(el) {
    if (!el) return;
    el.style.transition = 'transform 0.08s';
    const seq = [-5, 5, -4, 4, -2, 2, 0];
    seq.forEach((v, i) => {
        setTimeout(() => { el.style.transform = `translateX(${v}px)`; }, i * 60);
    });
}

// ——— Utils ———
function expiryLabel(min) {
    if (min < 60) return `${min} min`;
    if (min < 1440) return `${min / 60} hr${min > 60 ? 's' : ''}`;
    return `${min / 1440} day${min > 1440 ? 's' : ''}`;
}
