/**
 * DataScript AI - Interactive Landing Page
 * Controls sliders, animated counters, and infinite carousel.
 */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. Before / After Compare Sliders
    // =========================================================================
    const containers = document.querySelectorAll('.compare-container');

    containers.forEach(container => {
        const afterPanel = container.querySelector('.compare-after');
        const handle = container.querySelector('.compare-handle');

        if (!afterPanel || !handle) return;

        function updateSplit(clientX) {
            const rect = container.getBoundingClientRect();
            let x = clientX - rect.left;
            if (x < 0) x = 0;
            if (x > rect.width) x = rect.width;
            const pct = (x / rect.width) * 100;
            afterPanel.style.width = `${100 - pct}%`;
            handle.style.left = `${pct}%`;
        }

        container.addEventListener('mousemove', (e) => updateSplit(e.clientX));
        container.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) updateSplit(e.touches[0].clientX);
        });
    });

    // =========================================================================
    // 2. Animated Number Counters (Hero Stats)
    // =========================================================================
    const statNumbers = document.querySelectorAll('.hero-stat-number');

    function animateCounter(el) {
        const target = parseInt(el.dataset.target, 10);
        const duration = 2000; // ms
        const startTime = performance.now();

        function step(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out quad
            const eased = 1 - (1 - progress) * (1 - progress);
            const current = Math.floor(eased * target);
            el.textContent = current.toLocaleString('es-ES');
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);
    }

    if (statNumbers.length > 0) {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    statsObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        statNumbers.forEach(el => statsObserver.observe(el));
    }

    // =========================================================================
    // 3. Infinite Carousel (Clone Cards for Seamless Loop)
    // =========================================================================
    const tracks = document.querySelectorAll('.carousel-track');

    tracks.forEach(track => {
        // Clone all original cards and append them to create the seamless loop
        const cards = Array.from(track.children);
        cards.forEach(card => {
            const clone = card.cloneNode(true);
            track.appendChild(clone);
        });
    });

    // =========================================================================
    // 4. Smooth Scroll for Internal Links
    // =========================================================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});
