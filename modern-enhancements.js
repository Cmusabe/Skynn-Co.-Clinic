// ===== MODERN ENHANCEMENTS - Skynn & Co. Clinic =====
// Scroll reveals, counter animations, floating CTA, lazy loading

(function () {
    'use strict';

    // ===== SCROLL REVEAL (Intersection Observer) =====
    function initScrollReveal() {
        var revealElements = document.querySelectorAll('.reveal');
        if (!revealElements.length) return;

        // Mark HTML as ready so CSS can hide elements before animating
        document.documentElement.classList.add('reveal-ready');

        // Small delay to let the browser paint the hidden state first
        requestAnimationFrame(function () {
            var observer = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('visible');
                            observer.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
            );

            revealElements.forEach(function (el) {
                observer.observe(el);
            });
        });
    }

    // ===== COUNTER ANIMATION =====
    function initCounterAnimation() {
        var counterEl = document.querySelector('[data-count]');
        if (!counterEl) return;

        var target = parseInt(counterEl.dataset.count, 10);
        if (!target) return;

        var started = false;

        function animateCount() {
            if (started) return;
            started = true;

            var duration = 2000;
            var start = performance.now();
            var formatter = new Intl.NumberFormat('nl-NL');

            function step(now) {
                var elapsed = now - start;
                var progress = Math.min(elapsed / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 3);
                var current = Math.round(eased * target);
                counterEl.textContent = formatter.format(current) + ' reviews';

                if (progress < 1) {
                    requestAnimationFrame(step);
                }
            }

            requestAnimationFrame(step);
        }

        var observer = new IntersectionObserver(
            function (entries) {
                if (entries[0].isIntersecting) {
                    animateCount();
                    observer.disconnect();
                }
            },
            { threshold: 0.5 }
        );

        observer.observe(counterEl);
    }

    // ===== FLOATING CTA ENTRANCE =====
    function initFloatingCTA() {
        var cta = document.querySelector('.floating-cta');
        if (!cta) return;

        function checkScroll() {
            if (window.scrollY > 400) {
                cta.classList.add('visible');
            } else {
                cta.classList.remove('visible');
            }
        }

        window.addEventListener('scroll', checkScroll, { passive: true });
        checkScroll();
    }

    // ===== LAZY LOAD IMAGES =====
    function initLazyImages() {
        var images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(function (img) {
            if (img.complete) {
                img.classList.add('loaded');
            } else {
                img.addEventListener('load', function () { img.classList.add('loaded'); }, { once: true });
            }
        });
    }

    // ===== HERO SCROLL INDICATOR HIDE ON SCROLL =====
    function initScrollIndicator() {
        var indicator = document.querySelector('.hero-scroll-indicator');
        if (!indicator) return;

        var hidden = false;
        function onScroll() {
            if (!hidden && window.scrollY > 100) {
                indicator.style.opacity = '0';
                indicator.style.pointerEvents = 'none';
                hidden = true;
            } else if (hidden && window.scrollY <= 100) {
                indicator.style.opacity = '';
                indicator.style.pointerEvents = '';
                hidden = false;
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
    }

    // ===== SMOOTH PARALLAX ON HERO IMAGE =====
    function initHeroParallax() {
        var heroImage = document.querySelector('.hero-image-arch');
        if (!heroImage) return;

        // Only on desktop
        if (window.innerWidth < 1024) return;

        var ticking = false;
        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(function () {
                    var scroll = window.scrollY;
                    if (scroll < window.innerHeight) {
                        heroImage.style.transform = 'translateY(' + (scroll * 0.06) + 'px)';
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
    }

    // ===== CARD GLOW ON HOVER (cursor-tracking) =====
    function initCardGlow() {
        // Only on desktop with pointer
        if (window.innerWidth < 1024 || !window.matchMedia('(hover: hover)').matches) return;

        var cards = document.querySelectorAll('.service-card, .review-card, .home-proof-card, .contact-action-card, .about-value-card, .pricing-note-card');
        cards.forEach(function (card) {
            card.addEventListener('mousemove', function (e) {
                var rect = card.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;
                card.style.setProperty('--glow-x', x + 'px');
                card.style.setProperty('--glow-y', y + 'px');
            });
        });
    }

    // ===== SMOOTH NAVBAR BACKGROUND TRANSITION =====
    function initNavbarSmooth() {
        var navbar = document.getElementById('navbar');
        if (!navbar) return;

        var lastScroll = 0;
        var ticking = false;

        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(function () {
                    var scroll = window.scrollY;
                    if (scroll > 60 && lastScroll <= 60) {
                        navbar.classList.add('scrolled');
                    } else if (scroll <= 60 && lastScroll > 60) {
                        navbar.classList.remove('scrolled');
                    }
                    lastScroll = scroll;
                    ticking = false;
                });
                ticking = true;
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        if (window.scrollY > 60) navbar.classList.add('scrolled');
    }

    // ===== INIT ALL =====
    function init() {
        initScrollReveal();
        initCounterAnimation();
        initFloatingCTA();
        initLazyImages();
        initScrollIndicator();
        initHeroParallax();
        initCardGlow();
        initNavbarSmooth();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
