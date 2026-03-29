// ====================================
// BurNote - Self-Destructing Messages
// Frontend Application Logic v2.0
// ====================================

// Global state
let currentMessageId = null;
let currentLink = null;
let burnCount = parseInt(localStorage.getItem('burnote_burn_count') || '0');

// ========== Initialization ==========
document.addEventListener('DOMContentLoaded', () => {
    // Update burn counter display
    updateBurnCounter();

    // Typewriter effect for hero title
    startTypewriter();

    // Particle background
    initParticleCanvas();

    // Feature cards stagger animation
    animateFeatures();

    // Check if we're on a view page
    const path = window.location.pathname;
    if (path.startsWith('/view/')) {
        const messageId = path.split('/view/')[1];
        if (messageId) {
            showPage('view');
            checkMessage(messageId);
        }
    }

    // Character counter with live encryption preview
    const messageInput = document.getElementById('messageInput');
    const charCount = document.getElementById('charCount');

    if (messageInput) {
        messageInput.addEventListener('input', () => {
            const len = messageInput.value.length;
            charCount.textContent = `${len.toLocaleString()} / 10,000`;

            if (len > 9000) {
                charCount.style.color = '#ff3355';
            } else if (len > 7000) {
                charCount.style.color = '#ffaa00';
            } else {
                charCount.style.color = '';
            }

            // Live encryption preview
            updateEncryptionPreview(messageInput.value);
        });

        // Focus effect
        messageInput.addEventListener('focus', () => {
            document.getElementById('createCard')?.classList.add('focused');
        });
        messageInput.addEventListener('blur', () => {
            document.getElementById('createCard')?.classList.remove('focused');
        });
    }

    // Enter to submit password on view page
    const viewPassword = document.getElementById('viewPassword');
    if (viewPassword) {
        viewPassword.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') revealMessage();
        });
    }
});

// ========== Typewriter Effect ==========
function startTypewriter() {
    const element = document.getElementById('heroTypewriter');
    if (!element) return;

    const phrases = [
        'Send secrets safely.',
        'Burn after reading.',
        'No traces left behind.',
        'Privacy, guaranteed.',
        'One-time messages.',
    ];

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let pauseTime = 0;

    function type() {
        const currentPhrase = phrases[phraseIndex];

        if (pauseTime > 0) {
            pauseTime--;
            requestAnimationFrame(() => setTimeout(type, 50));
            return;
        }

        if (!isDeleting) {
            element.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++;

            if (charIndex === currentPhrase.length) {
                isDeleting = true;
                pauseTime = 40; // Pause at end
            }
        } else {
            element.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--;

            if (charIndex === 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                pauseTime = 10; // Pause before next phrase
            }
        }

        const speed = isDeleting ? 35 : 65;
        requestAnimationFrame(() => setTimeout(type, speed));
    }

    setTimeout(type, 800);
}

// ========== Live Encryption Preview ==========
function updateEncryptionPreview(text) {
    const preview = document.getElementById('encryptionPreview');
    const encText = document.getElementById('encryptionText');

    if (!preview || !encText) return;

    if (!text.trim()) {
        preview.classList.remove('active');
        encText.textContent = 'Waiting for input...';
        return;
    }

    preview.classList.add('active');

    // Generate a visually interesting "encrypted" preview
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let encrypted = '';
    for (let i = 0; i < Math.min(text.length * 2, 120); i++) {
        encrypted += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Add Base64-like formatting
    const formatted = encrypted.match(/.{1,32}/g)?.join('\n') || encrypted;
    encText.textContent = `U2FsdGVkX1/${formatted}...`;
}

// ========== Particle Canvas Background ==========
function initParticleCanvas() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouseX = -999;
    let mouseY = -999;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Track mouse for interactivity
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    document.addEventListener('mouseleave', () => {
        mouseX = -999;
        mouseY = -999;
    });

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.baseX = this.x;
            this.baseY = this.y;
            this.size = Math.random() * 1.8 + 0.3;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.4 + 0.1;
            this.targetOpacity = this.opacity;

            // Random warm color (orange/red/amber spectrum)
            const hue = 15 + Math.random() * 30; // 15-45 range
            const sat = 80 + Math.random() * 20;
            const light = 50 + Math.random() * 20;
            this.color = `hsla(${hue}, ${sat}%, ${light}%, `;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            // Mouse interaction: if close, gently push away
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const interactRadius = 120;

            if (dist < interactRadius) {
                const force = (interactRadius - dist) / interactRadius;
                this.x -= (dx / dist) * force * 1.5;
                this.y -= (dy / dist) * force * 1.5;
                this.targetOpacity = Math.min(this.opacity + 0.3, 0.8);
            } else {
                this.targetOpacity = this.opacity;
            }

            // Wrap around edges
            if (this.x < -10) this.x = canvas.width + 10;
            if (this.x > canvas.width + 10) this.x = -10;
            if (this.y < -10) this.y = canvas.height + 10;
            if (this.y > canvas.height + 10) this.y = -10;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color + this.targetOpacity + ')';
            ctx.fill();
        }
    }

    // Create particles
    const count = Math.min(Math.floor((canvas.width * canvas.height) / 12000), 100);
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }

    // Draw connections between nearby particles
    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 130) {
                    const opacity = (1 - dist / 130) * 0.08;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(255, 107, 53, ${opacity})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.update();
            p.draw();
        });
        drawConnections();

        requestAnimationFrame(animate);
    }

    animate();
}

