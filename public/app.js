// ====================================
// BurNote - Self-Destructing Messages
// Frontend Application Logic
// ====================================

// Global state
let currentMessageId = null;
let currentLink = null;

// ========== Initialization ==========
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on a view page
    const path = window.location.pathname;
    if (path.startsWith('/view/')) {
        const messageId = path.split('/view/')[1];
        if (messageId) {
            showPage('view');
            checkMessage(messageId);
        }
    }

    // Character counter
    const messageInput = document.getElementById('messageInput');
    const charCount = document.getElementById('charCount');
    messageInput.addEventListener('input', () => {
        const len = messageInput.value.length;
        charCount.textContent = `${len.toLocaleString()} / 10,000`;
        if (len > 9000) {
            charCount.style.color = '#ff3355';
        } else {
            charCount.style.color = '';
        }
    });

    // Enter to submit password on view page
    const viewPassword = document.getElementById('viewPassword');
    viewPassword.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') revealMessage();
    });
});

// ========== Page Navigation ==========
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(`page-${pageName}`);
    if (page) {
        page.classList.add('active');
        // Force re-trigger animation
        page.style.animation = 'none';
        page.offsetHeight; // trigger reflow
        page.style.animation = '';
    }

    // If going back to create, push history
    if (pageName === 'create') {
        window.history.pushState({}, '', '/');
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
        return;
    }

    const btn = document.getElementById('createBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Creating...';

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

        document.getElementById('linkResult').style.display = 'block';
        
        // Trigger burn animation
        triggerBurnAnimation();

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
    btn.innerHTML = '<div class="spinner"></div> Decrypting...';

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
    }).catch(() => {
        // Fallback
        document.execCommand('copy');
        showToast('📋 Link copied!', 'success');
    });
}

// ========== Share on WhatsApp ==========
function shareWhatsApp() {
    if (!currentLink) return;

    // Send only the plain link - no surrounding text
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
    container.classList.add('active');

    const colors = ['#ff6b35', '#ff3355', '#ffaa00', '#ff5500', '#ff7744'];
    const particleCount = 40;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'fire-particle';
        
        const x = Math.random() * window.innerWidth;
        const y = window.innerHeight + 20;
        const size = Math.random() * 12 + 4;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const delay = Math.random() * 0.5;
        const duration = Math.random() * 1 + 1;

        particle.style.cssText = `
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            box-shadow: 0 0 ${size * 2}px ${color};
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
