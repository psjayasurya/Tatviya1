/* ═══════════════════════════════════════════════════════════
   TATVIYA — PREMIUM SCRIPT
   Theme System · Particle Canvas · 3D Tilt · Magnetic · Reveals
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────
   PAGE LOADER
────────────────────────────────────────── */
window.addEventListener('load', () => {
    const loader = document.getElementById('pageLoader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('hidden');
        }, 900);
    }
});


/* ──────────────────────────────────────────
   THEME SYSTEM
────────────────────────────────────────── */

const THEME_KEY = 'tatviya-theme';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);

    // Sync swatch states
    document.querySelectorAll('.theme-swatch').forEach(sw => {
        sw.classList.toggle('active', sw.dataset.theme === theme);
    });

    // Reinit particles with new color
    setTimeout(initParticles, 100);
}

// Load saved or default theme
const savedTheme = localStorage.getItem(THEME_KEY) || 'midnight';
applyTheme(savedTheme);

// Theme panel open/close
const themePanel    = document.getElementById('themePanel');
const themeBackdrop = document.getElementById('themeBackdrop');
const themeToggle   = document.getElementById('themeToggleBtn');
const closePanelBtn = document.getElementById('closePanelBtn');

function openThemePanel() {
    if (themePanel && themeBackdrop) {
        themePanel.classList.add('open');
        themeBackdrop.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }
}

function closeThemePanel() {
    if (themePanel && themeBackdrop) {
        themePanel.classList.remove('open');
        themeBackdrop.classList.remove('visible');
        document.body.style.overflow = '';
    }
}

if (themeToggle)   themeToggle.addEventListener('click', openThemePanel);
if (closePanelBtn) closePanelBtn.addEventListener('click', closeThemePanel);
if (themeBackdrop) themeBackdrop.addEventListener('click', closeThemePanel);

// ESC to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeThemePanel();
});

// Swatch click
document.querySelectorAll('.theme-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
        applyTheme(swatch.dataset.theme);
    });
});


/* ──────────────────────────────────────────
   SCROLL PROGRESS BAR
────────────────────────────────────────── */

const scrollProgress = document.getElementById('scrollProgress');

function updateScrollProgress() {
    if (!scrollProgress) return;
    const scrollTop    = window.scrollY;
    const docHeight    = document.documentElement.scrollHeight - window.innerHeight;
    const pct          = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    scrollProgress.style.width = pct + '%';
}

window.addEventListener('scroll', updateScrollProgress, { passive: true });


/* ──────────────────────────────────────────
   NAVBAR – SCROLL + ACTIVE LINK
────────────────────────────────────────── */

const navbar = document.getElementById('navbar');

function updateNavbar() {
    if (!navbar) return;
    if (window.scrollY > 60) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    // Active link detection
    const sections = document.querySelectorAll('section[id]');
    let current = '';
    sections.forEach(sec => {
        if (window.scrollY >= sec.offsetTop - 160) {
            current = sec.getAttribute('id');
        }
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href').replace('#', '');
        link.classList.toggle('active', href === current);
    });
}

window.addEventListener('scroll', updateNavbar, { passive: true });
updateNavbar();


/* ──────────────────────────────────────────
   MOBILE NAVIGATION
────────────────────────────────────────── */

const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('active');
        hamburger.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', isOpen);
    });
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        if (navLinks) navLinks.classList.remove('active');
        if (hamburger) hamburger.classList.remove('open');
    });
});


/* ──────────────────────────────────────────
   SMOOTH SCROLL
────────────────────────────────────────── */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});


/* ──────────────────────────────────────────
   PARTICLE CANVAS
────────────────────────────────────────── */

const canvas = document.getElementById('particleCanvas');
let ctx, particles = [], animId;

function getParticleRGB() {
    const theme = document.documentElement.getAttribute('data-theme') || 'midnight';
    const map = {
        midnight: [255, 107, 53],
        solar:    [201, 168, 76],
        nebula:   [168, 85, 247],
        emerald:  [16, 185, 129],
        crimson:  [220, 38, 38],
    };
    return map[theme] || map.midnight;
}

function resizeCanvas() {
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth  || canvas.parentElement.offsetWidth;
    canvas.height = canvas.offsetHeight || canvas.parentElement.offsetHeight;
}

class Particle {
    constructor(w, h) {
        this.w = w; this.h = h;
        this.reset();
    }