// ========== Feature Cards Stagger Animation ==========
function animateFeatures() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-item, .step').forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s`;
        observer.observe(el);
    });
}

// ========== Burn Counter ==========
function updateBurnCounter() {
    const el = document.getElementById('burnCounter');
    if (el) {
        animateCounter(el, burnCount);
    }
}

function animateCounter(element, target) {
    const current = parseInt(element.textContent) || 0;
    if (current === target) return;

    const diff = target - current;
    const step = diff > 0 ? 1 : -1;
    let count = current;

    const interval = setInterval(() => {
        count += step;
        element.textContent = count;
        if (count === target) clearInterval(interval);
    }, 50);
}

function incrementBurnCount() {
    burnCount++;
    localStorage.setItem('burnote_burn_count', burnCount.toString());
    updateBurnCounter();
}

// ========== Page Navigation ==========
function showPage(pageName) {
    const currentPage = document.querySelector('.page.active');
    if (currentPage) {
        currentPage.classList.add('page-exit');
        setTimeout(() => {
            currentPage.classList.remove('active', 'page-exit');
            activatePage(pageName);
        }, 250);
    } else {
        activatePage(pageName);
    }

    if (pageName === 'create') {
        window.history.pushState({}, '', '/');
    }
}

function activatePage(pageName) {
    const page = document.getElementById(`page-${pageName}`);
    if (page) {
        page.classList.add('active');
        page.style.animation = 'none';
        page.offsetHeight;
        page.style.animation = '';
    }
}

// ========== Create Message ==========
async function createMessage() {
    const content = document.getElementById('messageInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const expiresIn = parseInt(document.getElementById('expirySelect').value);
    const maxViews = parseInt(document.getElementById('viewsSelect').value);

    if (!content) {
        showToast('Please write a message first!', 'error');
        document.getElementById('messageInput').focus();
        shakeElement(document.getElementById('messageInput'));
        return;
    }

    const btn = document.getElementById('createBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;display:inline-block;"></div> Encrypting...';

    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, password, expiresIn, maxViews })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong');
        }

        currentMessageId = data.id;
        currentLink = data.link;

        // Show the link result
        const linkOutput = document.getElementById('linkOutput');
        linkOutput.value = data.link;

        // Calculate expiry info
        const expiryText = getExpiryText(expiresIn);
        const viewText = maxViews === 1 ? '1 view' : `${maxViews} views`;
        document.getElementById('linkExpireInfo').textContent = `Self-destructs after ${viewText} or ${expiryText}`;

        document.getElementById('linkResult').style.display = 'block';

        // Trigger burn animation
        triggerBurnAnimation();

        // Increment burn counter
        incrementBurnCount();

        showToast('🔥 Secret message created!', 'success');

        // Scroll to result
        document.getElementById('linkResult').scrollIntoView({ behavior: 'smooth', block: 'center' });

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🔥 Burn & Create Link';
    }
}

function getExpiryText(minutes) {
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    if (minutes < 1440) return `${minutes / 60} hour${minutes > 60 ? 's' : ''}`;
    return `${minutes / 1440} day${minutes > 1440 ? 's' : ''}`;
}

// ========== Shake Animation ==========
function shakeElement(el) {
    el.style.transition = 'transform 0.1s';
    el.style.transform = 'translateX(-4px)';
    setTimeout(() => { el.style.transform = 'translateX(4px)'; }, 100);
    setTimeout(() => { el.style.transform = 'translateX(-3px)'; }, 200);
    setTimeout(() => { el.style.transform = 'translateX(3px)'; }, 300);
    setTimeout(() => { el.style.transform = 'translateX(0)'; }, 400);
}

