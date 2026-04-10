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
      toggle.classList.toggle('active');
      menu.classList.toggle('open');
    });

    // Close menu on link click
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active');
        menu.classList.remove('open');
      });
    });
  }

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

  /* --- Contact form --- */
  const form = document.querySelector('.contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Collect form data
      const data = new FormData(form);
      const entries = Object.fromEntries(data.entries());

      // Save to localStorage for admin panel
      const requests = JSON.parse(localStorage.getItem('bevents_requests') || '[]');
      requests.push({
        id: Date.now().toString(),
        timestamp: Date.now(),
        read: false,
        nom: entries.nom || '',
        entreprise: entries.entreprise || '',
        email: entries.email || '',
        profil: entries.profil || '',
        interet: entries.interet || '',
        message: entries.message || ''
      });
      localStorage.setItem('bevents_requests', JSON.stringify(requests));

      // --- Email helpers ---
      const BREVO_KEY = process.env.SENDINBLUE_API_KEY;
      const senderRaw = localStorage.getItem('bevents_sender');
      const sender = senderRaw ? JSON.parse(senderRaw) : { email: 'contact@b-events.pro', name: 'B-Events' };

      function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
      function vars(str) {
        return str
          .replace(/\{\{nom\}\}/g, entries.nom || '')
          .replace(/\{\{entreprise\}\}/g, entries.entreprise || '')
          .replace(/\{\{email\}\}/g, entries.email || '')
          .replace(/\{\{profil\}\}/g, entries.profil || '')
          .replace(/\{\{interet\}\}/g, entries.interet || '');
      }

      function sendBrevo(to, subject, htmlContent) {
        return fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'accept': 'application/json', 'api-key': BREVO_KEY, 'content-type': 'application/json' },
          body: JSON.stringify({ sender: { name: sender.name, email: sender.email }, to, subject, htmlContent })
        }).catch(() => {});
      }

      // --- Admin notification email ---
      const recipientsRaw = localStorage.getItem('bevents_recipients');
      if (recipientsRaw) {
        const recipients = JSON.parse(recipientsRaw);
        if (recipients.length > 0) {
          const ae = JSON.parse(localStorage.getItem('bevents_email_admin') || 'null') || {
            subject: '[B-Events] Nouvelle demande de {{nom}}',
            title: 'Nouvelle demande B-Events',
            intro: '',
            footer: 'Envoyé depuis le formulaire de contact b-events.pro'
          };
          const introHtml = ae.intro ? `<p style="color:#3a2d24;font-size:.92rem;margin:0 0 1.2rem;">${esc(vars(ae.intro))}</p>` : '';
          const footerHtml = ae.footer ? `<p style="margin-top:1.5rem;color:#b8a99a;font-size:.8rem;">${esc(vars(ae.footer))}</p>` : '';

          const adminHtml = `
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f0ebe4;padding:2rem;border-radius:16px;">
              <h2 style="color:#4a3228;margin:0 0 1rem;font-size:1.3rem;">${esc(vars(ae.title))}</h2>
              ${introHtml}
              <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;">
                <tr><td style="padding:.7rem 1rem;color:#7a6b5e;font-weight:600;border-bottom:1px solid #f0ebe4;width:130px;">Nom</td><td style="padding:.7rem 1rem;color:#3a2d24;border-bottom:1px solid #f0ebe4;">${esc(entries.nom)}</td></tr>
                <tr><td style="padding:.7rem 1rem;color:#7a6b5e;font-weight:600;border-bottom:1px solid #f0ebe4;">Entreprise</td><td style="padding:.7rem 1rem;color:#3a2d24;border-bottom:1px solid #f0ebe4;">${esc(entries.entreprise)}</td></tr>
                <tr><td style="padding:.7rem 1rem;color:#7a6b5e;font-weight:600;border-bottom:1px solid #f0ebe4;">Email</td><td style="padding:.7rem 1rem;border-bottom:1px solid #f0ebe4;"><a href="mailto:${entries.email}" style="color:#8b5e3c;">${esc(entries.email)}</a></td></tr>
                <tr><td style="padding:.7rem 1rem;color:#7a6b5e;font-weight:600;border-bottom:1px solid #f0ebe4;">Profil</td><td style="padding:.7rem 1rem;color:#3a2d24;border-bottom:1px solid #f0ebe4;">${esc(entries.profil)}</td></tr>
                <tr><td style="padding:.7rem 1rem;color:#7a6b5e;font-weight:600;border-bottom:1px solid #f0ebe4;">Intérêt</td><td style="padding:.7rem 1rem;color:#3a2d24;border-bottom:1px solid #f0ebe4;">${esc(entries.interet)}</td></tr>
                <tr><td style="padding:.7rem 1rem;color:#7a6b5e;font-weight:600;">Message</td><td style="padding:.7rem 1rem;color:#3a2d24;">${esc(entries.message)}</td></tr>
              </table>
              ${footerHtml}
            </div>
          `;
          sendBrevo(recipients.map(email => ({ email })), vars(ae.subject), adminHtml);
        }
      }

      // --- Client confirmation email ---
      const ce = JSON.parse(localStorage.getItem('bevents_email_client') || 'null') || {
        enabled: true,
        subject: 'Merci pour votre demande — B-Events',
        title: 'Merci {{nom}} !',
        body: "Nous avons bien reçu votre demande et reviendrons vers vous dans les plus brefs délais.\n\nN'hésitez pas à nous contacter à contact@b-events.pro si vous avez des questions.",
        footer: "L'équipe B-Events — www.b-events.pro"
      };

      if (ce.enabled && entries.email) {
        const bodyLines = vars(ce.body).split('\n').map(l => `<p style="color:#3a2d24;font-size:.92rem;margin:0 0 .6rem;line-height:1.6;">${esc(l) || '&nbsp;'}</p>`).join('');
        const footerHtml = ce.footer ? `<p style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #d4c8bc;color:#b8a99a;font-size:.8rem;">${esc(vars(ce.footer))}</p>` : '';

        const clientHtml = `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f0ebe4;padding:2rem;border-radius:16px;">
            <h2 style="color:#4a3228;margin:0 0 1.2rem;font-size:1.3rem;">${esc(vars(ce.title))}</h2>
            ${bodyLines}
            ${footerHtml}
          </div>
        `;
        sendBrevo([{ email: entries.email }], vars(ce.subject), clientHtml);
      }

      // Show success message
      form.innerHTML = `
        <div class="form-success">
          Merci !
          <small>Nous vous recontactons rapidement.</small>
        </div>
      `;
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
      const imgHtml = evImg ? `<div class="event-visual"><img src="${evImg.dataUrl}" alt="${ev.title}" loading="lazy"></div>` : '';

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

  /* --- Media resolver: inject uploaded images from admin localStorage --- */
  const mediaRaw = localStorage.getItem('bevents_media');
  if (mediaRaw) {
    const media = JSON.parse(mediaRaw);
    // Build a lookup: "images/name.ext" → dataUrl
    const mediaMap = {};
    media.forEach(m => {
      mediaMap[`images/${m.name}.${m.ext}`] = m.dataUrl;
    });

    // Replace all matching <img> src immediately
    document.querySelectorAll('img[src^="images/"]').forEach(img => {
      const dataUrl = mediaMap[img.getAttribute('src')];
      if (dataUrl) img.src = dataUrl;
    });

    // Also handle images that fail to load (fallback)
    document.querySelectorAll('img').forEach(img => {
      img.addEventListener('error', () => {
        const src = img.getAttribute('src');
        const dataUrl = mediaMap[src];
        if (dataUrl && img.src !== dataUrl) img.src = dataUrl;
      }, { once: true });
    });
  }

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
      const link = document.querySelector(`.nav-links a[href="#${id}"]`);
      if (link) {
        link.style.color = (scrollY >= top && scrollY < top + height)
          ? 'var(--brown-dark)'
          : '';
      }
    });
  };
  window.addEventListener('scroll', updateActive, { passive: true });

});
