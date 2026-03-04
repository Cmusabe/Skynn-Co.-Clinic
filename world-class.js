/* ============================================================
   WORLD-CLASS EFFECTS ENGINE
   Award-winning interactions for Skynn & Co. Clinic
   ============================================================ */
(function() {
    'use strict';

    // Only run on desktop/tablet (skip very small devices for performance)
    const isMobile = window.innerWidth < 768;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ----------------------------------------------------------
       1. SMOOTH SCROLL ENGINE (Lenis-style)
       Buttery smooth momentum scrolling
    ---------------------------------------------------------- */
    function initSmoothScroll() {
        if (isMobile || prefersReduced) return;

        let current = window.scrollY;
        let target = window.scrollY;
        let ease = 0.08;
        let rafId;
        let isScrolling = false;

        function lerp(start, end, factor) {
            return start + (end - start) * factor;
        }

        window.addEventListener('scroll', function() {
            target = window.scrollY;
        }, { passive: true });

        // Override wheel for smooth interpolation
        document.addEventListener('wheel', function(e) {
            // Don't hijack scroll - just track for parallax calculations
            target = window.scrollY;
        }, { passive: true });

        function animate() {
            current = lerp(current, target, ease);

            // Update CSS variable for scroll-linked animations
            const scrollPercent = current / (document.body.scrollHeight - window.innerHeight);
            document.documentElement.style.setProperty('--scroll', current.toFixed(1));
            document.documentElement.style.setProperty('--scroll-percent', scrollPercent.toFixed(4));

            // Scroll velocity for speed-aware effects
            const velocity = Math.abs(target - current);
            document.documentElement.style.setProperty('--scroll-velocity', Math.min(velocity, 100).toFixed(1));

            rafId = requestAnimationFrame(animate);
        }

        animate();
    }

    /* ----------------------------------------------------------
       2. SPLIT TEXT HERO ANIMATION
       Characters animate individually with stagger
    ---------------------------------------------------------- */
    function initSplitText() {
        const heroH1 = document.querySelector('.hero h1');
        if (!heroH1) return;

        // Get all text nodes inside the h1
        const em = heroH1.querySelector('em');
        if (!em) return;

        const gradientSpan = em.querySelector('.gradient-text');
        const gradientText = gradientSpan ? gradientSpan.textContent : '';

        // Get full text and split into words
        const fullHTML = em.innerHTML;

        // Split into words, preserving the gradient-text span
        const words = [];
        let tempDiv = document.createElement('div');
        tempDiv.innerHTML = fullHTML;

        function extractWords(node) {
            if (node.nodeType === 3) { // text node
                const text = node.textContent;
                const wordList = text.split(/(\s+)/);
                wordList.forEach(w => {
                    if (w.trim()) words.push({ text: w, isGradient: false });
                });
            } else if (node.classList && node.classList.contains('gradient-text')) {
                const text = node.textContent;
                const wordList = text.split(/(\s+)/);
                wordList.forEach(w => {
                    if (w.trim()) words.push({ text: w, isGradient: true });
                });
            } else {
                node.childNodes.forEach(child => extractWords(child));
            }
        }
        extractWords(tempDiv);

        // Rebuild with split words
        let newHTML = '<em>';
        words.forEach((word, i) => {
            const delay = (i * 0.07).toFixed(2);
            if (word.isGradient) {
                newHTML += `<span class="split-word gradient-text" style="animation-delay:${delay}s">${word.text}</span> `;
            } else {
                newHTML += `<span class="split-word" style="animation-delay:${delay}s">${word.text}</span> `;
            }
        });
        newHTML += '</em>';

        heroH1.innerHTML = newHTML;

        // Trigger animation after a short delay
        requestAnimationFrame(() => {
            heroH1.classList.add('split-animated');
        });
    }

    /* ----------------------------------------------------------
       3. IMAGE REVEAL ON SCROLL
       Triple-fallback: IntersectionObserver + scroll + interval
    ---------------------------------------------------------- */
    function initImageReveals() {
        const images = document.querySelectorAll('.service-card img, .about-preview img, .result-card img, .category-hero-image img, .gallery-item img, .about-story-image img, .category-guidance-image img');
        if (!images.length) return;

        const revealTargets = [];
        images.forEach(img => {
            if (img.closest('.ba-slider')) return;
            img.classList.add('img-scroll-reveal');
            revealTargets.push(img);
        });

        function revealImage(img) {
            if (!img.classList.contains('img-revealed')) {
                img.classList.add('img-revealed');
            }
        }

        // Method 1: IntersectionObserver (most reliable, event-driven)
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        revealImage(entry.target);
                        io.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.05, rootMargin: '0px 0px 80px 0px' });

            revealTargets.forEach(function(img) { io.observe(img); });
        }

        // Method 2: Scroll check (backup for edge cases)
        function scrollCheck() {
            var viewH = window.innerHeight;
            revealTargets.forEach(function(img) {
                if (img.classList.contains('img-revealed')) return;
                var rect = img.getBoundingClientRect();
                // Reveal if in viewport OR already scrolled past (rect.top < viewH covers both)
                if (rect.top < viewH * 0.92) {
                    revealImage(img);
                }
            });
        }

        window.addEventListener('scroll', function() {
            requestAnimationFrame(scrollCheck);
        }, { passive: true });

        // Method 3: Periodic fallback (nuclear option - ensures nothing stays hidden)
        var checks = 0;
        var fallbackInterval = setInterval(function() {
            scrollCheck();
            checks++;
            // Stop checking after 30s (60 checks × 500ms)
            if (checks > 60 || revealTargets.every(function(img) { return img.classList.contains('img-revealed'); })) {
                clearInterval(fallbackInterval);
            }
        }, 500);

        // Initial check
        scrollCheck();
        setTimeout(scrollCheck, 200);
    }

    /* ----------------------------------------------------------
       4. MAGNETIC BUTTONS
       Buttons attract cursor within proximity
    ---------------------------------------------------------- */
    function initMagneticButtons() {
        if (isMobile) return;

        const buttons = document.querySelectorAll('.btn-service, .btn-nav, .btn-outline, .floating-cta');
        const magnetStrength = 0.3;
        const magnetRange = 80;

        buttons.forEach(btn => {
            btn.classList.add('magnetic-btn');

            btn.addEventListener('mousemove', function(e) {
                const rect = btn.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const deltaX = e.clientX - centerX;
                const deltaY = e.clientY - centerY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                if (distance < magnetRange) {
                    const pull = (1 - distance / magnetRange) * magnetStrength;
                    btn.style.transform = `translate(${deltaX * pull}px, ${deltaY * pull}px)`;
                    btn.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                }
            });

            btn.addEventListener('mouseleave', function() {
                btn.style.transform = '';
                btn.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            });
        });
    }

    /* ----------------------------------------------------------
       5. PARALLAX FLOATING ELEMENTS
       Decorative shapes that move with scroll depth
    ---------------------------------------------------------- */
    function initFloatingElements() {
        if (isMobile || prefersReduced) return;

        const hero = document.querySelector('.hero');
        if (!hero) return;

        // Create floating decorative elements
        const floatContainer = document.createElement('div');
        floatContainer.className = 'float-elements';
        floatContainer.setAttribute('aria-hidden', 'true');

        const shapes = [
            { type: 'circle', size: 280, x: '75%', y: '15%', speed: 0.03, opacity: 0.04 },
            { type: 'circle', size: 180, x: '10%', y: '60%', speed: 0.05, opacity: 0.03 },
            { type: 'ring', size: 120, x: '85%', y: '70%', speed: 0.04, opacity: 0.06 },
            { type: 'dot', size: 8, x: '20%', y: '30%', speed: 0.06, opacity: 0.15 },
            { type: 'dot', size: 6, x: '60%', y: '80%', speed: 0.07, opacity: 0.12 },
            { type: 'dot', size: 5, x: '40%', y: '20%', speed: 0.05, opacity: 0.1 },
            { type: 'line', size: 60, x: '30%', y: '75%', speed: 0.04, opacity: 0.08 },
        ];

        shapes.forEach((shape, i) => {
            const el = document.createElement('div');
            el.className = `float-shape float-${shape.type}`;
            el.style.cssText = `
                width: ${shape.size}px;
                height: ${shape.size}px;
                left: ${shape.x};
                top: ${shape.y};
                opacity: ${shape.opacity};
            `;
            el.dataset.floatSpeed = shape.speed;
            el.dataset.floatIndex = i;
            floatContainer.appendChild(el);
        });

        hero.style.position = 'relative';
        hero.appendChild(floatContainer);

        // Animate on scroll
        let ticking = false;
        window.addEventListener('scroll', function() {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    floatContainer.querySelectorAll('.float-shape').forEach(el => {
                        const speed = parseFloat(el.dataset.floatSpeed);
                        const index = parseInt(el.dataset.floatIndex);
                        const yOffset = scrollY * speed;
                        const xWobble = Math.sin(scrollY * 0.002 + index) * 15;
                        el.style.transform = `translate(${xWobble}px, ${-yOffset}px)`;
                    });
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    /* ----------------------------------------------------------
       6. CURVED SECTION DIVIDERS
       SVG wave dividers between sections
    ---------------------------------------------------------- */
    function initCurvedDividers() {
        const sections = [
            { selector: '.hero', position: 'bottom', color: 'var(--bg-main, #ede7df)' },
            { selector: '.stats-showcase', position: 'top', color: '#2f2520' },
            { selector: '.stats-showcase', position: 'bottom', color: '#2f2520' },
        ];

        sections.forEach(({ selector, position, color }) => {
            const section = document.querySelector(selector);
            if (!section) return;

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 1440 60');
            svg.setAttribute('preserveAspectRatio', 'none');
            svg.classList.add('section-curve', `curve-${position}`);
            svg.setAttribute('aria-hidden', 'true');

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            if (position === 'bottom') {
                path.setAttribute('d', 'M0,0 C360,60 1080,60 1440,0 L1440,60 L0,60 Z');
            } else {
                path.setAttribute('d', 'M0,60 C360,0 1080,0 1440,60 L1440,0 L0,0 Z');
            }
            path.setAttribute('fill', color);

            svg.appendChild(path);

            if (position === 'bottom') {
                section.style.position = section.style.position || 'relative';
                section.appendChild(svg);
            } else {
                section.style.position = section.style.position || 'relative';
                section.insertBefore(svg, section.firstChild);
            }
        });
    }

    /* ----------------------------------------------------------
       7. HOVER TILT ON SERVICE CARDS
       3D perspective tilt following cursor
    ---------------------------------------------------------- */
    function initCardTilt() {
        if (isMobile) return;

        const cards = document.querySelectorAll('.service-card, .result-card, .home-proof-card');

        cards.forEach(card => {
            card.classList.add('tilt-card');

            card.addEventListener('mousemove', function(e) {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -5;
                const rotateY = ((x - centerX) / centerX) * 5;

                card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;

                // Move inner glow/highlight
                const glowX = (x / rect.width) * 100;
                const glowY = (y / rect.height) * 100;
                card.style.setProperty('--glow-x', glowX + '%');
                card.style.setProperty('--glow-y', glowY + '%');
            });

            card.addEventListener('mouseleave', function() {
                card.style.transform = '';
            });
        });
    }

    /* ----------------------------------------------------------
       8. TEXT LINE REVEAL ANIMATION
       Lines slide up with stagger on scroll
    ---------------------------------------------------------- */
    function initLineReveal() {
        var headings = document.querySelectorAll('h2:not(.hero h2), .section-label, .category-callout p');
        var targets = [];

        headings.forEach(function(h) {
            if (h.closest('.faq-item') || h.closest('.dropdown-menu')) return;
            h.classList.add('line-reveal');
            targets.push(h);
        });

        function revealHeading(el) {
            if (!el.classList.contains('line-revealed')) {
                el.classList.add('line-revealed');
            }
        }

        // IntersectionObserver
        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        revealHeading(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.15, rootMargin: '0px 0px 40px 0px' });

            targets.forEach(function(el) { observer.observe(el); });
        }

        // Scroll fallback
        function scrollCheck() {
            var viewH = window.innerHeight;
            targets.forEach(function(el) {
                if (el.classList.contains('line-revealed')) return;
                var rect = el.getBoundingClientRect();
                // Reveal if in viewport OR already scrolled past
                if (rect.top < viewH * 0.9) {
                    revealHeading(el);
                }
            });
        }

        window.addEventListener('scroll', function() {
            requestAnimationFrame(scrollCheck);
        }, { passive: true });

        // Initial + periodic fallback
        scrollCheck();
        setTimeout(scrollCheck, 300);
        var checks = 0;
        var interval = setInterval(function() {
            scrollCheck();
            checks++;
            if (checks > 40 || targets.every(function(el) { return el.classList.contains('line-revealed'); })) {
                clearInterval(interval);
            }
        }, 750);
    }

    /* ----------------------------------------------------------
       9. STAGGER FADE FOR PROOF CARDS / FAQ
       Cards fade in with delay cascade
    ---------------------------------------------------------- */
    function initStaggerFade() {
        var groups = document.querySelectorAll('.home-proof-grid, .faq-grid, .about-values-grid');
        if (!groups.length) return;

        groups.forEach(function(group) {
            var items = group.children;
            Array.from(items).forEach(function(item, i) {
                item.style.setProperty('--stagger-i', i);
                item.classList.add('stagger-fade-item');
            });
        });

        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('stagger-fade-active');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });

            groups.forEach(function(group) { observer.observe(group); });
        }

        // Scroll fallback for stagger groups
        function checkGroups() {
            var viewH = window.innerHeight;
            groups.forEach(function(group) {
                if (group.classList.contains('stagger-fade-active')) return;
                var rect = group.getBoundingClientRect();
                // Reveal if in viewport OR already scrolled past
                if (rect.top < viewH * 0.9) {
                    group.classList.add('stagger-fade-active');
                }
            });
        }

        window.addEventListener('scroll', function() {
            requestAnimationFrame(checkGroups);
        }, { passive: true });

        checkGroups();
        setTimeout(checkGroups, 500);
    }

    /* ----------------------------------------------------------
       10. NAVBAR MORPH
       Navbar shrinks and gains glassmorphism on scroll
    ---------------------------------------------------------- */
    function initNavbarMorph() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        let lastScroll = 0;

        function updateNav() {
            const scrollY = window.scrollY;

            if (scrollY > 80) {
                navbar.classList.add('nav-morphed');
            } else {
                navbar.classList.remove('nav-morphed');
            }

            // Hide on scroll down, show on scroll up
            if (scrollY > 300) {
                if (scrollY > lastScroll + 5) {
                    navbar.classList.add('nav-hidden');
                } else if (scrollY < lastScroll - 5) {
                    navbar.classList.remove('nav-hidden');
                }
            } else {
                navbar.classList.remove('nav-hidden');
            }

            lastScroll = scrollY;
        }

        window.addEventListener('scroll', updateNav, { passive: true });
        updateNav();
    }

    /* ----------------------------------------------------------
       11. HORIZONTAL SCROLL TEXT
       Marquee text that scrolls based on page scroll direction
    ---------------------------------------------------------- */
    function initScrollMarquee() {
        const marquee = document.querySelector('.marquee');
        if (!marquee) return;

        let lastScroll = window.scrollY;
        let scrollDirection = 1;
        let currentSpeed = 0;

        window.addEventListener('scroll', function() {
            const newScroll = window.scrollY;
            const delta = newScroll - lastScroll;
            scrollDirection = delta > 0 ? 1 : -1;
            currentSpeed = Math.min(Math.abs(delta) * 0.5, 20);
            lastScroll = newScroll;
        }, { passive: true });

        // Apply extra CSS transform based on scroll direction
        const track = marquee.querySelector('.marquee-track');
        if (!track) return;

        function animate() {
            currentSpeed *= 0.95; // Decay
            if (Math.abs(currentSpeed) > 0.1) {
                const skew = currentSpeed * scrollDirection * 0.15;
                track.style.setProperty('--marquee-skew', `${skew}deg`);
            }
            requestAnimationFrame(animate);
        }
        animate();
    }

    /* ----------------------------------------------------------
       12. SMOOTH COUNTER ANIMATION (enhanced)
       Numbers count up with spring easing
    ---------------------------------------------------------- */
    function initSpringCounters() {
        // These are handled by existing counter code, but we enhance them
        const counters = document.querySelectorAll('.stat-number[data-scroll-count]');

        counters.forEach(counter => {
            counter.classList.add('counter-spring');
        });
    }

    /* ----------------------------------------------------------
       13. CURSOR BLEND MODE
       Custom cursor changes blend mode over dark sections
    ---------------------------------------------------------- */
    function initCursorBlend() {
        if (isMobile) return;

        const cursorDot = document.querySelector('.cursor-dot');
        const cursorRing = document.querySelector('.cursor-ring');
        if (!cursorDot || !cursorRing) return;

        const darkSections = document.querySelectorAll('.stats-showcase, .hero, footer');

        const observer = new IntersectionObserver((entries) => {
            // Track which dark sections are visible
        }, { threshold: 0 });

        // On mousemove, check if cursor is over a dark section
        document.addEventListener('mousemove', function(e) {
            let overDark = false;
            darkSections.forEach(section => {
                const rect = section.getBoundingClientRect();
                if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    overDark = true;
                }
            });

            if (overDark) {
                cursorDot.classList.add('cursor-light');
                cursorRing.classList.add('cursor-light');
            } else {
                cursorDot.classList.remove('cursor-light');
                cursorRing.classList.remove('cursor-light');
            }
        }, { passive: true });
    }

    /* ----------------------------------------------------------
       INIT
    ---------------------------------------------------------- */
    function safeInit(fn, name) {
        try { fn(); } catch (e) { console.warn('[world-class] ' + name + ' failed:', e.message); }
    }

    function init() {
        safeInit(initSmoothScroll, 'smoothScroll');
        safeInit(initSplitText, 'splitText');
        safeInit(initImageReveals, 'imageReveals');
        safeInit(initMagneticButtons, 'magneticButtons');
        safeInit(initFloatingElements, 'floatingElements');
        safeInit(initCurvedDividers, 'curvedDividers');
        safeInit(initCardTilt, 'cardTilt');
        safeInit(initLineReveal, 'lineReveal');
        safeInit(initStaggerFade, 'staggerFade');
        safeInit(initNavbarMorph, 'navbarMorph');
        safeInit(initScrollMarquee, 'scrollMarquee');
        safeInit(initSpringCounters, 'springCounters');
        safeInit(initCursorBlend, 'cursorBlend');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
