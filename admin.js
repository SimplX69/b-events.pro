/* ============================================
   B-Events.pro — Admin Panel Script
   ============================================ */

(() => {
  // --- Configuration ---
  const ADMIN_CODE = 'bevents2026';
  const BREVO_API_KEY = '';
  const STORAGE_KEYS = {
    events: 'bevents_events',
    requests: 'bevents_requests',
    auth: 'bevents_admin_auth',
    recipients: 'bevents_recipients',
    sender: 'bevents_sender',
    media: 'bevents_media',
    emailAdmin: 'bevents_email_admin',
    emailClient: 'bevents_email_client',
    githubToken: 'bevents_github_token'
  };
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 Mo

  // --- GitHub Config ---
  const GITHUB_OWNER = 'AceOSolo';
  const GITHUB_REPO = 'B-events';
  const GITHUB_BRANCH = 'master';
  const GITHUB_IMAGES_PATH = 'b-events.pro/images';
  const SITE_BASE_URL = 'https://www.b-events.pro';

  function getGithubToken() {
    return localStorage.getItem(STORAGE_KEYS.githubToken) || '';
  }

  async function githubUploadFile(fileName, base64Content) {
    const token = getGithubToken();
    if (!token) throw new Error('Token GitHub non configuré. Allez dans Paramètres.');

    const path = `${GITHUB_IMAGES_PATH}/${fileName}`;

    // Check if file already exists (to get its sha for update)
    let sha;
    try {
      const existing = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`, {
        headers: { 'Authorization': `token ${token}` }
      });
      if (existing.ok) {
        const data = await existing.json();
        sha = data.sha;
      }
    } catch (e) { /* file doesn't exist, that's fine */ }

    const body = {
      message: `[B-Events Admin] Upload image ${fileName}`,
      content: base64Content,
      branch: GITHUB_BRANCH
    };
    if (sha) body.sha = sha;

    const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Erreur GitHub ${res.status}`);
    }

    return await res.json();
  }

  async function githubDeleteFile(fileName) {
    const token = getGithubToken();
    if (!token) throw new Error('Token GitHub non configuré.');

    const path = `${GITHUB_IMAGES_PATH}/${fileName}`;

    // Get file sha
    const existing = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`, {
      headers: { 'Authorization': `token ${token}` }
    });
    if (!existing.ok) return; // file doesn't exist on GitHub

    const data = await existing.json();

    const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `[B-Events Admin] Delete image ${fileName}`,
        sha: data.sha,
        branch: GITHUB_BRANCH
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Erreur GitHub ${res.status}`);
    }
  }

  // --- Default events (pre-loaded) ---
  const DEFAULT_EVENTS = [
    {
      id: '1',
      title: 'Soirée Business — Tournoi de Padel Inter-Entreprises',
      type: '🏓 Expérience sportive',
      description: "L'événement inaugural B-Events ! Tournoi de padel en équipes mixtes, suivi d'un moment convivial et networking.",
      day: '—',
      month: '2026',
      year: 'à confirmer',
      location: 'All In Padel — Décines (69)',
      tags: ['Soirée', 'Networking'],
      status: 'soon'
    },
    {
      id: '2',
      title: 'Tournoi de Bowling Inter-Entreprises',
      type: '🎳 Expérience sportive',
      description: 'Strikes et business au programme ! Un tournoi convivial pour élargir votre réseau dans le Nord-Isère.',
      day: '09',
      month: 'Juil.',
      year: '2026',
      location: 'Bourgoin-Jallieu (38)',
      tags: ['Tournoi', 'Nord-Isère'],
      status: 'open'
    }
  ];

  // --- DOM refs ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const loginScreen = $('#login-screen');
  const adminPanel = $('#admin-panel');
  const loginForm = $('#login-form');
  const accessCodeInput = $('#access-code');
  const loginError = $('#login-error');

  const eventModal = $('#event-modal');
  const eventForm = $('#event-form');
  const modalTitle = $('#modal-title');

  const requestModal = $('#request-modal');
  const requestDetail = $('#request-detail');

  // --- Storage helpers ---
  function getEvents() {
    const stored = localStorage.getItem(STORAGE_KEYS.events);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(DEFAULT_EVENTS));
      return DEFAULT_EVENTS;
    }
    return JSON.parse(stored);
  }

  function saveEvents(events) {
    localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events));
  }

  function getRequests() {
    const stored = localStorage.getItem(STORAGE_KEYS.requests);
    return stored ? JSON.parse(stored) : [];
  }

  function saveRequests(requests) {
    localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(requests));
  }

  // --- Auth ---
  function isAuthenticated() {
    return sessionStorage.getItem(STORAGE_KEYS.auth) === 'true';
  }

  function login(code) {
    if (code === ADMIN_CODE) {
      sessionStorage.setItem(STORAGE_KEYS.auth, 'true');
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEYS.auth);
    location.reload();
  }

  // --- Init ---
  function init() {
    if (isAuthenticated()) {
      showAdmin();
    } else {
      showLogin();
    }
  }

  function showLogin() {
    loginScreen.hidden = false;
    adminPanel.hidden = true;
    loginForm.addEventListener('submit', handleLogin);
  }

  function showAdmin() {
    loginScreen.hidden = true;
    adminPanel.hidden = false;
    setupTabs();
    setupEventHandlers();
    setupSortButtons();
    setupSettings();
    setupEmails();
    setupMedia();
    renderEvents();
    renderRequests();
  }

  function handleLogin(e) {
    e.preventDefault();
    const code = accessCodeInput.value.trim();
    if (login(code)) {
      showAdmin();
    } else {
      loginError.hidden = false;
      accessCodeInput.value = '';
      accessCodeInput.focus();
    }
  }

  // --- Tabs ---
  function setupTabs() {
    $$('.nav-item[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.nav-item[data-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $$('.tab-content').forEach(t => t.classList.remove('active'));
        $(`#tab-${btn.dataset.tab}`).classList.add('active');
      });
    });
  }

  // --- Events ---
  function setupEventHandlers() {
    $('#add-event-btn').addEventListener('click', () => openEventModal());
    $('#modal-close').addEventListener('click', closeEventModal);
    $('#modal-cancel').addEventListener('click', closeEventModal);
    eventModal.addEventListener('click', (e) => {
      if (e.target === eventModal) closeEventModal();
    });
    eventForm.addEventListener('submit', handleEventSubmit);

    $('#logout-btn').addEventListener('click', logout);
    $('#mark-all-read').addEventListener('click', markAllRead);
    $('#clear-requests').addEventListener('click', clearAllRequests);
    $('#request-modal-close').addEventListener('click', closeRequestModal);
    $('#request-done').addEventListener('click', closeRequestModal);
    requestModal.addEventListener('click', (e) => {
      if (e.target === requestModal) closeRequestModal();
    });
  }

  const monthIndex = { 'Jan.':0,'Fév.':1,'Mars':2,'Avr.':3,'Mai':4,'Juin':5,'Juil.':6,'Août':7,'Sep.':8,'Oct.':9,'Nov.':10,'Déc.':11 };
  const statusOrder = { open: 0, soon: 1, full: 2, past: 3 };

  function eventToDate(ev) {
    const mi = monthIndex[ev.month];
    if (ev.year && mi !== undefined && ev.day && ev.day !== '—') {
      return new Date(parseInt(ev.year), mi, parseInt(ev.day) || 1);
    }
    return null;
  }

  function sortEvents(events, mode) {
    const sorted = [...events];
    if (mode === 'date') {
      sorted.sort((a, b) => {
        const da = eventToDate(a), db = eventToDate(b);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da - db;
      });
    } else if (mode === 'status') {
      sorted.sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));
    } else if (mode === 'alpha') {
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
    }
    return sorted;
  }

  function setupSortButtons() {
    $$('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.sort;
        const isActive = btn.classList.contains('active');

        // Toggle off
        $$('.sort-btn').forEach(b => b.classList.remove('active'));
        if (isActive) {
          // Reset to stored order
          renderEvents();
          return;
        }

        btn.classList.add('active');
        const events = getEvents();
        const sorted = sortEvents(events, mode);
        saveEvents(sorted);
        renderEvents();
        // Keep button active after re-render
        $$(`.sort-btn[data-sort="${mode}"]`).forEach(b => b.classList.add('active'));
      });
    });
  }

  function moveEvent(id, direction) {
    const events = getEvents();
    const idx = events.findIndex(e => e.id === id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= events.length) return;
    [events[idx], events[newIdx]] = [events[newIdx], events[idx]];
    saveEvents(events);
    $$('.sort-btn').forEach(b => b.classList.remove('active'));
    renderEvents();
  }

  function renderEvents() {
    const events = getEvents();
    const list = $('#events-list');

    if (events.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📅</span>
          <p>Aucun événement. Cliquez sur "+ Nouvel événement" pour commencer.</p>
        </div>
      `;
      return;
    }

    const allMedia = getMedia();
    list.innerHTML = events.map((ev, i) => {
      const img = ev.imageId ? allMedia.find(m => m.id === ev.imageId) : null;
      const imgHtml = img ? `<img class="admin-event-thumb" src="${getMediaUrl(img)}" alt="">` : '';
      const isFirst = i === 0;
      const isLast = i === events.length - 1;
      return `
      <div class="admin-event-card" data-id="${ev.id}">
        <div class="move-btns">
          <button class="move-btn move-up" data-id="${ev.id}" ${isFirst ? 'disabled' : ''} title="Monter">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
          </button>
          <button class="move-btn move-down" data-id="${ev.id}" ${isLast ? 'disabled' : ''} title="Descendre">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
        <div class="admin-event-date">
          <span class="month">${escapeHtml(ev.month)}</span>
          <span class="day">${escapeHtml(ev.day)}</span>
          <span class="year">${escapeHtml(ev.year)}</span>
        </div>
        ${imgHtml}
        <div class="admin-event-info">
          <div class="type">${escapeHtml(ev.type)}</div>
          <h3>${escapeHtml(ev.title)}</h3>
          <p>${escapeHtml(ev.description)}</p>
        </div>
        <span class="admin-event-badge badge-${ev.status}">${statusLabel(ev.status)}</span>
        <div class="admin-event-actions">
          <button class="btn btn-ghost btn-sm edit-event" data-id="${ev.id}">Modifier</button>
          <button class="btn btn-danger btn-sm delete-event" data-id="${ev.id}">Supprimer</button>
        </div>
      </div>
      `;
    }).join('');

    // Bind edit/delete
    list.querySelectorAll('.edit-event').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ev = getEvents().find(x => x.id === btn.dataset.id);
        if (ev) openEventModal(ev);
      });
    });
    list.querySelectorAll('.delete-event').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Supprimer cet événement ?')) {
          deleteEvent(btn.dataset.id);
        }
      });
    });
    list.querySelectorAll('.move-up').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveEvent(btn.dataset.id, -1);
      });
    });
    list.querySelectorAll('.move-down').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveEvent(btn.dataset.id, 1);
      });
    });
  }

  function populateImageSelect(selectedId) {
    const select = $('#event-image');
    const media = getMedia();
    select.innerHTML = '<option value="">Aucune image</option>' +
      media.map(m => `<option value="${m.id}" ${m.id === selectedId ? 'selected' : ''}>${escapeHtml(m.name)}.${m.ext}</option>`).join('');

    // Preview
    const preview = $('#event-image-preview');
    const previewImg = $('#event-image-preview-img');
    const current = media.find(m => m.id === select.value);
    if (current) {
      previewImg.src = getMediaUrl(current);
      preview.hidden = false;
    } else {
      preview.hidden = true;
    }

    select.onchange = () => {
      const m = media.find(x => x.id === select.value);
      if (m) {
        previewImg.src = getMediaUrl(m);
        preview.hidden = false;
      } else {
        preview.hidden = true;
      }
    };
  }

  function openEventModal(event = null) {
    eventModal.hidden = false;
    if (event) {
      modalTitle.textContent = 'Modifier l\'événement';
      $('#event-id').value = event.id;
      $('#event-title').value = event.title;
      $('#event-type').value = event.type;
      $('#event-status').value = event.status;
      $('#event-day').value = event.day;
      $('#event-month').value = event.month;
      $('#event-year').value = event.year;
      $('#event-description').value = event.description;
      $('#event-location').value = event.location || '';
      $('#event-tags').value = (event.tags || []).join(', ');
      populateImageSelect(event.imageId || '');
    } else {
      modalTitle.textContent = 'Nouvel événement';
      eventForm.reset();
      $('#event-id').value = '';
      $('#event-year').value = '2026';
      populateImageSelect('');
    }
  }

  function closeEventModal() {
    eventModal.hidden = true;
    eventForm.reset();
  }

  function handleEventSubmit(e) {
    e.preventDefault();
    const events = getEvents();
    const id = $('#event-id').value;
    const tagsRaw = $('#event-tags').value;

    const eventData = {
      id: id || Date.now().toString(),
      title: $('#event-title').value.trim(),
      type: $('#event-type').value,
      status: $('#event-status').value,
      day: $('#event-day').value.trim() || '—',
      month: $('#event-month').value.trim() || '—',
      year: $('#event-year').value.trim() || '2026',
      description: $('#event-description').value.trim(),
      location: $('#event-location').value.trim(),
      tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
      imageId: $('#event-image').value || ''
    };

    if (id) {
      const idx = events.findIndex(x => x.id === id);
      if (idx !== -1) events[idx] = eventData;
    } else {
      events.push(eventData);
    }

    saveEvents(events);
    closeEventModal();
    renderEvents();
  }

  function deleteEvent(id) {
    const events = getEvents().filter(x => x.id !== id);
    saveEvents(events);
    renderEvents();
  }

  // --- Requests ---
  function renderRequests() {
    const requests = getRequests();
    const list = $('#requests-list');
    const noRequests = $('#no-requests');
    const badge = $('#requests-badge');

    const unreadCount = requests.filter(r => !r.read).length;
    if (unreadCount > 0) {
      badge.hidden = false;
      badge.textContent = unreadCount;
    } else {
      badge.hidden = true;
    }

    if (requests.length === 0) {
      list.innerHTML = '';
      noRequests.hidden = false;
      return;
    }

    noRequests.hidden = true;
    // Sort newest first
    const sorted = [...requests].sort((a, b) => b.timestamp - a.timestamp);

    list.innerHTML = sorted.map(req => {
      const initials = (req.nom || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const date = new Date(req.timestamp);
      const timeStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      return `
        <div class="request-card ${req.read ? '' : 'unread'}" data-id="${req.id}">
          <div class="request-avatar">${initials}</div>
          <div class="request-info">
            <h4>${escapeHtml(req.nom)} — ${escapeHtml(req.entreprise || '')}</h4>
            <div class="request-meta">
              <span>${escapeHtml(req.email)}</span>
              <span>${escapeHtml(req.profil || '')}</span>
            </div>
            ${req.message ? `<div class="request-preview">${escapeHtml(req.message)}</div>` : ''}
          </div>
          <span class="request-time">${timeStr}</span>
        </div>
      `;
    }).join('');

    // Bind click to show detail
    list.querySelectorAll('.request-card').forEach(card => {
      card.addEventListener('click', () => {
        const req = requests.find(r => r.id === card.dataset.id);
        if (req) openRequestDetail(req);
      });
    });
  }

  function openRequestDetail(req) {
    // Mark as read
    const requests = getRequests();
    const found = requests.find(r => r.id === req.id);
    if (found) {
      found.read = true;
      saveRequests(requests);
      renderRequests();
    }

    const date = new Date(req.timestamp);
    const timeStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    requestDetail.innerHTML = `
      <div class="detail-row"><span class="detail-label">Nom</span><span class="detail-value">${escapeHtml(req.nom)}</span></div>
      <div class="detail-row"><span class="detail-label">Entreprise</span><span class="detail-value">${escapeHtml(req.entreprise || '—')}</span></div>
      <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${escapeHtml(req.email)}</span></div>
      <div class="detail-row"><span class="detail-label">Profil</span><span class="detail-value">${escapeHtml(req.profil || '—')}</span></div>
      <div class="detail-row"><span class="detail-label">Intérêt</span><span class="detail-value">${escapeHtml(req.interet || '—')}</span></div>
      <div class="detail-row"><span class="detail-label">Message</span><span class="detail-value">${escapeHtml(req.message || '—')}</span></div>
      <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${timeStr}</span></div>
    `;

    // Delete button
    $('#request-delete').onclick = () => {
      deleteRequest(req.id);
      closeRequestModal();
    };

    requestModal.hidden = false;
  }

  function closeRequestModal() {
    requestModal.hidden = true;
  }

  function deleteRequest(id) {
    const requests = getRequests().filter(r => r.id !== id);
    saveRequests(requests);
    renderRequests();
  }

  function markAllRead() {
    const requests = getRequests();
    requests.forEach(r => r.read = true);
    saveRequests(requests);
    renderRequests();
  }

  function clearAllRequests() {
    if (confirm('Supprimer toutes les demandes ?')) {
      saveRequests([]);
      renderRequests();
    }
  }

  // --- Settings ---
  function getRecipients() {
    const stored = localStorage.getItem(STORAGE_KEYS.recipients);
    return stored ? JSON.parse(stored) : [];
  }

  function saveRecipients(list) {
    localStorage.setItem(STORAGE_KEYS.recipients, JSON.stringify(list));
  }

  function getSender() {
    const stored = localStorage.getItem(STORAGE_KEYS.sender);
    return stored ? JSON.parse(stored) : { email: 'contact@b-events.pro', name: 'B-Events' };
  }

  function setupSettings() {
    // Load GitHub token
    const savedToken = getGithubToken();
    if (savedToken) $('#github-token').value = savedToken;

    // Save GitHub token
    $('#save-github-token').addEventListener('click', async () => {
      const token = $('#github-token').value.trim();
      if (!token) return showStatus('github-token-status', 'Token requis.', 'error');

      // Test the token
      try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`, {
          headers: { 'Authorization': `token ${token}` }
        });
        if (!res.ok) throw new Error('Token invalide ou pas accès au repo');

        localStorage.setItem(STORAGE_KEYS.githubToken, token);
        showStatus('github-token-status', 'Token valide et enregistré !', 'success');
      } catch (err) {
        showStatus('github-token-status', `Erreur: ${err.message}`, 'error');
      }
    });

    // Load existing values
    const sender = getSender();
    $('#sender-email').value = sender.email;
    $('#sender-name').value = sender.name;

    // Save sender
    $('#save-sender').addEventListener('click', () => {
      const email = $('#sender-email').value.trim();
      const name = $('#sender-name').value.trim();
      if (!email) return showStatus('test-email-status', 'Email expéditeur requis.', 'error');
      localStorage.setItem(STORAGE_KEYS.sender, JSON.stringify({ email, name: name || 'B-Events' }));
      showStatus('test-email-status', 'Expéditeur enregistré.', 'success');
    });

    // Add recipient
    $('#add-recipient').addEventListener('click', () => {
      const input = $('#new-recipient');
      const email = input.value.trim();
      if (!email || !email.includes('@')) return;
      const list = getRecipients();
      if (list.includes(email)) return;
      list.push(email);
      saveRecipients(list);
      input.value = '';
      renderRecipients();
    });

    // Allow Enter key on recipient input
    $('#new-recipient').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('#add-recipient').click();
      }
    });

    // Test email
    $('#send-test-email').addEventListener('click', sendTestEmail);

    renderRecipients();
  }

  function renderRecipients() {
    const list = getRecipients();
    const container = $('#recipients-list');
    const hint = $('#no-recipients');

    if (list.length === 0) {
      container.innerHTML = '';
      hint.hidden = false;
      return;
    }

    hint.hidden = true;
    container.innerHTML = list.map(email => `
      <div class="recipient-row">
        <span>${escapeHtml(email)}</span>
        <button data-email="${escapeHtml(email)}" title="Supprimer">&times;</button>
      </div>
    `).join('');

    container.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const updated = getRecipients().filter(e => e !== btn.dataset.email);
        saveRecipients(updated);
        renderRecipients();
      });
    });
  }

  function showStatus(id, message, type) {
    const el = $(`#${id}`);
    el.hidden = false;
    el.textContent = message;
    el.className = `settings-status ${type}`;
    setTimeout(() => { el.hidden = true; }, 4000);
  }

  async function sendTestEmail() {
    const recipients = getRecipients();
    const sender = getSender();
    const statusEl = 'test-email-status';
    if (recipients.length === 0) return showStatus(statusEl, 'Aucun destinataire configuré.', 'error');

    showStatus(statusEl, 'Envoi en cours...', 'success');

    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: sender.name, email: sender.email },
          to: recipients.map(email => ({ email })),
          subject: '[B-Events] Email de test',
          htmlContent: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:2rem;">
              <h2 style="color:#4a3228;">B-Events — Test email</h2>
              <p style="color:#7a6b5e;">La configuration email fonctionne correctement.</p>
              <p style="color:#7a6b5e;font-size:0.85rem;">Les notifications de nouvelles demandes seront envoyées à cette adresse.</p>
            </div>
          `
        })
      });

      if (res.ok) {
        showStatus(statusEl, 'Email de test envoyé avec succès !', 'success');
      } else {
        const data = await res.json();
        showStatus(statusEl, `Erreur Brevo : ${data.message || res.status}`, 'error');
      }
    } catch (err) {
      showStatus(statusEl, `Erreur réseau : ${err.message}`, 'error');
    }
  }

  // --- Email Templates ---
  const DEFAULT_ADMIN_EMAIL = {
    subject: '[B-Events] Nouvelle demande de {{nom}}',
    title: 'Nouvelle demande B-Events',
    intro: '',
    footer: 'Envoyé depuis le formulaire de contact b-events.pro'
  };

  const DEFAULT_CLIENT_EMAIL = {
    enabled: true,
    subject: 'Merci pour votre demande — B-Events',
    title: 'Merci {{nom}} !',
    body: 'Nous avons bien reçu votre demande et reviendrons vers vous dans les plus brefs délais.\n\nN\'hésitez pas à nous contacter à contact@b-events.pro si vous avez des questions.',
    footer: "L'équipe B-Events — www.b-events.pro"
  };

  function getAdminEmail() {
    const stored = localStorage.getItem(STORAGE_KEYS.emailAdmin);
    return stored ? JSON.parse(stored) : { ...DEFAULT_ADMIN_EMAIL };
  }

  function getClientEmail() {
    const stored = localStorage.getItem(STORAGE_KEYS.emailClient);
    return stored ? JSON.parse(stored) : { ...DEFAULT_CLIENT_EMAIL };
  }

  function setupEmails() {
    // Sub-tabs
    $$('.email-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.email-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $$('.email-panel').forEach(p => p.classList.remove('active'));
        $(`#email-panel-${btn.dataset.emailTab}`).classList.add('active');
      });
    });

    // Load admin email values
    const ae = getAdminEmail();
    $('#admin-email-subject').value = ae.subject;
    $('#admin-email-title').value = ae.title;
    $('#admin-email-intro').value = ae.intro;
    $('#admin-email-footer').value = ae.footer;

    // Load client email values
    const ce = getClientEmail();
    $('#client-email-enabled').checked = ce.enabled;
    $('#client-email-subject').value = ce.subject;
    $('#client-email-title').value = ce.title;
    $('#client-email-body').value = ce.body;
    $('#client-email-footer').value = ce.footer;

    // Save admin email
    $('#save-admin-email').addEventListener('click', () => {
      const data = {
        subject: $('#admin-email-subject').value.trim() || DEFAULT_ADMIN_EMAIL.subject,
        title: $('#admin-email-title').value.trim() || DEFAULT_ADMIN_EMAIL.title,
        intro: $('#admin-email-intro').value.trim(),
        footer: $('#admin-email-footer').value.trim()
      };
      localStorage.setItem(STORAGE_KEYS.emailAdmin, JSON.stringify(data));
      showStatus('admin-email-status', 'Template admin enregistré.', 'success');
    });

    // Save client email
    $('#save-client-email').addEventListener('click', () => {
      const data = {
        enabled: $('#client-email-enabled').checked,
        subject: $('#client-email-subject').value.trim() || DEFAULT_CLIENT_EMAIL.subject,
        title: $('#client-email-title').value.trim() || DEFAULT_CLIENT_EMAIL.title,
        body: $('#client-email-body').value.trim() || DEFAULT_CLIENT_EMAIL.body,
        footer: $('#client-email-footer').value.trim()
      };
      localStorage.setItem(STORAGE_KEYS.emailClient, JSON.stringify(data));
      showStatus('client-email-status', 'Template client enregistré.', 'success');
    });

    // Reset
    $('#reset-admin-email').addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEYS.emailAdmin);
      const ae = DEFAULT_ADMIN_EMAIL;
      $('#admin-email-subject').value = ae.subject;
      $('#admin-email-title').value = ae.title;
      $('#admin-email-intro').value = ae.intro;
      $('#admin-email-footer').value = ae.footer;
      showStatus('admin-email-status', 'Template réinitialisé.', 'success');
    });

    $('#reset-client-email').addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEYS.emailClient);
      const ce = DEFAULT_CLIENT_EMAIL;
      $('#client-email-enabled').checked = ce.enabled;
      $('#client-email-subject').value = ce.subject;
      $('#client-email-title').value = ce.title;
      $('#client-email-body').value = ce.body;
      $('#client-email-footer').value = ce.footer;
      showStatus('client-email-status', 'Template réinitialisé.', 'success');
    });

    // Preview
    $('#preview-admin-email').addEventListener('click', () => {
      const tpl = {
        subject: $('#admin-email-subject').value || DEFAULT_ADMIN_EMAIL.subject,
        title: $('#admin-email-title').value || DEFAULT_ADMIN_EMAIL.title,
        intro: $('#admin-email-intro').value,
        footer: $('#admin-email-footer').value
      };
      const sample = { nom: 'Jean Dupont', entreprise: 'Acme SAS', email: 'jean@acme.fr', profil: 'Dirigeant / Gérant', interet: 'Tournoi de Bowling', message: 'Je souhaite inscrire une équipe de 4 personnes.' };
      const html = buildAdminEmailHtml(tpl, sample);
      const subject = replaceVars(tpl.subject, sample);
      showEmailPreview(subject, html);
    });

    $('#preview-client-email').addEventListener('click', () => {
      const tpl = {
        subject: $('#client-email-subject').value || DEFAULT_CLIENT_EMAIL.subject,
        title: $('#client-email-title').value || DEFAULT_CLIENT_EMAIL.title,
        body: $('#client-email-body').value || DEFAULT_CLIENT_EMAIL.body,
        footer: $('#client-email-footer').value
      };
      const sample = { nom: 'Jean Dupont', entreprise: 'Acme SAS', email: 'jean@acme.fr', profil: 'Dirigeant / Gérant', interet: 'Tournoi de Bowling' };
      const html = buildClientEmailHtml(tpl, sample);
      const subject = replaceVars(tpl.subject, sample);
      showEmailPreview(subject, html);
    });

    // Preview modal close
    $('#email-preview-close').addEventListener('click', () => { $('#email-preview-modal').hidden = true; });
    $('#email-preview-done').addEventListener('click', () => { $('#email-preview-modal').hidden = true; });
    $('#email-preview-modal').addEventListener('click', (e) => {
      if (e.target === $('#email-preview-modal')) $('#email-preview-modal').hidden = true;
    });
  }

  function replaceVars(str, data) {
    return str
      .replace(/\{\{nom\}\}/g, data.nom || '')
      .replace(/\{\{entreprise\}\}/g, data.entreprise || '')
      .replace(/\{\{email\}\}/g, data.email || '')
      .replace(/\{\{profil\}\}/g, data.profil || '')
      .replace(/\{\{interet\}\}/g, data.interet || '');
  }

  function buildAdminEmailHtml(tpl, data) {
    const introHtml = tpl.intro ? `<p style="color:#3a2d24;font-size:.92rem;margin:0 0 1.2rem;">${escapeHtml(replaceVars(tpl.intro, data))}</p>` : '';
    const footerHtml = tpl.footer ? `<p style="margin-top:1.5rem;color:#b8a99a;font-size:.8rem;">${escapeHtml(replaceVars(tpl.footer, data))}</p>` : '';

    return `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f0ebe4;padding:2rem;border-radius:16px;">
        <h2 style="color:#4a3228;margin:0 0 1rem;font-size:1.3rem;">${escapeHtml(replaceVars(tpl.title, data))}</h2>
        ${introHtml}
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:.7rem 1rem;color:#7a6b5e;font-weight:600;border-bottom:1px solid #f0ebe4;width:130px;">Nom</td><td style="padding:.7rem 1rem;color:#3a2d24;border-bottom:1px solid #f0ebe4;">${escapeHtml(data.nom || '—')}</td></tr>
          <tr><td style="padding:.7rem 1rem;color:#7a6b5e;font-weight:600;border-bottom:1px solid #f0ebe4;">Entreprise</td><td style="padding:.7rem 1rem;color:#3a2d24;border-bottom:1px solid #f0ebe4;">${escapeHtml(data.entreprise || '—')}</td></tr>
          <tr><td style="padding:.7rem 1rem;color:#7a6b5e;font-weight:600;border-bottom:1px solid #f0ebe4;">Email</td><td style="padding:.7rem 1rem;border-bottom:1px solid #f0ebe4;"><a href="mailto:${data.email}" style="color:#8b5e3c;">${escapeHtml(data.email || '—')}</a></td></tr>
          <tr><td style="padding:.7rem 1rem;color:#7a6b5e;font-weight:600;border-bottom:1px solid #f0ebe4;">Profil</td><td style="padding:.7rem 1rem;color:#3a2d24;border-bottom:1px solid #f0ebe4;">${escapeHtml(data.profil || '—')}</td></tr>
          <tr><td style="padding:.7rem 1rem;color:#7a6b5e;font-weight:600;border-bottom:1px solid #f0ebe4;">Intérêt</td><td style="padding:.7rem 1rem;color:#3a2d24;border-bottom:1px solid #f0ebe4;">${escapeHtml(data.interet || '—')}</td></tr>
          <tr><td style="padding:.7rem 1rem;color:#7a6b5e;font-weight:600;">Message</td><td style="padding:.7rem 1rem;color:#3a2d24;">${escapeHtml(data.message || '—')}</td></tr>
        </table>
        ${footerHtml}
      </div>
    `;
  }

  function buildClientEmailHtml(tpl, data) {
    const bodyLines = replaceVars(tpl.body, data).split('\n').map(l => `<p style="color:#3a2d24;font-size:.92rem;margin:0 0 .6rem;line-height:1.6;">${escapeHtml(l) || '&nbsp;'}</p>`).join('');
    const footerHtml = tpl.footer ? `<p style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #d4c8bc;color:#b8a99a;font-size:.8rem;">${escapeHtml(replaceVars(tpl.footer, data))}</p>` : '';

    return `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f0ebe4;padding:2rem;border-radius:16px;">
        <h2 style="color:#4a3228;margin:0 0 1.2rem;font-size:1.3rem;">${escapeHtml(replaceVars(tpl.title, data))}</h2>
        ${bodyLines}
        ${footerHtml}
      </div>
    `;
  }

  function showEmailPreview(subject, html) {
    $('#email-preview-subject').textContent = 'Objet : ' + subject;
    const frame = $('#email-preview-frame');
    frame.innerHTML = `<iframe sandbox srcdoc="${html.replace(/"/g, '&quot;')}"></iframe>`;
    $('#email-preview-modal').hidden = false;
  }

  // --- Media Library ---
  function getMedia() {
    const stored = localStorage.getItem(STORAGE_KEYS.media);
    return stored ? JSON.parse(stored) : [];
  }

  function saveMedia(media) {
    try {
      localStorage.setItem(STORAGE_KEYS.media, JSON.stringify(media));
    } catch (e) {
      showToast('Stockage plein. Supprimez des images.', 'error');
    }
  }

  function setupMedia() {
    const zone = $('#upload-zone');
    const fileInput = $('#file-input');

    // Click on zone triggers file input
    zone.addEventListener('click', (e) => {
      if (e.target.tagName !== 'LABEL') fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', () => {
      handleFiles(fileInput.files);
      fileInput.value = '';
    });

    // Drag & drop
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });

    // Modal handlers
    $('#media-modal-close').addEventListener('click', closeMediaModal);
    $('#media-done-btn').addEventListener('click', closeMediaModal);
    $('#media-modal').addEventListener('click', (e) => {
      if (e.target === $('#media-modal')) closeMediaModal();
    });

    renderMedia();
  }

  function handleFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    if (!getGithubToken()) {
      showToast('Configurez votre token GitHub dans Paramètres avant d\'uploader.', 'error');
      return;
    }

    let processed = 0;
    let success = 0;
    showToast('Upload en cours...', '');

    files.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        showToast(`${file.name} trop lourd (max 2 Mo)`, 'error');
        processed++;
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const name = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
        const ext = file.name.split('.').pop().toLowerCase();
        const fileName = `${name}.${ext}`;

        // Extract pure base64 from data URL (remove "data:image/xxx;base64," prefix)
        const base64 = reader.result.split(',')[1];

        try {
          await githubUploadFile(fileName, base64);

          // Store metadata locally (without the heavy dataUrl)
          const media = getMedia();
          media.unshift({
            id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
            name: name,
            ext: ext,
            size: file.size,
            date: Date.now(),
            url: `images/${fileName}`
          });
          saveMedia(media);
          success++;
        } catch (err) {
          showToast(`Erreur: ${err.message}`, 'error');
        }

        processed++;
        if (processed === files.length) {
          renderMedia();
          if (success > 0) {
            showToast(`${success} image${success > 1 ? 's' : ''} uploadée${success > 1 ? 's' : ''} sur GitHub`, 'success');
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function getMediaUrl(m) {
    // If the media has a real URL (new system), use it from the site
    if (m.url) return `${SITE_BASE_URL}/${m.url}`;
    // Legacy fallback: dataUrl from old localStorage system
    if (m.dataUrl) return m.dataUrl;
    // Construct URL from name
    return `${SITE_BASE_URL}/images/${m.name}.${m.ext}`;
  }

  function getMediaRelativePath(m) {
    return m.url || `images/${m.name}.${m.ext}`;
  }

  function renderMedia() {
    const media = getMedia();
    const grid = $('#media-grid');
    const empty = $('#no-media');
    const storageInfo = $('#media-storage-info');

    storageInfo.textContent = `${media.length} image${media.length !== 1 ? 's' : ''} — hébergées sur GitHub`;

    if (media.length === 0) {
      grid.innerHTML = '';
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    grid.innerHTML = media.map(m => {
      const sizeStr = m.size < 1024 ? m.size + ' o' :
        m.size < 1048576 ? (m.size / 1024).toFixed(0) + ' Ko' :
          (m.size / 1048576).toFixed(1) + ' Mo';
      const imgSrc = getMediaUrl(m);
      return `
        <div class="media-card" data-id="${m.id}">
          <img class="media-card-img" src="${imgSrc}" alt="${escapeHtml(m.name)}" loading="lazy">
          <div class="media-card-info">
            <div class="media-card-name">${escapeHtml(m.name)}.${m.ext}</div>
            <div class="media-card-size">${sizeStr}</div>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.media-card').forEach(card => {
      card.addEventListener('click', () => {
        const m = getMedia().find(x => x.id === card.dataset.id);
        if (m) openMediaModal(m);
      });
    });
  }

  let currentMediaId = null;

  function openMediaModal(m) {
    currentMediaId = m.id;
    $('#media-modal').hidden = false;
    $('#media-modal-title').textContent = m.name + '.' + m.ext;
    $('#media-preview-img').src = getMediaUrl(m);
    $('#media-rename').value = m.name;

    const fullUrl = `${SITE_BASE_URL}/images/${m.name}.${m.ext}`;
    $('#media-code').textContent = fullUrl;

    // Download link
    const dlBtn = $('#media-download-btn');
    dlBtn.href = getMediaUrl(m);
    dlBtn.download = m.name + '.' + m.ext;

    // Copy
    $('#media-copy-btn').onclick = () => {
      navigator.clipboard.writeText(fullUrl).then(() => {
        showToast('URL copiée !', 'success');
      });
    };

    // Rename
    $('#media-rename-btn').onclick = async () => {
      const newName = $('#media-rename').value.trim().replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
      if (!newName || newName === m.name) return;

      try {
        showToast('Renommage en cours...', '');

        // Download old file content from GitHub, upload with new name, delete old
        const token = getGithubToken();
        const oldPath = `${GITHUB_IMAGES_PATH}/${m.name}.${m.ext}`;
        const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${oldPath}?ref=${GITHUB_BRANCH}`, {
          headers: { 'Authorization': `token ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          // Upload with new name
          await githubUploadFile(`${newName}.${m.ext}`, data.content.replace(/\n/g, ''));
          // Delete old file
          await githubDeleteFile(`${m.name}.${m.ext}`);
        }

        const media = getMedia();
        const found = media.find(x => x.id === m.id);
        if (found) {
          found.name = newName;
          found.url = `images/${newName}.${m.ext}`;
          saveMedia(media);
          m.name = newName;
          m.url = found.url;
        }

        $('#media-modal-title').textContent = newName + '.' + m.ext;
        const newUrl = `${SITE_BASE_URL}/images/${newName}.${m.ext}`;
        $('#media-code').textContent = newUrl;
        $('#media-preview-img').src = getMediaUrl(m);
        dlBtn.download = newName + '.' + m.ext;
        dlBtn.href = getMediaUrl(m);
        renderMedia();
        showToast('Image renommée sur GitHub', 'success');
      } catch (err) {
        showToast(`Erreur: ${err.message}`, 'error');
      }
    };

    // Delete
    $('#media-delete-btn').onclick = async () => {
      if (!confirm('Supprimer cette image ?')) return;

      try {
        showToast('Suppression en cours...', '');
        await githubDeleteFile(`${m.name}.${m.ext}`);
      } catch (err) {
        // Continue with local deletion even if GitHub fails
        console.warn('GitHub delete failed:', err);
      }

      const media = getMedia().filter(x => x.id !== m.id);
      saveMedia(media);
      renderMedia();
      closeMediaModal();
      showToast('Image supprimée', 'success');
    };
  }

  function closeMediaModal() {
    $('#media-modal').hidden = true;
    currentMediaId = null;
  }

  function showToast(msg, type = '') {
    const existing = document.querySelector('.upload-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `upload-toast ${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // --- Helpers ---
  function statusLabel(status) {
    const labels = {
      soon: 'Bientôt',
      open: 'Inscriptions ouvertes',
      full: 'Complet',
      past: 'Passé'
    };
    return labels[status] || status;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // --- Start ---
  init();
})();
