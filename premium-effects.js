// ===== PREMIUM EFFECTS - Skynn & Co. Clinic =====
// Luxury interactions: custom cursor, 3D tilt, text reveal, magnetic buttons, marquee, particles

(function () {
    'use strict';

    const isDesktop = window.innerWidth >= 1024 && window.matchMedia('(hover: hover)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ===== CUSTOM CURSOR (desktop only) =====
    function initCustomCursor() {
        if (!isDesktop || prefersReducedMotion) return;

        const cursor = document.querySelector('.cursor-dot');
        const cursorRing = document.querySelector('.cursor-ring');
        if (!cursor || !cursorRing) return;

        let mouseX = -100, mouseY = -100;
        let ringX = -100, ringY = -100;
        let visible = false;

        document.addEventListener('mousemove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (!visible) {
                visible = true;
                cursor.style.opacity = '1';
                cursorRing.style.opacity = '1';
            }
            cursor.style.transform = 'translate(' + mouseX + 'px, ' + mouseY + 'px)';
        }, { passive: true });

        function animateRing() {
            ringX += (mouseX - ringX) * 0.15;
            ringY += (mouseY - ringY) * 0.15;
            cursorRing.style.transform = 'translate(' + ringX + 'px, ' + ringY + 'px)';
            requestAnimationFrame(animateRing);
        }
        requestAnimationFrame(animateRing);

        // Scale up cursor on interactive elements
        var interactiveElements = 'a, button, .btn-service, .btn-outline, .btn-nav, .service-card, .review-card, .gallery-item, input, textarea, select';
        document.addEventListener('mouseover', function (e) {
            if (e.target.closest(interactiveElements)) {
                cursor.classList.add('cursor-hover');
                cursorRing.classList.add('cursor-hover');
            }
        }, { passive: true });
        document.addEventListener('mouseout', function (e) {
            if (e.target.closest(interactiveElements)) {
                cursor.classList.remove('cursor-hover');
                cursorRing.classList.remove('cursor-hover');
            }
        }, { passive: true });

        // Hide on mouse leave
        document.addEventListener('mouseleave', function () {
            cursor.style.opacity = '0';
            cursorRing.style.opacity = '0';
            visible = false;
        });
    }

    // ===== 3D CARD TILT =====
    function initCardTilt() {
        if (!isDesktop || prefersReducedMotion) return;

        var cards = document.querySelectorAll('.service-card, .review-card, .home-proof-card, .pricing-note-card, .contact-action-card');
        cards.forEach(function (card) {
            card.addEventListener('mousemove', function (e) {
                var rect = card.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;
                var centerX = rect.width / 2;
                var centerY = rect.height / 2;
                var rotateX = ((y - centerY) / centerY) * -6;
                var rotateY = ((x - centerX) / centerX) * 6;
                card.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-8px)';
            }, { passive: true });

            card.addEventListener('mouseleave', function () {
                card.style.transform = '';
                card.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
                setTimeout(function () { card.style.transition = ''; }, 500);
            });
        });
    }

    // ===== MAGNETIC BUTTONS =====
    function initMagneticButtons() {
        if (!isDesktop || prefersReducedMotion) return;

        var buttons = document.querySelectorAll('.btn-service, .btn-outline, .btn-nav');
        buttons.forEach(function (btn) {
            btn.addEventListener('mousemove', function (e) {
                var rect = btn.getBoundingClientRect();
                var x = e.clientX - rect.left - rect.width / 2;
                var y = e.clientY - rect.top - rect.height / 2;
                btn.style.transform = 'translate(' + (x * 0.2) + 'px, ' + (y * 0.2) + 'px)';
            }, { passive: true });

            btn.addEventListener('mouseleave', function () {
                btn.style.transform = '';
                btn.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
                setTimeout(function () { btn.style.transition = ''; }, 400);
            });
        });
    }

    // ===== TEXT REVEAL ON SCROLL =====
    function initTextReveal() {
        if (prefersReducedMotion) return;

        var revealElements = document.querySelectorAll('.text-reveal');
        if (!revealElements.length) return;

        // Hero text reveals with a cinematic delay after page load
        var heroReveal = document.querySelector('.hero .text-reveal');
        if (heroReveal) {
            setTimeout(function () {
                heroReveal.classList.add('text-revealed');
            }, 600);
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('text-revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3, rootMargin: '0px 0px -40px 0px' });

        revealElements.forEach(function (el) {
            if (el !== heroReveal) observer.observe(el);
        });
    }

    // ===== IMAGE REVEAL ON SCROLL =====
    function initImageReveal() {
        if (prefersReducedMotion) return;

        var images = document.querySelectorAll('.img-reveal');
        if (!images.length) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('img-revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -30px 0px' });

        images.forEach(function (el) { observer.observe(el); });
    }

    // ===== MARQUEE AUTO-SCROLL =====
    function initMarquee() {
        var marquee = document.querySelector('.marquee-track');
        if (!marquee || prefersReducedMotion) return;

        // Duplicate content for seamless loop
        var content = marquee.innerHTML;
        marquee.innerHTML = content + content;
    }

    // ===== CINEMATIC PAGE ENTRANCE =====
    function initPageEntrance() {
        if (prefersReducedMotion) return;

        var loader = document.querySelector('.page-loader');
        if (!loader) return;

        // Wait for everything to load
        function hideLoader() {
            loader.classList.add('loaded');
            setTimeout(function () {
                loader.style.display = 'none';
            }, 1200);
        }

        if (document.readyState === 'complete') {
            setTimeout(hideLoader, 300);
        } else {
            window.addEventListener('load', function () {
                setTimeout(hideLoader, 300);
            });
        }
    }

    // ===== FLOATING PARTICLES =====
    function initFloatingParticles() {
        if (!isDesktop || prefersReducedMotion) return;

        var container = document.querySelector('.particles-container');
        if (!container) return;

        for (var i = 0; i < 6; i++) {
            var particle = document.createElement('div');
            particle.className = 'floating-particle';
            particle.style.setProperty('--x', (Math.random() * 100) + '%');
            particle.style.setProperty('--y', (Math.random() * 100) + '%');
            particle.style.setProperty('--size', (Math.random() * 200 + 80) + 'px');
            particle.style.setProperty('--duration', (Math.random() * 20 + 15) + 's');
            particle.style.setProperty('--delay', (Math.random() * -20) + 's');
            container.appendChild(particle);
        }
    }

    // ===== PARALLAX DEPTH IMAGES =====
    function initParallaxDepth() {
        if (!isDesktop || prefersReducedMotion) return;

        var elements = document.querySelectorAll('[data-parallax]');
        if (!elements.length) return;

        var ticking = false;
        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(function () {
                    var scrollY = window.scrollY;
                    elements.forEach(function (el) {
                        var speed = parseFloat(el.dataset.parallax) || 0.05;
                        var rect = el.getBoundingClientRect();
                        var offset = (rect.top + scrollY) - scrollY;
                        el.style.transform = 'translateY(' + (offset * speed * -1) + 'px)';
                    });
                    ticking = false;
                });
                ticking = true;
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
    }

    // ===== HORIZONTAL REVIEW SCROLL PEEK (mobile) =====
    function initReviewScroll() {
        if (isDesktop) return;

        var grid = document.querySelector('.reviews-grid');
        if (!grid) return;

        // Add scroll snapping class for mobile
        grid.classList.add('reviews-scroll-mobile');
    }

    // ===== SMOOTH COUNTER WITH NUMBER MORPHING =====
    function initSmoothNumbers() {
        var counters = document.querySelectorAll('.counter-morph');
        if (!counters.length) return;

        counters.forEach(function (el) {
            var target = parseInt(el.dataset.target, 10);
            if (!target) return;

            var observer = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) {
                    animateNumber(el, target);
                    observer.disconnect();
                }
            }, { threshold: 0.5 });
            observer.observe(el);
        });

        function animateNumber(el, target) {
            var duration = 2500;
            var start = performance.now();
            var formatter = new Intl.NumberFormat('nl-NL');

            function step(now) {
                var elapsed = now - start;
                var progress = Math.min(elapsed / duration, 1);
                // Ease out expo
                var eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                el.textContent = formatter.format(Math.round(eased * target));
                if (progress < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }
    }

    // ===== SECTION BACKGROUND SHIFT ON SCROLL =====
    function initSectionShift() {
        if (prefersReducedMotion) return;

        var sections = document.querySelectorAll('.shift-bg');
        if (!sections.length) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('shift-active');
                } else {
                    entry.target.classList.remove('shift-active');
                }
            });
        }, { threshold: 0.2 });

        sections.forEach(function (s) { observer.observe(s); });
    }

    // ===== INIT =====
    function init() {
        initPageEntrance();
        initCustomCursor();
        initCardTilt();
        initMagneticButtons();
        initTextReveal();
        initImageReveal();
        initMarquee();
        initFloatingParticles();
        initParallaxDepth();
        initReviewScroll();
        initSmoothNumbers();
        initSectionShift();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
