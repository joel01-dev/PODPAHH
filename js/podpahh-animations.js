/* ================================================================
   PODPAHH — Animations & Interactivity
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* --- 1. Scroll Progress Bar --- */
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.prepend(progressBar);

  window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = (scrollTop / scrollHeight) * 100;
    progressBar.style.width = progress + '%';
  });

  /* --- 2. Fade-in on scroll (IntersectionObserver) --- */
  const fadeElements = document.querySelectorAll(
    '.pcard, .cat-card, .sec-title, .promo-banner, .hero-banner, ' +
    '.brands-row, .testimonial-card, .section-header, footer .footer-col'
  );
  fadeElements.forEach(el => el.classList.add('fade-in-up'));

  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  fadeElements.forEach(el => fadeObserver.observe(el));

  /* --- 3. Staggered children in grids --- */
  document.querySelectorAll('.products-grid, .brands-row, .categories-grid, .footer-grid').forEach(grid => {
    grid.classList.add('stagger-in');
    const staggerObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          staggerObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05 });
    staggerObs.observe(grid);
  });

  /* --- 4. Floating particles --- */
  const particlesContainer = document.createElement('div');
  particlesContainer.className = 'particles';
  document.body.appendChild(particlesContainer);

  const colors = ['rgba(45,122,255,0.6)', 'rgba(255,45,135,0.6)', 'rgba(139,92,246,0.5)'];

  function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    const size = Math.random() * 4 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const duration = Math.random() * 15 + 10;
    const delay = Math.random() * 5;

    particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      left: ${left}%;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;
    particlesContainer.appendChild(particle);

    setTimeout(() => particle.remove(), (duration + delay) * 1000);
  }

  // Initial batch
  for (let i = 0; i < 15; i++) createParticle();
  // Continuous
  setInterval(createParticle, 2000);

  /* --- 5. Ripple effect on buttons --- */
  document.querySelectorAll('.btn, .pcard-add, .spc-add').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
      const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
      btn.style.setProperty('--x', x + '%');
      btn.style.setProperty('--y', y + '%');
    });
  });

  /* --- 6. Tilt effect on product cards --- */
  document.querySelectorAll('.pcard').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / centerY * -3;
      const rotateY = (x - centerX) / centerX * 3;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  /* --- 7. Typing effect on hero title (if present) --- */
  document.querySelectorAll('.hero-title, .sec-title').forEach(el => {
    const text = el.textContent;
    if (text.length > 0 && text.length < 60) {
      el.textContent = '';
      el.classList.add('typing-cursor');
      let i = 0;
      const type = () => {
        if (i < text.length) {
          el.textContent += text[i];
          i++;
          setTimeout(type, 40 + Math.random() * 30);
        } else {
          setTimeout(() => el.classList.remove('typing-cursor'), 2000);
        }
      };
      const typeObs = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          type();
          typeObs.disconnect();
        }
      });
      typeObs.observe(el);
    }
  });

  /* --- 8. Parallax on banner --- */
  window.addEventListener('scroll', () => {
    document.querySelectorAll('.hero-banner, .promo-banner').forEach(banner => {
      const rect = banner.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        const offset = (rect.top / window.innerHeight) * 20;
        banner.style.transform = `translateY(${offset}px)`;
      }
    });
  });

  /* --- 9. Smooth counter animation for stats --- */
  function animateCounter(el, target, duration = 1500) {
    const start = 0;
    const startTime = performance.now();
    const format = el.textContent.includes('R$');

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      el.textContent = format ? `R$ ${current.toLocaleString('pt-BR')}` : current.toLocaleString('pt-BR');
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const counterObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        animateCounter(el, target);
        counterObs.disconnect();
      }
    });
    counterObs.observe(el);
  });

  /* --- 10. Custom cursor trail --- */
  const trail = document.createElement('div');
  trail.style.cssText = `
    position: fixed;
    width: 20px; height: 20px;
    border: 2px solid rgba(45,122,255,0.4);
    border-radius: 50%;
    pointer-events: none;
    z-index: 99999;
    transition: transform .15s ease-out, width .3s, height .3s, border-color .3s;
    transform: translate(-50%, -50%);
  `;
  document.body.appendChild(trail);

  document.addEventListener('mousemove', (e) => {
    trail.style.left = e.clientX + 'px';
    trail.style.top = e.clientY + 'px';
  });

  document.querySelectorAll('a, button, .pcard').forEach(el => {
    el.addEventListener('mouseenter', () => {
      trail.style.width = '40px';
      trail.style.height = '40px';
      trail.style.borderColor = 'rgba(255,45,135,0.5)';
    });
    el.addEventListener('mouseleave', () => {
      trail.style.width = '20px';
      trail.style.height = '20px';
      trail.style.borderColor = 'rgba(45,122,255,0.4)';
    });
  });

  /* --- 11. Nav shrink on scroll --- */
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 80) {
        header.style.padding = '6px 0';
        header.style.transition = 'padding .3s';
      } else {
        header.style.padding = '';
      }
    });
  }

  /* --- 12. Add to cart animation (handled by podpahh-store.js) --- */

  /* --- 13. Scroll-to-top button --- */
  const scrollBtn = document.createElement('button');
  scrollBtn.innerHTML = '<i class="fa fa-arrow-up"></i>';
  scrollBtn.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9998;
    width: 44px; height: 44px;
    background: var(--pod-gradient); color: #fff;
    border: none; border-radius: 50%;
    font-size: 1rem; cursor: pointer;
    opacity: 0; transform: translateY(20px);
    transition: opacity .3s, transform .3s, box-shadow .3s;
    box-shadow: 0 4px 15px rgba(255,45,135,0.3);
  `;
  document.body.appendChild(scrollBtn);

  scrollBtn.addEventListener('mouseenter', () => {
    scrollBtn.style.boxShadow = '0 4px 25px rgba(255,45,135,0.5)';
    scrollBtn.style.transform = 'translateY(-2px)';
  });
  scrollBtn.addEventListener('mouseleave', () => {
    scrollBtn.style.boxShadow = '0 4px 15px rgba(255,45,135,0.3)';
    scrollBtn.style.transform = '';
  });

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      scrollBtn.style.opacity = '1';
      scrollBtn.style.transform = 'translateY(0)';
    } else {
      scrollBtn.style.opacity = '0';
      scrollBtn.style.transform = 'translateY(20px)';
    }
  });

  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Header transparent → solid on scroll
  const siteHeader = document.querySelector('.site-header');
  const mobileTopbar = document.querySelector('.mobile-topbar');
  const scrollThreshold = 60;

  function handleHeaderScroll() {
    const scrolled = window.scrollY > scrollThreshold;
    if (siteHeader) siteHeader.classList.toggle('scrolled', scrolled);
    if (mobileTopbar) mobileTopbar.classList.toggle('scrolled', scrolled);
  }

  window.addEventListener('scroll', handleHeaderScroll, { passive: true });
  handleHeaderScroll(); // Run on load

  console.log('%c PODPAHH %c Loaded successfully ',
    'background: linear-gradient(135deg, #2d7aff, #ff2d87); color: #fff; font-size: 14px; padding: 4px 8px; border-radius: 4px 0 0 4px; font-weight: bold;',
    'background: #111119; color: #8888a0; font-size: 14px; padding: 4px 8px; border-radius: 0 4px 4px 0;'
  );
});
