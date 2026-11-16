/* ============================================
   B-Events.pro — Script principal
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* --- Navbar scroll effect --- */
  const nav = document.querySelector('nav');
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --- Mobile menu toggle --- */
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.nav-links');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = !menu.classList.contains('open');
      toggle.classList.toggle('active', open);
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    });

    // Close menu on link click
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active');
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Ouvrir le menu');
      });
    });
  }

  /* --- Pré-sélection de l'intérêt dans le formulaire (boutons « Réserver ma place ») --- */
  const interetSelect = document.getElementById('interet');
  document.querySelectorAll('[data-interet]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!interetSelect) return;
      const wanted = btn.getAttribute('data-interet');
      const match = Array.from(interetSelect.options).find(o => o.text === wanted);
      if (match) interetSelect.value = match.value || match.text;
    });
  });

  /* --- Scroll reveal --- */
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    reveals.forEach(el => observer.observe(el));
  }

  /* --- Staggered reveal for grids --- */
  document.querySelectorAll('.formats-grid, .why-grid, .founders-grid, .event-list').forEach(grid => {
    const children = grid.children;
    Array.from(children).forEach((child, i) => {
      child.style.transitionDelay = `${i * 0.08}s`;
    });
  });

  /* --- Contact form ---
     Envoi via FormSubmit (formsubmit.co) : gratuit, sans compte ni clé.
     Le premier envoi déclenche un mail d'activation à FORM_TO : cliquer le lien une fois.
     Pour changer de service plus tard, il suffit de changer FORM_ENDPOINT. */
  const FORM_TO = 'contact@b-events.pro';
  const FORM_ENDPOINT = `https://formsubmit.co/ajax/${FORM_TO}`;

  const form = document.querySelector('.contact-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const entries = Object.fromEntries(new FormData(form).entries());
      const button = form.querySelector('button[type="submit"]');
      const label = button.textContent;
      form.querySelector('.form-error')?.remove();
      button.disabled = true;
      button.textContent = 'Envoi…';

      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            _subject: `[B-Events] Nouvelle demande de ${entries.nom || ''}`,
            _replyto: entries.email,
            _template: 'table',
            _captcha: 'false',
            Nom: entries.nom,
            Entreprise: entries.entreprise,
            Email: entries.email,
            Profil: entries.profil,
            'Intérêt': entries.interet || '',
            Message: entries.message || ''
          })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || String(json.success) !== 'true') throw new Error(json.message || res.status);

        form.innerHTML = `
          <div class="form-success">
            Merci !
            <small>Nous vous recontactons rapidement.</small>
          </div>
        `;
      } catch (err) {
        button.disabled = false;
        button.textContent = label;
        const p = document.createElement('p');
        p.className = 'form-error';
        p.setAttribute('role', 'alert');
        p.innerHTML = `L'envoi n'a pas abouti. Écrivez-nous directement à <a href="mailto:${FORM_TO}">${FORM_TO}</a>.`;
        button.after(p);
      }
    });
  }

  /* --- Load events from admin panel (localStorage) --- */
  const eventList = document.querySelector('.event-list');
  const storedEvents = localStorage.getItem('bevents_events');
  if (eventList && storedEvents) {
    const events = JSON.parse(storedEvents);
    const adminMedia = JSON.parse(localStorage.getItem('bevents_media') || '[]');

    // Events are displayed in the same order as configured in the admin panel

    // Keep only the ghost card, replace real event cards
    const ghostCard = eventList.querySelector('.event-card.ghost');

    // Remove existing non-ghost cards
    eventList.querySelectorAll('.event-card:not(.ghost)').forEach(c => c.remove());

    // Build event cards from admin data
    const statusMap = {
      open: { class: 'status-open', label: 'Inscriptions ouvertes' },
      soon: { class: 'status-soon', label: 'Bientôt' },
      full: { class: 'status-full', label: 'Complet' },
      past: { class: 'status-past', label: 'Passé' }
    };

    events.forEach(ev => {
      const s = statusMap[ev.status] || statusMap.soon;
      const tagsHtml = [
        ev.location ? `<span class="tag"><svg class="tag-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1C5.2 1 3 3.2 3 6c0 4 5 9 5 9s5-5 5-9c0-2.8-2.2-5-5-5zm0 7a2 2 0 110-4 2 2 0 010 4z"/></svg> ${ev.location}</span>` : '',
        ...(ev.tags || []).map(t => `<span class="tag">${t}</span>`)
      ].filter(Boolean).join('');

      // Resolve event image from media library
      const evImg = ev.imageId ? adminMedia.find(m => m.id === ev.imageId) : null;
      const evImgSrc = evImg ? (evImg.url || `images/${evImg.name}.${evImg.ext}`) : '';
      const imgHtml = evImgSrc ? `<div class="event-visual"><img src="${evImgSrc}" alt="${ev.title}" loading="lazy"></div>` : '';

      const card = document.createElement('div');
      card.className = 'event-card reveal';
      card.innerHTML = `
        <div class="event-date-block">
          <span class="month">${ev.month || '—'}</span>
          <span class="day">${ev.day || '—'}</span>
          <span class="year">${ev.year || ''}</span>
        </div>
        ${imgHtml}
        <div class="event-info">
          <div class="event-type">${ev.type || ''}</div>
          <h3>${ev.title}</h3>
          <p>${ev.description}</p>
          <div class="event-tags">${tagsHtml}</div>
        </div>
        <div class="event-status">
          <span class="status-badge ${s.class}">${s.label}</span>
        </div>
        <a href="#contact" class="event-cta">
          <span>Nous contacter</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </a>
      `;

      if (ghostCard) {
        eventList.insertBefore(card, ghostCard);
      } else {
        eventList.appendChild(card);
      }

      // Trigger reveal animation
      requestAnimationFrame(() => card.classList.add('visible'));
    });
  }

  /* --- Images are now hosted on GitHub Pages at /images/name.ext --- */
  /* No media resolver needed: images are real files served by the server */

  /* --- Smooth scroll for anchor links --- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = nav.offsetHeight + 10;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* --- Active nav link on scroll --- */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a:not(.nav-cta)');

  const updateActive = () => {
    const scrollY = window.scrollY + nav.offsetHeight + 60;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      const link = document.querySelector(`.nav-links a[href="#${id}"]:not(.nav-cta)`);
      if (link) {
        link.classList.toggle('active', scrollY >= top && scrollY < top + height);
      }
    });
  };
  window.addEventListener('scroll', updateActive, { passive: true });

});