    reset() {
        this.x      = Math.random() * this.w;
        this.y      = Math.random() * this.h;
        this.vx     = (Math.random() - 0.5) * 0.55;
        this.vy     = (Math.random() - 0.5) * 0.55;
        this.radius = Math.random() * 1.8 + 0.6;
        this.alpha  = Math.random() * 0.45 + 0.1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > this.w) this.vx *= -1;
        if (this.y < 0 || this.y > this.h) this.vy *= -1;
    }

    draw(ctx, rgb) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${this.alpha})`;
        ctx.fill();
    }
}

function connectParticles(rgb) {
    const max = 110;
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx   = particles[i].x - particles[j].x;
            const dy   = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < max) {
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                const a = (1 - dist / max) * 0.14;
                ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
                ctx.lineWidth   = 1;
                ctx.stroke();
            }
        }
    }
}

function animateParticles() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rgb = getParticleRGB();
    particles.forEach(p => { p.update(); p.draw(ctx, rgb); });
    connectParticles(rgb);
    animId = requestAnimationFrame(animateParticles);
}

function initParticles() {
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resizeCanvas();

    const count = Math.min(90, Math.floor((canvas.width * canvas.height) / 10000));
    particles = Array.from({ length: count }, () => new Particle(canvas.width, canvas.height));

    if (animId) cancelAnimationFrame(animId);
    animateParticles();
}

if (canvas) {
    initParticles();
    window.addEventListener('resize', () => {
        resizeCanvas();
        particles.forEach(p => { p.w = canvas.width; p.h = canvas.height; });
    }, { passive: true });
}


/* ──────────────────────────────────────────
   3D TILT ON SERVICE CARDS
────────────────────────────────────────── */

document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect    = card.getBoundingClientRect();
        const x       = e.clientX - rect.left;
        const y       = e.clientY - rect.top;
        const cx      = rect.width  / 2;
        const cy      = rect.height / 2;
        const rotX    = ((y - cy) / cy) * -8;
        const rotY    = ((x - cx) / cx) * 8;

        card.style.transform  = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-8px)`;
        card.style.transition = 'transform 0.05s linear, box-shadow 0.3s ease, border-color 0.3s ease';

        const glow = card.querySelector('.card-glow');
        if (glow) {
            glow.style.background = `radial-gradient(circle at ${x}px ${y}px, var(--primary-glow), transparent 65%)`;
        }
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform  = '';
        card.style.transition = 'transform 0.5s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease, border-color 0.3s ease';
    });
});


/* ──────────────────────────────────────────
   MAGNETIC CTA BUTTONS
────────────────────────────────────────── */

document.querySelectorAll('.cta-btn, .submit-btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
        const rect  = btn.getBoundingClientRect();
        const x     = e.clientX - rect.left - rect.width  / 2;
        const y     = e.clientY - rect.top  - rect.height / 2;
        btn.style.transform  = `translate(${x * 0.18}px, ${y * 0.18}px)`;
        btn.style.transition = 'transform 0.15s ease';
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.transform  = '';
        btn.style.transition = 'transform 0.5s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease';
    });
});


/* ──────────────────────────────────────────
   SCROLL REVEAL ANIMATIONS
────────────────────────────────────────── */

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px',
});

function initReveal() {
    const targets = document.querySelectorAll(
        '.reveal, .service-card, .testimonial-card, .team-card, .feature-item'
    );
    targets.forEach((el, i) => {
        el.style.transitionDelay = `${(i % 4) * 0.1}s`;
        revealObserver.observe(el);
    });
}

initReveal();


/* ──────────────────────────────────────────
   HERO STAT COUNTER ANIMATION
────────────────────────────────────────── */

function animateCounter(el, target, suffix, duration = 1800) {
    const isFloat   = !Number.isInteger(target);
    const decimals  = isFloat ? 1 : 0;
    const step      = target / (duration / 16);
    let current     = 0;

    const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current.toFixed(decimals) + suffix;
        if (current >= target) clearInterval(timer);
    }, 16);
}

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el     = entry.target;
            const target = parseFloat(el.dataset.target);
            const suffix = el.dataset.suffix || '';
            if (!el.dataset.animated) {
                el.dataset.animated = 'true';
                animateCounter(el, target, suffix);
            }
            counterObserver.unobserve(el);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.hero-stat-num').forEach(el => {
    counterObserver.observe(el);
});


/* ──────────────────────────────────────────
   CONTACT FORM HANDLING
────────────────────────────────────────── */

const FORM_ENDPOINT = 'https://formsubmit.co/ajax/contact@tatviya.com';
let isSubmitting    = false;

const contactForm = document.getElementById('contactForm');

