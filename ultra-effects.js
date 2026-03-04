// ===== ULTRA EFFECTS - Skynn & Co. Clinic =====
// Pro-level: Lightbox, Aurora hero, Smooth scroll, Page transitions,
// Staggered animations, Scroll counters, Wave dividers

(function () {
    'use strict';

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isDesktop = window.innerWidth >= 1024 && window.matchMedia('(hover: hover)').matches;

    // ===== 1. FULLSCREEN GALLERY LIGHTBOX =====
    function initLightbox() {
        var galleryItems = document.querySelectorAll('.gallery-section .gallery-item');
        if (!galleryItems.length) return;

        // Build lightbox DOM
        var lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML =
            '<div class="lightbox-backdrop"></div>' +
            '<button class="lightbox-close" aria-label="Sluiten">&times;</button>' +
            '<button class="lightbox-prev" aria-label="Vorige">&#8249;</button>' +
            '<button class="lightbox-next" aria-label="Volgende">&#8250;</button>' +
            '<div class="lightbox-content">' +
                '<img class="lightbox-img" src="" alt="">' +
                '<video class="lightbox-video" muted loop playsinline></video>' +
            '</div>' +
            '<div class="lightbox-counter"><span class="lightbox-current">1</span> / <span class="lightbox-total">1</span></div>';
        document.body.appendChild(lightbox);

        var img = lightbox.querySelector('.lightbox-img');
        var video = lightbox.querySelector('.lightbox-video');
        var counter = lightbox.querySelector('.lightbox-current');
        var total = lightbox.querySelector('.lightbox-total');
        var items = [];
        var currentIndex = 0;

        // Collect all image/video sources
        galleryItems.forEach(function (item) {
            var imgEl = item.querySelector('img');
            var vidEl = item.querySelector('video source');
            if (imgEl) {
                items.push({ type: 'image', src: imgEl.src, alt: imgEl.alt });
            } else if (vidEl) {
                items.push({ type: 'video', src: vidEl.src });
            }
        });
        total.textContent = items.length;

        function openLightbox(index) {
            currentIndex = index;
            showItem(currentIndex);
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeLightbox() {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
            video.pause();
            video.src = '';
        }

        function showItem(index) {
            var item = items[index];
            counter.textContent = index + 1;
            if (item.type === 'image') {
                img.src = item.src;
                img.alt = item.alt || '';
                img.style.display = 'block';
                video.style.display = 'none';
                video.pause();
            } else {
                video.src = item.src;
                video.style.display = 'block';
                img.style.display = 'none';
                video.play().catch(function () {});
            }
        }

        function next() {
            currentIndex = (currentIndex + 1) % items.length;
            showItem(currentIndex);
        }

        function prev() {
            currentIndex = (currentIndex - 1 + items.length) % items.length;
            showItem(currentIndex);
        }

        // Event listeners
        galleryItems.forEach(function (item, i) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function () { openLightbox(i); });
        });

        lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
        lightbox.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);
        lightbox.querySelector('.lightbox-next').addEventListener('click', function (e) { e.stopPropagation(); next(); });
        lightbox.querySelector('.lightbox-prev').addEventListener('click', function (e) { e.stopPropagation(); prev(); });

        // Keyboard navigation
        document.addEventListener('keydown', function (e) {
            if (!lightbox.classList.contains('active')) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') next();
            if (e.key === 'ArrowLeft') prev();
        });

        // Swipe support on mobile
        var touchStartX = 0;
        lightbox.addEventListener('touchstart', function (e) {
            touchStartX = e.changedTouches[0].clientX;
        }, { passive: true });
        lightbox.addEventListener('touchend', function (e) {
            var dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) > 50) {
                if (dx < 0) next(); else prev();
            }
        }, { passive: true });
    }

    // ===== 2. AURORA HERO GRADIENT (mouse follow) =====
    function initAuroraHero() {
        if (!isDesktop || prefersReducedMotion) return;

        var hero = document.querySelector('.hero');
        if (!hero) return;

        var aurora = document.createElement('div');
        aurora.className = 'hero-aurora';
        aurora.setAttribute('aria-hidden', 'true');
        hero.insertBefore(aurora, hero.firstChild);

        var targetX = 50, targetY = 50;
        var currentX = 50, currentY = 50;
        var rafId = null;

        hero.addEventListener('mousemove', function (e) {
            var rect = hero.getBoundingClientRect();
            targetX = ((e.clientX - rect.left) / rect.width) * 100;
            targetY = ((e.clientY - rect.top) / rect.height) * 100;

            if (!rafId) {
                rafId = requestAnimationFrame(animate);
            }
        }, { passive: true });

        hero.addEventListener('mouseleave', function () {
            targetX = 50;
            targetY = 50;
        });

        function animate() {
            currentX += (targetX - currentX) * 0.06;
            currentY += (targetY - currentY) * 0.06;

            aurora.style.background =
                'radial-gradient(ellipse 600px 400px at ' + currentX + '% ' + currentY + '%, ' +
                'rgba(181, 79, 63, 0.08) 0%, ' +
                'rgba(181, 79, 63, 0.03) 40%, ' +
                'transparent 70%)';

            if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
                rafId = requestAnimationFrame(animate);
            } else {
                rafId = null;
            }
        }
    }

    // ===== 3. SMOOTH SCROLL ENGINE =====
    function initSmoothScroll() {
        if (prefersReducedMotion || !isDesktop) return;

        // Override native scroll with lerped smooth scroll
        var scrollY = window.scrollY;
        var targetScrollY = scrollY;
        var scrolling = false;
        var ease = 0.09;

        // Apply transform-based scrolling to body
        document.body.style.position = 'fixed';
        document.body.style.top = '0';
        document.body.style.left = '0';
        document.body.style.width = '100%';

        var wrapper = document.createElement('div');
        wrapper.className = 'smooth-scroll-spacer';
        wrapper.style.height = document.body.scrollHeight + 'px';
        document.body.parentElement.appendChild(wrapper);

        function updateHeight() {
            wrapper.style.height = document.body.scrollHeight + 'px';
        }

        window.addEventListener('resize', updateHeight);
        // Also update when images load
        document.querySelectorAll('img').forEach(function (img) {
            img.addEventListener('load', updateHeight, { once: true });
        });

        window.addEventListener('scroll', function () {
            targetScrollY = window.scrollY;
            if (!scrolling) {
                scrolling = true;
                requestAnimationFrame(render);
            }
        }, { passive: true });

        function render() {
            scrollY += (targetScrollY - scrollY) * ease;

            if (Math.abs(targetScrollY - scrollY) < 0.5) {
                scrollY = targetScrollY;
                scrolling = false;
            }

            document.body.style.transform = 'translateY(' + (-scrollY) + 'px)';

            // Dispatch custom event for other effects
            window.dispatchEvent(new CustomEvent('smoothscroll', { detail: { scrollY: scrollY } }));

            if (scrolling) {
                requestAnimationFrame(render);
            }
        }

        // Initial render
        targetScrollY = window.scrollY;
        scrollY = targetScrollY;
        document.body.style.transform = 'translateY(' + (-scrollY) + 'px)';
    }

    // ===== 4. PAGE TRANSITIONS =====
    function initPageTransitions() {
        if (prefersReducedMotion) return;

        // Create transition overlay
        var transition = document.createElement('div');
        transition.className = 'page-transition';
        transition.innerHTML = '<div class="page-transition-bar"></div><div class="page-transition-bar"></div><div class="page-transition-bar"></div>';
        document.body.appendChild(transition);

        // Intercept internal navigation
        document.addEventListener('click', function (e) {
            var link = e.target.closest('a[href]');
            if (!link) return;

            var href = link.getAttribute('href');
            if (!href) return;

            // Skip external links, anchors, booking links, new tabs
            if (link.target === '_blank') return;
            if (href.startsWith('#')) return;
            if (href.startsWith('http') && !href.includes(window.location.hostname)) return;
            if (href.startsWith('mailto:') || href.startsWith('tel:')) return;

            e.preventDefault();
            transition.classList.add('active');

            setTimeout(function () {
                window.location.href = href;
            }, 600);
        });

        // Animate in when page loads
        if (document.referrer && document.referrer.includes(window.location.hostname)) {
            transition.classList.add('exit');
            setTimeout(function () {
                transition.classList.remove('exit');
            }, 50);
        }
    }

    // ===== 5. STAGGERED CARD ENTRANCE =====
    function initStaggeredCards() {
        if (prefersReducedMotion) return;

        var groups = document.querySelectorAll('.reveal-stagger');
        if (!groups.length) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var children = entry.target.children;
                    for (var i = 0; i < children.length; i++) {
                        (function (child, delay) {
                            setTimeout(function () {
                                child.classList.add('stagger-visible');
                            }, delay);
                        })(children[i], i * 120);
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

        groups.forEach(function (g) {
            // Add initial hidden state to children
            for (var i = 0; i < g.children.length; i++) {
                g.children[i].classList.add('stagger-item');
            }
            observer.observe(g);
        });
    }

    // ===== 6. SCROLL-DRIVEN NUMBER COUNTERS =====
    function initScrollCounters() {
        var counters = document.querySelectorAll('[data-scroll-count]');
        if (!counters.length) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(function (el) { observer.observe(el); });

        function animateCounter(el) {
            var target = parseInt(el.dataset.scrollCount, 10);
            var suffix = el.dataset.suffix || '';
            var prefix = el.dataset.prefix || '';
            var duration = 2200;
            var start = performance.now();
            var formatter = new Intl.NumberFormat('nl-NL');

            function step(now) {
                var elapsed = now - start;
                var progress = Math.min(elapsed / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 4);
                el.textContent = prefix + formatter.format(Math.round(eased * target)) + suffix;
                if (progress < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }
    }

    // ===== 7. ANIMATED WAVE SECTION DIVIDERS =====
    function initWaveDividers() {
        if (prefersReducedMotion) return;

        var sections = document.querySelectorAll('[data-wave]');
        sections.forEach(function (section) {
            var position = section.dataset.wave || 'bottom';
            var wave = document.createElement('div');
            wave.className = 'wave-divider wave-divider--' + position;
            wave.setAttribute('aria-hidden', 'true');
            wave.innerHTML =
                '<svg viewBox="0 0 1440 60" preserveAspectRatio="none">' +
                '<path d="M0,40 C240,10 480,55 720,35 C960,15 1200,50 1440,30 L1440,60 L0,60 Z" fill="currentColor"/>' +
                '</svg>';
            if (position === 'top') {
                section.insertBefore(wave, section.firstChild);
            } else {
                section.appendChild(wave);
            }
        });
    }

    // ===== 8. TILT ON RESULT CARDS (mobile swipe aware) =====
    function initResultCardEffects() {
        if (!isDesktop || prefersReducedMotion) return;

        var cards = document.querySelectorAll('.result-card');
        cards.forEach(function (card) {
            card.addEventListener('mouseenter', function () {
                card.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
                card.style.transform = 'translateY(-10px) scale(1.02)';
            });
            card.addEventListener('mouseleave', function () {
                card.style.transform = '';
            });
        });
    }

    // ===== 9. ANIMATED SECTION LABELS =====
    function initSectionLabels() {
        if (prefersReducedMotion) return;

        var labels = document.querySelectorAll('.section-label');
        if (!labels.length) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('label-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        labels.forEach(function (el) {
            el.classList.add('label-animate');
            observer.observe(el);
        });
    }

    // ===== 10. NAVBAR HIDE ON SCROLL DOWN, SHOW ON SCROLL UP =====
    function initSmartNavbar() {
        var navbar = document.getElementById('navbar');
        if (!navbar) return;

        var lastScrollY = window.scrollY;
        var ticking = false;
        var hidden = false;

        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(function () {
                    var currentScrollY = window.scrollY;
                    if (currentScrollY > 400 && currentScrollY > lastScrollY + 5 && !hidden) {
                        navbar.classList.add('nav-hidden');
                        hidden = true;
                    } else if (currentScrollY < lastScrollY - 5 && hidden) {
                        navbar.classList.remove('nav-hidden');
                        hidden = false;
                    }
                    lastScrollY = currentScrollY;
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // ===== 11. HOVER RIPPLE ON BUTTONS =====
    function initButtonRipple() {
        if (!isDesktop) return;

        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.btn-service, .btn-outline, .btn-nav');
            if (!btn) return;

            var ripple = document.createElement('span');
            ripple.className = 'btn-ripple';
            var rect = btn.getBoundingClientRect();
            var size = Math.max(rect.width, rect.height) * 2;
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            btn.style.position = 'relative';
            btn.style.overflow = 'hidden';
            btn.appendChild(ripple);
            setTimeout(function () { ripple.remove(); }, 700);
        });
    }

    // ===== 12. SCROLL PROGRESS BAR =====
    function initScrollProgress() {
        var bar = document.querySelector('.scroll-progress');
        if (!bar) return;

        window.addEventListener('scroll', function () {
            var scrollTop = window.scrollY;
            var docHeight = document.documentElement.scrollHeight - window.innerHeight;
            var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            bar.style.width = progress + '%';
        }, { passive: true });
    }

    // ===== 13. SPARKLE CURSOR TRAIL =====
    function initSparkleTrail() {
        if (!isDesktop || prefersReducedMotion) return;

        var canvas = document.createElement('canvas');
        canvas.className = 'sparkle-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9998;';
        document.body.appendChild(canvas);
        var ctx = canvas.getContext('2d');

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        var particles = [];
        var mouseX = -100, mouseY = -100;
        var lastX = -100, lastY = -100;

        document.addEventListener('mousemove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        }, { passive: true });

        function Particle(x, y) {
            this.x = x + (Math.random() - 0.5) * 12;
            this.y = y + (Math.random() - 0.5) * 12;
            this.vx = (Math.random() - 0.5) * 1.2;
            this.vy = (Math.random() - 0.5) * 1.2 - 0.5;
            this.life = 1;
            this.decay = 0.015 + Math.random() * 0.02;
            this.size = Math.random() * 3 + 1.5;
            this.hue = Math.random() > 0.5 ? 12 : 25; // warm tones
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Spawn particles only when mouse moves
            var dx = mouseX - lastX;
            var dy = mouseY - lastY;
            if (Math.abs(dx) + Math.abs(dy) > 3) {
                particles.push(new Particle(mouseX, mouseY));
                if (Math.abs(dx) + Math.abs(dy) > 8) {
                    particles.push(new Particle(mouseX, mouseY));
                }
                lastX = mouseX;
                lastY = mouseY;
            }

            // Cap particles
            if (particles.length > 60) particles.splice(0, particles.length - 60);

            for (var i = particles.length - 1; i >= 0; i--) {
                var p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= p.decay;

                if (p.life <= 0) {
                    particles.splice(i, 1);
                    continue;
                }

                ctx.save();
                ctx.globalAlpha = p.life * 0.7;
                ctx.fillStyle = 'hsl(' + p.hue + ', 65%, 60%)';
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'hsl(' + p.hue + ', 65%, 60%)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            requestAnimationFrame(animate);
        }
        animate();
    }

    // ===== 14. MORPHING BLOB BACKGROUNDS =====
    function initMorphingBlobs() {
        if (prefersReducedMotion) return;

        var sections = document.querySelectorAll('.services-section, .about-preview, .home-signature');
        sections.forEach(function (section, idx) {
            var blob = document.createElement('div');
            blob.className = 'morph-blob morph-blob--' + (idx % 3);
            blob.setAttribute('aria-hidden', 'true');
            section.style.position = 'relative';
            section.style.overflow = 'hidden';
            section.insertBefore(blob, section.firstChild);
        });
    }

    // ===== 15. 3D GALLERY TILT =====
    function initGalleryTilt() {
        if (!isDesktop || prefersReducedMotion) return;

        var items = document.querySelectorAll('.gallery-section .gallery-item');
        items.forEach(function (item) {
            item.addEventListener('mousemove', function (e) {
                var rect = item.getBoundingClientRect();
                var x = (e.clientX - rect.left) / rect.width;
                var y = (e.clientY - rect.top) / rect.height;
                var tiltX = (y - 0.5) * -8;
                var tiltY = (x - 0.5) * 8;
                item.style.transform = 'perspective(600px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg) scale(1.03)';
                item.style.transition = 'none';
            }, { passive: true });

            item.addEventListener('mouseleave', function () {
                item.style.transform = '';
                item.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
            });
        });
    }

    // ===== 16. BEFORE/AFTER INTERACTIVE SLIDERS =====
    function initBeforeAfterSliders() {
        var sliders = document.querySelectorAll('.ba-slider');
        if (!sliders.length) return;

        sliders.forEach(function (slider) {
            var handle = slider.querySelector('.ba-handle');
            var beforeClip = slider.querySelector('.ba-before');
            if (!handle || !beforeClip) return;

            var isDragging = false;

            function updatePosition(x) {
                var rect = slider.getBoundingClientRect();
                var percent = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100));
                beforeClip.style.clipPath = 'inset(0 ' + (100 - percent) + '% 0 0)';
                handle.style.left = percent + '%';
            }

            handle.addEventListener('mousedown', function (e) {
                isDragging = true;
                e.preventDefault();
            });
            document.addEventListener('mousemove', function (e) {
                if (isDragging) updatePosition(e.clientX);
            });
            document.addEventListener('mouseup', function () { isDragging = false; });

            // Touch
            handle.addEventListener('touchstart', function (e) {
                isDragging = true;
            }, { passive: true });
            slider.addEventListener('touchmove', function (e) {
                if (isDragging) updatePosition(e.touches[0].clientX);
            }, { passive: true });
            document.addEventListener('touchend', function () { isDragging = false; });

            // Click on slider
            slider.addEventListener('click', function (e) {
                updatePosition(e.clientX);
            });
        });
    }

    // ===== 17. SCROLL VELOCITY PARALLAX =====
    function initScrollVelocity() {
        if (!isDesktop || prefersReducedMotion) return;

        var elements = document.querySelectorAll('.service-card, .result-card, .review-card');
        if (!elements.length) return;

        var lastScroll = window.scrollY;
        var velocity = 0;

        window.addEventListener('scroll', function () {
            var current = window.scrollY;
            velocity = Math.min(Math.abs(current - lastScroll), 15);
            lastScroll = current;

            elements.forEach(function (el) {
                var rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    var skew = velocity * 0.08;
                    el.style.transform = 'skewY(' + skew + 'deg)';
                    el.style.transition = 'transform 0.3s ease-out';
                }
            });
        }, { passive: true });

        // Reset on scroll stop
        var scrollTimer;
        window.addEventListener('scroll', function () {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(function () {
                elements.forEach(function (el) {
                    el.style.transform = '';
                });
            }, 150);
        }, { passive: true });
    }

    // ===== 18. TEXT SCRAMBLE ON HERO =====
    function initTextScramble() {
        if (prefersReducedMotion) return;

        var el = document.querySelector('.hero-reviews strong');
        if (!el || !el.dataset.count) return;

        var target = parseInt(el.dataset.count, 10);
        var observer = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) {
                scrambleCount(el, target);
                observer.disconnect();
            }
        }, { threshold: 0.5 });
        observer.observe(el);

        function scrambleCount(el, target) {
            var chars = '0123456789';
            var final = new Intl.NumberFormat('nl-NL').format(target) + ' reviews';
            var frame = 0;
            var maxFrames = 30;

            function step() {
                frame++;
                var result = '';
                for (var i = 0; i < final.length; i++) {
                    if (frame / maxFrames > i / final.length) {
                        result += final[i];
                    } else {
                        if (final[i] === ' ' || final[i] === '.' || final[i] === ',') {
                            result += final[i];
                        } else {
                            result += chars[Math.floor(Math.random() * chars.length)];
                        }
                    }
                }
                el.textContent = result;
                if (frame < maxFrames) {
                    requestAnimationFrame(step);
                }
            }
            requestAnimationFrame(step);
        }
    }

    // ===== 19. FLOATING ACTION ICONS ON SERVICE CARDS =====
    function initServiceCardIcons() {
        var cards = document.querySelectorAll('.service-card');
        cards.forEach(function (card) {
            var img = card.querySelector('.service-image');
            if (!img) return;

            var glow = document.createElement('div');
            glow.className = 'service-card-glow';
            glow.setAttribute('aria-hidden', 'true');
            img.appendChild(glow);
        });
    }

    // ===== 20. HORIZONTAL SCROLL PINNED SECTION =====
    function initHorizontalScroll() {
        var section = document.querySelector('.horizontal-scroll-section');
        if (!section) return;

        var track = section.querySelector('.horizontal-scroll-track');
        if (!track) return;

        var items = track.children;
        var totalWidth = 0;
        for (var i = 0; i < items.length; i++) {
            totalWidth += items[i].offsetWidth + 24;
        }
        section.style.height = totalWidth + 'px';

        window.addEventListener('scroll', function () {
            var rect = section.getBoundingClientRect();
            var sectionTop = rect.top + window.scrollY;
            var scrolled = window.scrollY - sectionTop;
            var progress = Math.max(0, Math.min(1, scrolled / (totalWidth - window.innerWidth)));
            var translateX = progress * (totalWidth - window.innerWidth);

            if (rect.top <= 0 && rect.bottom >= window.innerHeight) {
                track.style.position = 'fixed';
                track.style.top = '0';
                track.style.transform = 'translateX(' + (-translateX) + 'px)';
            } else if (rect.top > 0) {
                track.style.position = 'relative';
                track.style.transform = 'translateX(0)';
            } else {
                track.style.position = 'relative';
                track.style.transform = 'translateX(' + (-(totalWidth - window.innerWidth)) + 'px)';
            }
        }, { passive: true });
    }

    // ===== INIT =====
    function safeInit(fn, name) {
        try { fn(); } catch (e) { console.warn('[ultra] ' + name + ' failed:', e.message); }
    }

    function init() {
        safeInit(initLightbox, 'lightbox');
        safeInit(initAuroraHero, 'aurora');
        safeInit(initPageTransitions, 'pageTransitions');
        safeInit(initStaggeredCards, 'staggeredCards');
        safeInit(initScrollCounters, 'scrollCounters');
        safeInit(initWaveDividers, 'waveDividers');
        safeInit(initResultCardEffects, 'resultCards');
        safeInit(initSectionLabels, 'sectionLabels');
        safeInit(initSmartNavbar, 'smartNavbar');
        safeInit(initButtonRipple, 'buttonRipple');
        safeInit(initScrollProgress, 'scrollProgress');
        safeInit(initSparkleTrail, 'sparkleTrail');
        safeInit(initMorphingBlobs, 'morphingBlobs');
        safeInit(initGalleryTilt, 'galleryTilt');
        safeInit(initBeforeAfterSliders, 'beforeAfterSliders');
        // initTextScramble disabled: conflicts with counter animation in modern-enhancements.js
        safeInit(initServiceCardIcons, 'serviceCardIcons');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
