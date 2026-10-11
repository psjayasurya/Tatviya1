/**
 * ═══════════════════════════════════════════════════════════
 * TATVIYA DIGITAL GROWTH AGENCY — APPLICATION CORE
 * Enterprise Architecture · Hardened Security · WCAG AA Accessible
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

(function () {
    /**
     * Centralized Application Controller
     */
    const TatviyaApp = {
        // App lifecycle configuration
        config: {
            formEndpoint: 'https://formsubmit.co/ajax/contact@tatviya.com',
            minSubmissionIntervalMs: 30000, // 30 sec between submissions
            maxSubmissionsPerWindow: 3,     // Max 3 submissions per 10 mins
            rateLimitWindowMs: 600000,
            mountTime: Date.now(),
            exchangeRateUSD: 83.5,          // 1 USD ~ 83.5 INR benchmark
        },

        /**
         * Initialize all subsystems safely
         */
        init() {
            try {
                this.SiteRateLimiter.init();
                this.Security.init();
                this.Navigation.init();
                this.Particles.init();
                this.Calculator.init();
                this.Counters.init();
                this.FAQ.init();
                this.Modals.init();
                this.CookieConsent.init();
                this.ContactForm.init();
                this.ScrollEffects.init();
            } catch (err) {
                console.error('[TatviyaApp] Initialization error:', err);
            }
        }
    };

    /* ──────────────────────────────────────────
       1. SECURITY & DATA INTEGRITY MODULE
    ────────────────────────────────────────── */
    TatviyaApp.Security = {
        init() {
            // Check submission timestamp
            TatviyaApp.config.mountTime = Date.now();
        },

        /**
         * Sanitize untrusted input to prevent DOM XSS
         * @param {string} str 
         * @returns {string} Escaped string
         */
        escapeHTML(str) {
            if (typeof str !== 'string') return '';
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '/': '&#x2F;'
            };
            return str.replace(/[&<>"'/]/g, match => map[match]);
        },

        /**
         * Anti-bot timing check: reject automated sub-2.5 second submissions
         */
        isBotTiming() {
            const elapsed = Date.now() - TatviyaApp.config.mountTime;
            return elapsed < 2500;
        },

        /**
         * Client-side rate limiting using localStorage
         */
        isRateLimited() {
            try {
                const now = Date.now();
                const storageKey = 'tatviya_form_history';
                const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
                
                // Filter out submissions outside the time window
                const validHistory = history.filter(ts => (now - ts) < TatviyaApp.config.rateLimitWindowMs);

                // Check recent submission within 30 seconds
                if (validHistory.length > 0 && (now - validHistory[validHistory.length - 1]) < TatviyaApp.config.minSubmissionIntervalMs) {
                    return { limited: true, reason: 'Please wait at least 30 seconds before submitting another inquiry.' };
                }

                // Check window limit
                if (validHistory.length >= TatviyaApp.config.maxSubmissionsPerWindow) {
                    return { limited: true, reason: 'Submission limit reached. Please contact us directly via WhatsApp or phone.' };
                }

                return { limited: false };
            } catch {
                return { limited: false };
            }
        },

        /**
         * Record a successful submission into rate limiter
         */
        recordSubmission() {
            try {
                const storageKey = 'tatviya_form_history';
                const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
                history.push(Date.now());
                localStorage.setItem(storageKey, JSON.stringify(history));
            } catch {
                // Ignore storage access errors in restricted private contexts
            }
        }
    };

    /* ──────────────────────────────────────────
       SITE-WIDE ACCESS RATE LIMITER (100 HITS / 1 HOUR)
       DDoS Mitigation, Anti-Hammering & Automated Scraper Shield
    ────────────────────────────────────────── */
    TatviyaApp.SiteRateLimiter = {
        config: {
            maxRequestsPerHour: 100,
            windowMs: 60 * 60 * 1000, // 1 hour (3,600,000 ms)
            storageKey: 'tatviya_site_access_history',
            timerInterval: null
        },

        init() {
            // Expose globally for testing/monitoring
            if (typeof window !== 'undefined') {
                window.TatviyaRateLimiter = this;
            }

            // If on 429.html dedicated error page, run error page countdown handler
            if (document.body && (document.body.classList.contains('rate-limit-page') || document.getElementById('rateLimitCountdown'))) {
                this.initErrorPageHandler();
                return;
            }

            // Otherwise, evaluate current visit velocity across site
            const result = this.recordAndEvaluateAccess();
            if (result.blocked) {
                this.renderShieldModal(result.resetTimeMs);
            }
        },

        /**
         * Retrieve active timestamps within the 1-hour window
         */
        getHistory() {
            try {
                const now = Date.now();
                const raw = localStorage.getItem(this.config.storageKey);
                const list = raw ? JSON.parse(raw) : [];
                return list.filter(ts => (now - ts) < this.config.windowMs);
            } catch {
                return [];
            }
        },

        /**
         * Save active history to localStorage
         */
        saveHistory(list) {
            try {
                localStorage.setItem(this.config.storageKey, JSON.stringify(list));
            } catch {
                // Storage quota exceeded or disabled
            }
        },

        /**
         * Record current page hit and check if threshold (100 hits/hr) is exceeded
         */
        recordAndEvaluateAccess() {
            const now = Date.now();
            let history = this.getHistory();

            // Check if already reached max limit
            if (history.length >= this.config.maxRequestsPerHour) {
                const oldestTs = history[0];
                const resetTimeMs = (oldestTs + this.config.windowMs) - now;
                return {
                    blocked: true,
                    count: history.length,
                    remaining: 0,
                    resetTimeMs: Math.max(1000, resetTimeMs)
                };
            }

            // Append current hit
            history.push(now);
            this.saveHistory(history);

            const oldestTs = history[0];
            const resetTimeMs = (oldestTs + this.config.windowMs) - now;

            return {
                blocked: false,
                count: history.length,
                remaining: this.config.maxRequestsPerHour - history.length,
                resetTimeMs
            };
        },

        /**
         * Current status helper for debug and diagnostics
         */
        getStatus() {
            const now = Date.now();
            const history = this.getHistory();
            const count = history.length;
            const oldestTs = count > 0 ? history[0] : now;
            const resetInMs = Math.max(0, (oldestTs + this.config.windowMs) - now);
            return {
                limit: this.config.maxRequestsPerHour,
                count: count,
                remaining: Math.max(0, this.config.maxRequestsPerHour - count),
                resetInSeconds: Math.ceil(resetInMs / 1000)
            };
        },

        /**
         * Reset history for testing purposes
         */
        resetQuota() {
            try {
                localStorage.removeItem(this.config.storageKey);
                console.log('[TatviyaRateLimiter] Quota reset successfully.');
            } catch {
                // Ignore
            }
        },

        /**
         * Display on-page 429 Shield Modal barrier when 100 hits exceeded
         */
        renderShieldModal(resetTimeMs) {
            let overlay = document.getElementById('tatviyaRateShield');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'tatviyaRateShield';
                overlay.className = 'tatviya-rate-shield-overlay is-active';
                overlay.setAttribute('role', 'alertdialog');
                overlay.setAttribute('aria-modal', 'true');
                overlay.setAttribute('aria-labelledby', 'shieldModalTitle');
                overlay.setAttribute('aria-describedby', 'shieldModalDesc');

                overlay.innerHTML = `
                    <div class="tatviya-rate-shield-modal">
                        <div class="shield-icon" aria-hidden="true">
                            <i class="fas fa-shield-halved"></i>
                        </div>
                        <h2 id="shieldModalTitle">HTTP 429 · Rate Limit Active</h2>
                        <p id="shieldModalDesc">
                            This device/IP has reached the security limit of <strong>100 requests in 1 hour</strong>. 
                            To protect server availability and defend against automated crawlers, further requests are paused.
                        </p>
                        <div class="shield-timer">
                            <div class="shield-timer-label">Access Resumes Automatically In</div>
                            <div class="shield-timer-val" id="shieldModalCountdown">--:--</div>
                        </div>
                        <div class="shield-actions">
                            <a href="https://wa.me/916281434800?text=Hi%20Tatviya,%20I%20hit%20the%20rate%20limit%20barrier%20on%20the%20website.%20Please%20verify%20my%20session." target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                                <i class="fab fa-whatsapp" aria-hidden="true"></i> WhatsApp Support
                            </a>
                            <a href="mailto:contact@tatviya.com?subject=Rate%20Limit%20Clearance" class="btn btn-secondary">
                                <i class="fas fa-envelope" aria-hidden="true"></i> Email Clearance
                            </a>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);
            } else {
                overlay.classList.add('is-active');
            }

            // Lock body scroll
            document.body.style.overflow = 'hidden';

            // Start countdown
            this.startCountdown('shieldModalCountdown', resetTimeMs, () => {
                // When timer reaches 0, reload page
                window.location.reload();
            });
        },

        /**
         * Dedicated countdown handler for 429.html
         */
        initErrorPageHandler() {
            const countdownEl = document.getElementById('rateLimitCountdown');
            if (!countdownEl) return;

            const status = this.getStatus();
            const resetMs = (status.resetInSeconds > 0 ? status.resetInSeconds : 3600) * 1000;

            this.startCountdown('rateLimitCountdown', resetMs, () => {
                countdownEl.textContent = 'Window expired. You may now retry access.';
                const retryBtn = document.getElementById('retryAccessBtn');
                if (retryBtn) {
                    retryBtn.classList.add('pulse');
                }
            });

            const retryBtn = document.getElementById('retryAccessBtn');
            if (retryBtn) {
                retryBtn.addEventListener('click', (e) => {
                    const currentStatus = this.getStatus();
                    if (currentStatus.remaining <= 0) {
                        e.preventDefault();
                        alert('Rate limit is still active for your IP. Please wait for the countdown to expire.');
                    }
                });
            }
        },

        /**
         * Live ticking countdown timer
         */
        startCountdown(elementId, initialMs, onComplete) {
            if (this.config.timerInterval) {
                clearInterval(this.config.timerInterval);
            }

            let remainingMs = initialMs;
            const targetEl = document.getElementById(elementId);
            if (!targetEl) return;

            const update = () => {
                if (remainingMs <= 0) {
                    clearInterval(this.config.timerInterval);
                    if (typeof onComplete === 'function') onComplete();
                    return;
                }

                const totalSec = Math.ceil(remainingMs / 1000);
                const minutes = Math.floor(totalSec / 60);
                const seconds = totalSec % 60;
                targetEl.textContent = `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;

                remainingMs -= 1000;
            };

            update();
            this.config.timerInterval = setInterval(update, 1000);
        }
    };

    /* ──────────────────────────────────────────
       2. NAVIGATION CONTROLLER (ACCESSIBLE)
    ────────────────────────────────────────── */
    TatviyaApp.Navigation = {
        navbar: null,
        hamburger: null,
        navLinks: null,

        init() {
            this.navbar = document.getElementById('navbar');
            this.hamburger = document.getElementById('hamburger');
            this.navLinks = document.getElementById('navLinks');

            if (!this.navbar) return;

            // Scroll listener for elevation styling
            window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
            this.handleScroll();

            // Mobile menu toggling
            if (this.hamburger && this.navLinks) {
                this.hamburger.addEventListener('click', () => this.toggleMobileMenu());

                // Close when link clicked
                this.navLinks.querySelectorAll('.nav-link').forEach(link => {
                    link.addEventListener('click', () => this.closeMobileMenu());
                });

                // Keyboard escape to close
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && this.navLinks.classList.contains('active')) {
                        this.closeMobileMenu();
                    }
                });

                // Click outside to close
                document.addEventListener('click', (e) => {
                    if (this.navLinks.classList.contains('active')) {
                        if (!this.navLinks.contains(e.target) && !this.hamburger.contains(e.target)) {
                            this.closeMobileMenu();
                        }
                    }
                });
            }

            // Smooth scroll anchor navigation
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    const href = anchor.getAttribute('href');
                    if (href === '#' || href.startsWith('#privacy') || href.startsWith('#terms') || href.startsWith('#disclaimer')) return;
                    
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({ behavior: 'smooth' });
                        // Update focus for accessibility
                        target.setAttribute('tabindex', '-1');
                        target.focus({ preventScroll: true });
                    }
                });
            });

            // Active section observer
            this.initActiveSectionObserver();
        },

        handleScroll() {
            if (window.scrollY > 40) {
                this.navbar.classList.add('scrolled');
            } else {
                this.navbar.classList.remove('scrolled');
            }
        },

        toggleMobileMenu() {
            const isOpen = this.navLinks.classList.toggle('active');
            this.hamburger.classList.toggle('open', isOpen);
            this.hamburger.setAttribute('aria-expanded', isOpen);
            if (isOpen) {
                // Focus first item
                const firstLink = this.navLinks.querySelector('.nav-link');
                if (firstLink) firstLink.focus();
            }
        },

        closeMobileMenu() {
            if (this.navLinks && this.hamburger) {
                this.navLinks.classList.remove('active');
                this.hamburger.classList.remove('open');
                this.hamburger.setAttribute('aria-expanded', 'false');
                this.hamburger.focus();
            }
        },

        initActiveSectionObserver() {
            const sections = document.querySelectorAll('section[id]');
            const links = document.querySelectorAll('.nav-link');
            if (!sections.length || !links.length) return;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.getAttribute('id');
                        links.forEach(link => {
                            const href = link.getAttribute('href');
                            link.classList.toggle('active', href === `#${id}`);
                        });
                    }
                });
            }, {
                rootMargin: '-30% 0px -60% 0px'
            });

            sections.forEach(sec => observer.observe(sec));
        }
    };

    /* ──────────────────────────────────────────
       3. HIGH-EFFICIENCY PARTICLE CANVAS
    ────────────────────────────────────────── */
    TatviyaApp.Particles = {
        canvas: null,
        ctx: null,
        particles: [],
        animId: null,
        isVisible: true,

        init() {
            // Honor prefers-reduced-motion
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                return;
            }

            this.canvas = document.getElementById('particleCanvas');
            if (!this.canvas) return;

            this.ctx = this.canvas.getContext('2d');
            this.resize();

            // Observe visibility: pause particle rendering when hero is scrolled offscreen
            const heroSection = document.getElementById('home');
            if (heroSection) {
                const visObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        this.isVisible = entry.isIntersecting;
                        if (this.isVisible) {
                            if (!this.animId) this.animate();
                        } else {
                            if (this.animId) {
                                cancelAnimationFrame(this.animId);
                                this.animId = null;
                            }
                        }
                    });
                }, { threshold: 0.05 });
                visObserver.observe(heroSection);
            }

            window.addEventListener('resize', () => {
                this.resize();
            }, { passive: true });

            this.createParticles();
            this.animate();
        },

        resize() {
            if (!this.canvas) return;
            this.canvas.width = this.canvas.offsetWidth || window.innerWidth;
            this.canvas.height = this.canvas.offsetHeight || 600;
        },

        createParticles() {
            const count = Math.min(65, Math.floor((this.canvas.width * this.canvas.height) / 12000));
            this.particles = [];
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    radius: Math.random() * 2 + 1,
                    alpha: Math.random() * 0.5 + 0.2
                });
            }
        },

        animate() {
            if (!this.isVisible || !this.ctx) return;

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            const rgb = [200, 210, 230];
            const maxDist = 120;

            // Update & Draw particles
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${p.alpha})`;
                this.ctx.fill();

                // Connect nearby nodes
                for (let j = i + 1; j < this.particles.length; j++) {
                    const p2 = this.particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < maxDist) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(p.x, p.y);
                        this.ctx.lineTo(p2.x, p2.y);
                        const alpha = (1 - dist / maxDist) * 0.2;
                        this.ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
                        this.ctx.lineWidth = 0.7;
                        this.ctx.stroke();
                    }
                }
            }

            this.animId = requestAnimationFrame(() => this.animate());
        }
    };

    /* ──────────────────────────────────────────
       4. CHANNEL VALUATION CALCULATOR ENGINE
    ────────────────────────────────────────── */
    TatviyaApp.Calculator = {
        nicheRates: {
            finance:       { rpm: 480, multiple: 34, score: 'Grade A+ (Elite RPM)',    liquidity: 'Very High (5–10 Days)' },
            tech:          { rpm: 360, multiple: 30, score: 'Grade A (Strong RPM)',     liquidity: 'High (7–14 Days)' },
            education:     { rpm: 250, multiple: 26, score: 'Grade B+ (Solid Retention)',liquidity: 'High (10–18 Days)' },
            lifestyle:     { rpm: 180, multiple: 22, score: 'Grade B (Brand Sponsored)',liquidity: 'Medium (14–25 Days)' },
            gaming:        { rpm: 130, multiple: 20, score: 'Grade B- (High Velocity)', liquidity: 'Medium (14–25 Days)' },
            entertainment: { rpm: 95,  multiple: 18, score: 'Grade C+ (Mass Reach)',    liquidity: 'Moderate (20–35 Days)' }
        },

        init() {
            const nicheSelect = document.getElementById('calcNiche');
            const subsSlider = document.getElementById('calcSubs');
            const viewsSlider = document.getElementById('calcViews');
            const monetizedRadios = document.querySelectorAll('input[name="calcMonetized"]');
            const applyBtn = document.getElementById('calcApplyBtn');

            if (!nicheSelect || !subsSlider || !viewsSlider) return;

            const updateCalc = () => this.calculate();

            nicheSelect.addEventListener('change', updateCalc);
            subsSlider.addEventListener('input', () => {
                const val = parseInt(subsSlider.value, 10);
                document.getElementById('calcSubsVal').textContent = this.formatNumber(val) + ' Subs';
                updateCalc();
            });

            viewsSlider.addEventListener('input', () => {
                const val = parseInt(viewsSlider.value, 10);
                document.getElementById('calcViewsVal').textContent = this.formatNumber(val) + ' Views';
                updateCalc();
            });

            monetizedRadios.forEach(radio => radio.addEventListener('change', updateCalc));

            if (applyBtn) {
                applyBtn.addEventListener('click', () => this.applyToContactForm());
            }

            // Initial calculation
            updateCalc();
        },

        formatNumber(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
            return num.toString();
        },

        calculate() {
            const niche = document.getElementById('calcNiche').value;
            const subs = parseInt(document.getElementById('calcSubs').value, 10);
            const views = parseInt(document.getElementById('calcViews').value, 10);
            const isMonetized = (document.querySelector('input[name="calcMonetized"]:checked')?.value || 'yes') === 'yes';

            const config = this.nicheRates[niche] || this.nicheRates.tech;

            // Monthly AdSense estimate
            let monthlyEarnings = (views / 1000) * config.rpm;
            if (!isMonetized) {
                monthlyEarnings = monthlyEarnings * 0.15; // Unmonetized potential
            }

            // Asset valuation range based on months multiple + subscriber equity
            let effectiveMultiple = config.multiple;
            if (!isMonetized) effectiveMultiple = effectiveMultiple * 0.45; // Substantial discount for unmonetized channels

            const baseAssetValue = monthlyEarnings * effectiveMultiple + (subs * 1.2);
            const minAssetINR = Math.round(baseAssetValue * 0.85);
            const maxAssetINR = Math.round(baseAssetValue * 1.15);

            // Convert to INR Lakhs & USD
            const minLakhs = (minAssetINR / 100000).toFixed(1);
            const maxLakhs = (maxAssetINR / 100000).toFixed(1);

            const minUSD = Math.round(minAssetINR / TatviyaApp.config.exchangeRateUSD);
            const maxUSD = Math.round(maxAssetINR / TatviyaApp.config.exchangeRateUSD);

            // Update DOM Elements
            const resAssetINR = document.getElementById('resAssetINR');
            const resAssetUSD = document.getElementById('resAssetUSD');
            const resMonthly = document.getElementById('resMonthlyEarnings');
            const resQuality = document.getElementById('resQualityScore');
            const resLiquidity = document.getElementById('resLiquidity');
            const resRec = document.getElementById('calcRecText');

            if (resAssetINR) resAssetINR.textContent = `₹${minLakhs}L – ₹${maxLakhs}L`;
            if (resAssetUSD) resAssetUSD.textContent = `($${minUSD.toLocaleString()} – $${maxUSD.toLocaleString()} USD)`;
            
            if (resMonthly) {
                const monthlyFormatted = Math.round(monthlyEarnings).toLocaleString('en-IN');
                resMonthly.textContent = isMonetized ? `₹${monthlyFormatted} / mo` : `₹${monthlyFormatted} (Potential)`;
            }

            if (resQuality) resQuality.textContent = config.score;
            if (resLiquidity) resLiquidity.textContent = config.liquidity;

            if (resRec) {
                if (isMonetized) {
                    resRec.textContent = `Channel maintains prime algorithmic standing with established YPP status. Prime candidate for immediate high-multiple escrow trade or monetization optimization.`;
                } else {
                    resRec.textContent = `Pre-monetized channel requires watch-hour acceleration to unlock YPP eligibility. Accelerating watch hours will increase asset value by ~120%.`;
                }
            }
        },

        applyToContactForm() {
            const nicheSelect = document.getElementById('calcNiche');
            const nicheName = nicheSelect.options[nicheSelect.selectedIndex].text.split('(')[0].trim();
            const subs = document.getElementById('calcSubsVal').textContent;
            const views = document.getElementById('calcViewsVal').textContent;
            const valuation = document.getElementById('resAssetINR').textContent;

            const serviceSelect = document.getElementById('contactService');
            const subjectInput = document.getElementById('contactSubject');
            const messageInput = document.getElementById('contactMessage');

            if (serviceSelect) serviceSelect.value = 'Channel Valuation Audit';
            if (subjectInput) subjectInput.value = `Formal Audit Request: ${nicheName} Channel (${subs})`;
            if (messageInput) {
                messageInput.value = `Hello Tatviya Team,\n\nI calculated my channel market valuation using your interactive tool:\n- Category: ${nicheName}\n- Subscribers: ${subs}\n- Monthly Views: ${views}\n- Estimated Valuation: ${valuation}\n\nPlease contact me to proceed with a formal due diligence verification and transaction review.`;
            }

            // Scroll down to contact section
            const contactSection = document.getElementById('contact');
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
                const nameInput = document.getElementById('contactName');
                if (nameInput) setTimeout(() => nameInput.focus(), 600);
            }
        }
    };

    /* ──────────────────────────────────────────
       5. COUNTER ANIMATION WITH INTERSECTION OBSERVER
    ────────────────────────────────────────── */
    TatviyaApp.Counters = {
        init() {
            const targets = document.querySelectorAll('[data-target]');
            if (!targets.length) return;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !entry.target.dataset.animated) {
                        entry.target.dataset.animated = 'true';
                        this.animate(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.35 });

            targets.forEach(t => observer.observe(t));
        },

        animate(el) {
            const target = parseFloat(el.dataset.target);
            const suffix = el.dataset.suffix || '';
            const isFloat = !Number.isInteger(target);
            const decimals = isFloat ? 1 : 0;
            const duration = 1600;
            const startTime = performance.now();

            const step = (now) => {
                const progress = Math.min((now - startTime) / duration, 1);
                // Ease out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = eased * target;

                el.textContent = current.toFixed(decimals) + suffix;

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    el.textContent = target.toFixed(decimals) + suffix;
                }
            };

            requestAnimationFrame(step);
        }
    };

    /* ──────────────────────────────────────────
       6. ACCESSIBLE FAQ ACCORDION
    ────────────────────────────────────────── */
    TatviyaApp.FAQ = {
        init() {
            const questions = document.querySelectorAll('.faq-question');
            questions.forEach(btn => {
                btn.addEventListener('click', () => {
                    const expanded = btn.getAttribute('aria-expanded') === 'true';
                    const answerId = btn.getAttribute('aria-controls');
                    const answer = document.getElementById(answerId);
                    const parent = btn.closest('.faq-item');

                    // Close others in accordion
                    questions.forEach(otherBtn => {
                        if (otherBtn !== btn) {
                            otherBtn.setAttribute('aria-expanded', 'false');
                            const otherAns = document.getElementById(otherBtn.getAttribute('aria-controls'));
                            if (otherAns) otherAns.hidden = true;
                            otherBtn.closest('.faq-item')?.classList.remove('active');
                        }
                    });

                    // Toggle current
                    btn.setAttribute('aria-expanded', !expanded);
                    if (answer) answer.hidden = expanded;
                    if (parent) parent.classList.toggle('active', !expanded);
                });
            });
        }
    };

    /* ──────────────────────────────────────────
       7. ACCESSIBLE LEGAL MODALS
    ────────────────────────────────────────── */
    TatviyaApp.Modals = {
        activeModal: null,
        lastFocusedElement: null,

        init() {
            // Modal trigger buttons
            document.querySelectorAll('.modal-trigger').forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    const modalType = trigger.dataset.modal;
                    const modal = document.getElementById(`${modalType}Modal`);
                    if (modal) this.open(modal, trigger);
                });
            });

            // Close buttons
            document.querySelectorAll('[data-close-modal]').forEach(btn => {
                btn.addEventListener('click', () => this.close());
            });

            // Backdrop click close
            document.querySelectorAll('.legal-modal-backdrop').forEach(backdrop => {
                backdrop.addEventListener('click', (e) => {
                    if (e.target === backdrop) this.close();
                });
            });

            // Keyboard Escape close & Focus Trap
            document.addEventListener('keydown', (e) => {
                if (!this.activeModal) return;

                if (e.key === 'Escape') {
                    this.close();
                    return;
                }

                if (e.key === 'Tab') {
                    this.trapFocus(e);
                }
            });
        },

        open(modal, trigger) {
            this.activeModal = modal;
            this.lastFocusedElement = trigger || document.activeElement;

            modal.hidden = false;
            // Next frame for transition
            requestAnimationFrame(() => {
                modal.classList.add('is-open');
                document.body.style.overflow = 'hidden';

                const closeBtn = modal.querySelector('.modal-close-btn');
                if (closeBtn) closeBtn.focus();
            });
        },

        close() {
            if (!this.activeModal) return;
            const modal = this.activeModal;
            modal.classList.remove('is-open');

            setTimeout(() => {
                modal.hidden = true;
                document.body.style.overflow = '';
                this.activeModal = null;
                if (this.lastFocusedElement) {
                    this.lastFocusedElement.focus();
                }
            }, 200);
        },

        trapFocus(e) {
            if (!this.activeModal) return;
            const focusables = this.activeModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (!focusables.length) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    };

    /* ──────────────────────────────────────────
       8. COOKIE & PRIVACY CONSENT BANNER (DPDP)
    ────────────────────────────────────────── */
    TatviyaApp.CookieConsent = {
        init() {
            const consentBanner = document.getElementById('cookieBanner');
            if (!consentBanner) return;

            const consentStored = localStorage.getItem('tatviya_dpdp_consent');
            if (!consentStored) {
                setTimeout(() => {
                    consentBanner.hidden = false;
                }, 1200);
            }

            const acceptAllBtn = document.getElementById('acceptAllCookies');
            const acceptEssentialBtn = document.getElementById('acceptNecessaryCookies');

            if (acceptAllBtn) {
                acceptAllBtn.addEventListener('click', () => {
                    localStorage.setItem('tatviya_dpdp_consent', 'all');
                    consentBanner.hidden = true;
                });
            }

            if (acceptEssentialBtn) {
                acceptEssentialBtn.addEventListener('click', () => {
                    localStorage.setItem('tatviya_dpdp_consent', 'essential');
                    consentBanner.hidden = true;
                });
            }
        }
    };

    /* ──────────────────────────────────────────
       9. HARDENED CONTACT FORM CONTROLLER
    ────────────────────────────────────────── */
    TatviyaApp.ContactForm = {
        form: null,
        isSubmitting: false,

        init() {
            this.form = document.getElementById('contactForm');
            if (!this.form) return;

            this.form.addEventListener('submit', (e) => this.handleSubmit(e));

            // Real-time input validation
            this.form.querySelectorAll('input, textarea, select').forEach(input => {
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', () => {
                    const group = input.closest('.form-group');
                    if (group && group.classList.contains('has-error')) {
                        this.validateField(input);
                    }
                });
            });
        },

        validateField(field) {
            const group = field.closest('.form-group');
            if (!group) return true;
            const errorSpan = group.querySelector('.form-error-msg');
            let isValid = true;
            let errorMsg = '';

            const val = field.value.trim();

            if (field.required && !val) {
                isValid = false;
                errorMsg = 'This field is required.';
            } else if (field.type === 'email' && val) {
                // RFC 5322 regex check
                const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
                if (!emailRegex.test(val)) {
                    isValid = false;
                    errorMsg = 'Please enter a valid email address.';
                }
            } else if (field.id === 'contactMessage' && val.length < 15) {
                isValid = false;
                errorMsg = 'Please provide at least 15 characters describing your inquiry.';
            }

            if (!isValid) {
                group.classList.add('has-error');
                field.setAttribute('aria-invalid', 'true');
                if (errorSpan) errorSpan.textContent = errorMsg;
            } else {
                group.classList.remove('has-error');
                field.setAttribute('aria-invalid', 'false');
                if (errorSpan) errorSpan.textContent = '';
            }

            return isValid;
        },

        async handleSubmit(e) {
            e.preventDefault();
            if (this.isSubmitting) return;

            // 1. Honeypot Bot Filter Check
            const honeypot = document.getElementById('botFilterField');
            if (honeypot && honeypot.value.trim() !== '') {
                console.warn('[Security] Automated submission intercepted.');
                this.showToast('Thank you for reaching out. We will respond shortly.', 'success');
                this.form.reset();
                return;
            }

            // 2. Anti-bot timing test
            if (TatviyaApp.Security.isBotTiming()) {
                console.warn('[Security] Submission speed anomaly detected.');
                this.showToast('Submission rejected due to high speed anomaly.', 'error');
                return;
            }

            // 3. Client Rate Limiter Test
            const rateCheck = TatviyaApp.Security.isRateLimited();
            if (rateCheck.limited) {
                this.showToast(rateCheck.reason, 'error');
                return;
            }

            // 4. Validate all fields
            let allValid = true;
            this.form.querySelectorAll('input[required], textarea[required], select[required]').forEach(field => {
                if (!this.validateField(field)) {
                    allValid = false;
                }
            });

            const consentBox = document.getElementById('contactConsent');
            if (consentBox && !consentBox.checked) {
                this.showToast('Please consent to the Privacy Policy to proceed.', 'error');
                allValid = false;
            }

            // Cloudflare Turnstile token check (if Turnstile widget loaded)
            const turnstileInput = this.form.querySelector('[name="cf-turnstile-response"]');
            const turnstileToken = turnstileInput ? turnstileInput.value : '';

            if (!allValid) {
                this.showToast('Please correct the highlighted fields before submitting.', 'error');
                return;
            }

            // Anti-Email Header Injection: Strip CRLF (\r, \n) and control characters from single-line fields
            const stripCRLF = (str) => typeof str === 'string' ? str.replace(/[\r\n\x00-\x1F\x7F]/g, ' ').trim() : '';

            const name = stripCRLF(this.form.name.value);
            const email = stripCRLF(this.form.email.value);
            const phone = stripCRLF(this.form.phone.value);
            const service = stripCRLF(this.form.service.value);
            const subject = stripCRLF(this.form.subject.value);
            const message = TatviyaApp.Security.escapeHTML(this.form.message.value.trim());

            const submitBtn = document.getElementById('submitBtn');
            const originalHTML = submitBtn ? submitBtn.innerHTML : '';

            this.isSubmitting = true;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> <span>Verifying &amp; Securing…</span>';
            }

            try {
                // Try dedicated serverless API /api/contact first
                let succeeded = false;
                let responseMsg = 'Inquiry securely verified and received! Our team will contact you within 24 hours. 🎉';

                try {
                    const apiRes = await fetch('/api/contact', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': 'tatviya_csrf_' + Date.now()
                        },
                        body: JSON.stringify({
                            name,
                            email,
                            phone: phone || 'Not provided',
                            service,
                            subject,
                            message,
                            'cf-turnstile-response': turnstileToken
                        })
                    });

                    if (apiRes.ok) {
                        const data = await apiRes.json();
                        if (data.message) responseMsg = data.message;
                        succeeded = true;
                    } else if (apiRes.status === 429) {
                        const errData = await apiRes.json().catch(() => ({}));
                        this.showToast(errData.error || 'Submission limit reached for this IP (max 5 per hour).', 'error');
                        return;
                    } else if (apiRes.status === 403) {
                        const errData = await apiRes.json().catch(() => ({}));
                        this.showToast(errData.error || 'Turnstile verification failed. Please try again.', 'error');
                        return;
                    }
                } catch {
                    // /api/contact unavailable (e.g. static hosting)
                    succeeded = false;
                }

                // If standalone serverless endpoint not active, fallback to hardened form endpoint
                if (!succeeded) {
                    const fallbackRes = await fetch(TatviyaApp.config.formEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            name,
                            email,
                            phone: phone || 'Not provided',
                            service,
                            subject,
                            message,
                            _subject: `[Tatviya Verified Inquiry] ${service}: ${subject}`,
                            _template: 'table'
                        })
                    });

                    if (!fallbackRes.ok) {
                        throw new Error(`Server returned status ${fallbackRes.status}`);
                    }
                }

                TatviyaApp.Security.recordSubmission();
                this.showToast(responseMsg, 'success');
                this.form.reset();
                if (window.turnstile) {
                    try { window.turnstile.reset(); } catch {}
                }
            } catch (err) {
                console.error('[TatviyaApp] Form submit error:', err);
                this.showToast('Could not submit inquiry right now. Please message us directly on WhatsApp.', 'error');
            } finally {
                this.isSubmitting = false;
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalHTML;
                }
            }
        },

        /**
         * Safe DOM-constructed Toast Notification (Zero DOM XSS risk)
         */
        showToast(messageText, type = 'info') {
            document.querySelectorAll('.tatviya-toast').forEach(t => t.remove());

            const toast = document.createElement('div');
            toast.className = `tatviya-toast toast-${type}`;
            toast.setAttribute('role', 'alert');

            const icon = document.createElement('i');
            icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
            icon.setAttribute('aria-hidden', 'true');

            const span = document.createElement('span');
            span.textContent = messageText; // Safe DOM text node

            toast.appendChild(icon);
            toast.appendChild(span);
            document.body.appendChild(toast);

            requestAnimationFrame(() => {
                toast.classList.add('is-visible');
            });

            setTimeout(() => {
                toast.classList.remove('is-visible');
                setTimeout(() => toast.remove(), 400);
            }, 4500);
        }
    };

    /* ──────────────────────────────────────────
       10. SCROLL REVEAL OBSERVER
    ────────────────────────────────────────── */
    TatviyaApp.ScrollEffects = {
        init() {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                return;
            }

            const revealElements = document.querySelectorAll('[data-reveal]');
            if (!revealElements.length) return;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -40px 0px'
            });

            revealElements.forEach(el => observer.observe(el));
        }
    };

    // Initialize application when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => TatviyaApp.init());
    } else {
        TatviyaApp.init();
    }

})();