if (contactForm) {
    const submitBtn      = document.getElementById('submitBtn');
    const origBtnHTML    = submitBtn ? submitBtn.innerHTML : '';

    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (isSubmitting) return;

        const name    = this.elements.name.value.trim();
        const email   = this.elements.email.value.trim();
        const subject = this.elements.subject.value.trim();
        const message = this.elements.message.value.trim();

        // Validate
        if (!name) { showToast('Please enter your name.', 'error'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showToast('Please enter a valid email address.', 'error');
            return;
        }
        if (message.length < 10) {
            showToast('Please write a longer message (at least 10 characters).', 'error');
            return;
        }

        isSubmitting = true;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Sending…</span>';
        }

        try {
            const res = await fetch(FORM_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    name, email, subject, message,
                    _subject: `New Inquiry from Tatviya.com: ${subject}`,
                    _template: 'table',
                }),
            });

            if (!res.ok) throw new Error('Server error');
            showToast('Message sent! We\'ll get back to you soon. 🎉', 'success');
            this.reset();
        } catch {
            showToast('Could not send message right now. Please try again later.', 'error');
        } finally {
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = origBtnHTML;
            }
        }
    });
}


/* ──────────────────────────────────────────
   TOAST NOTIFICATION
────────────────────────────────────────── */

function showToast(message, type = 'info') {
    // Remove existing toasts
    document.querySelectorAll('.tatviya-toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'tatviya-toast';

    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    const bg   = type === 'success'
        ? 'linear-gradient(135deg, #10B981, #34D399)'
        : 'linear-gradient(135deg, #EF4444, #F87171)';

    toast.innerHTML = `
        <div class="toast-inner">
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        </div>
    `;

    Object.assign(toast.style, {
        position:      'fixed',
        top:           '90px',
        right:         '20px',
        background:    bg,
        color:         'white',
        padding:       '14px 20px',
        borderRadius:  '14px',
        fontWeight:    '600',
        fontSize:      '0.9rem',
        zIndex:        '9999',
        maxWidth:      '360px',
        boxShadow:     '0 8px 32px rgba(0,0,0,0.25)',
        transform:     'translateX(420px)',
        transition:    'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        fontFamily:    '\'Inter\', sans-serif',
    });

    toast.querySelector('.toast-inner').style.cssText =
        'display:flex;align-items:center;gap:10px;';

    document.body.appendChild(toast);

    // Slide in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });
    });

    // Slide out after 4s
    setTimeout(() => {
        toast.style.transform = 'translateX(420px)';
        setTimeout(() => toast.remove(), 420);
    }, 4200);
}


/* ──────────────────────────────────────────
   TEAM CARD PHOTO RING PAUSE ON HOVER
────────────────────────────────────────── */

document.querySelectorAll('.team-card').forEach(card => {
    const ring = card.querySelector('.photo-ring');
    if (!ring) return;

    card.addEventListener('mouseenter', () => {
        ring.style.animationPlayState = 'paused';
        ring.style.opacity = '0.8';
        ring.style.borderStyle = 'solid';
    });

    card.addEventListener('mouseleave', () => {
        ring.style.animationPlayState = 'running';
        ring.style.opacity = '0.35';
        ring.style.borderStyle = 'dashed';
    });
});


/* ──────────────────────────────────────────
   HERO BADGE ITEMS — STAGGERED FADE IN
────────────────────────────────────────── */

window.addEventListener('load', () => {
    const heroRevealItems = document.querySelectorAll('[data-reveal]');
    heroRevealItems.forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `opacity 0.7s ease ${i * 0.18}s, transform 0.7s ease ${i * 0.18}s`;
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 400 + i * 180);
    });
});


/* ──────────────────────────────────────────
   FOOTER LINK HOVER RIPPLE
────────────────────────────────────────── */

document.querySelectorAll('.footer-social a').forEach(link => {
    link.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position:absolute; width:0; height:0;
            background:rgba(255,255,255,0.3); border-radius:50%;
            top:50%; left:50%; transform:translate(-50%,-50%);
            animation: rippleOut 0.5s ease forwards;
            pointer-events:none;
        `;
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
});

// Ripple keyframe (injected once)
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes rippleOut {
        to { width: 80px; height: 80px; opacity: 0; }
    }
`;
document.head.appendChild(rippleStyle);


/* ──────────────────────────────────────────
   ABOUT SECTION — VIS CARDS FLOAT
────────────────────────────────────────── */

const visCards = document.querySelectorAll('.vis-stat-card');
visCards.forEach((card, i) => {
    card.style.animation = `floatIcon ${3 + i * 0.4}s ease-in-out infinite`;
    card.style.animationDelay = `${i * 0.3}s`;
});


/* ──────────────────────────────────────────
   INIT LOG
────────────────────────────────────────── */

console.log('%cTatviya ✦ Premium UI Loaded', 'color:#FF6B35;font-size:14px;font-weight:bold;');