// ========== Check Message ==========
async function checkMessage(id) {
    currentMessageId = id;

    // Show loading
    document.getElementById('viewLoading').style.display = 'block';
    document.getElementById('viewConfirm').style.display = 'none';
    document.getElementById('viewContent').style.display = 'none';
    document.getElementById('viewNotFound').style.display = 'none';

    try {
        const response = await fetch(`/api/messages/${id}/check`);
        const data = await response.json();

        document.getElementById('viewLoading').style.display = 'none';

        if (data.exists) {
            document.getElementById('viewConfirm').style.display = 'block';

            // Show password field if needed
            if (data.hasPassword) {
                document.getElementById('passwordField').style.display = 'block';
            }
        } else {
            document.getElementById('viewNotFound').style.display = 'block';
        }
    } catch (err) {
        document.getElementById('viewLoading').style.display = 'none';
        document.getElementById('viewNotFound').style.display = 'block';
    }
}

// ========== Reveal Message ==========
async function revealMessage() {
    const password = document.getElementById('viewPassword').value;
    const btn = document.getElementById('revealBtn');

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;display:inline-block;"></div> Decrypting...';

    try {
        const response = await fetch(`/api/messages/${currentMessageId}/reveal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to reveal message');
        }

        // Show message content
        document.getElementById('viewConfirm').style.display = 'none';
        document.getElementById('viewContent').style.display = 'block';
        document.getElementById('messageDisplay').textContent = data.content;

        if (data.destroyed) {
            document.getElementById('destroyedNotice').style.display = 'flex';
            triggerBurnAnimation();
        } else {
            document.getElementById('destroyedNotice').style.display = 'none';
        }

    } catch (err) {
        if (err.message.includes('password') || err.message.includes('Invalid')) {
            showToast('Wrong password. Try again!', 'error');
            shakeElement(document.getElementById('viewPassword'));
        } else {
            showToast(err.message, 'error');
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = '👁️ Reveal Secret Message';
    }
}

// ========== Copy Link ==========
function copyLink() {
    const linkOutput = document.getElementById('linkOutput');
    linkOutput.select();

    navigator.clipboard.writeText(linkOutput.value).then(() => {
        showToast('📋 Link copied to clipboard!', 'success');
        // Visual feedback
        const btn = linkOutput.nextElementSibling;
        btn.classList.add('copy-success');
        setTimeout(() => btn.classList.remove('copy-success'), 400);
    }).catch(() => {
        document.execCommand('copy');
        showToast('📋 Link copied!', 'success');
    });
}

// ========== Share on WhatsApp ==========
function shareWhatsApp() {
    if (!currentLink) return;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(currentLink)}`;
    window.open(whatsappUrl, '_blank');

    showToast('📱 Opening WhatsApp...', 'success');
}

// ========== Create Another ==========
function createAnother() {
    document.getElementById('messageInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('charCount').textContent = '0 / 10,000';
    document.getElementById('linkResult').style.display = 'none';
    document.getElementById('expirySelect').value = '1440';
    document.getElementById('viewsSelect').value = '1';

    // Reset encryption preview
    const preview = document.getElementById('encryptionPreview');
    const encText = document.getElementById('encryptionText');
    if (preview) preview.classList.remove('active');
    if (encText) encText.textContent = 'Waiting for input...';

    currentMessageId = null;
    currentLink = null;

    document.getElementById('messageInput').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== Destroy Now ==========
async function destroyNow() {
    if (!currentMessageId) return;

    try {
        const response = await fetch(`/api/messages/${currentMessageId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            triggerBurnAnimation();
            showToast('💀 Message destroyed permanently!', 'success');
            setTimeout(() => {
                createAnother();
            }, 1500);
        }
    } catch (err) {
        showToast('Failed to destroy message', 'error');
    }
}

// ========== Toast Notification ==========
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ========== Burn Animation ==========
function triggerBurnAnimation() {
    const container = document.getElementById('burnAnimation');
    if (!container) return;

    container.classList.add('active');

    const colors = ['#ff6b35', '#ff3355', '#ffaa00', '#ff5500', '#ff7744', '#ff1a6c'];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'fire-particle';

        const x = Math.random() * window.innerWidth;
        const y = window.innerHeight + 20;
        const size = Math.random() * 14 + 4;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const delay = Math.random() * 0.6;
        const duration = Math.random() * 1.2 + 0.8;

        particle.style.cssText = `
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            box-shadow: 0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color}40;
            animation-delay: ${delay}s;
            animation-duration: ${duration}s;
        `;

        container.appendChild(particle);
    }

    setTimeout(() => {
        container.innerHTML = '';
        container.classList.remove('active');
    }, 2500);
}
