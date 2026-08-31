/**
 * MeetGita - Google Meet Class Schedule Content Script
 * 
 * Architecture & Resilience Strategy:
 * 1. Text-Content Search via TreeWalker: Google Meet uses minified, dynamic class names (e.g. .VfPpkd-*).
 *    We never rely on class hashes. Instead, we scan text nodes for "No meetings scheduled for today".
 * 2. Structural Traversal via closest() / parentElement: Locates the exact semantic wrapper holding
 *    both the empty-state illustration and text, avoiding disruption of top-level headers or left-side hero actions.
 * 3. Non-Destructive Hiding: The native container is hidden with `display: none !important` (not removed),
 *    preventing Meet's internal SPA reconciliation from breaking.
 * 4. Inline Flow Insertion: Injected as an immediate sibling in the native container's parent, naturally
 *    participating in Google Meet's existing flex/grid column layout without fixed/absolute popups.
 * 5. Idempotency & Observer Discipline: Guards against duplicate injections and disconnects the observer
 *    temporarily during DOM mutations to prevent re-entrant mutation loops.
 */

(function () {
  'use strict';

  // Prevent multiple script initialization
  if (window.__meetgita_initialized) return;
  window.__meetgita_initialized = true;

  /* ==========================================================================
     1. Class Schedule Data Structure (Phase 1 & Phase 2 Ready)
     ========================================================================== */
  const CLASS_SCHEDULE = [
    {
      id: 'cls-101',
      subject: 'Advanced Data Structures & Algorithms',
      code: 'CS-301',
      teacherName: 'Prof. Rajesh Sharma',
      department: 'Computer Science & Engineering',
      time: '09:00 AM - 10:30 AM',
      startTime: '09:00',
      endTime: '10:30',
      status: 'live', // 'live' | 'upcoming' | 'completed'
      meetCode: 'dsa-core-live',
      meetLink: 'https://meet.google.com/dsa-core-live',
      resourceFolderLink: 'https://drive.google.com'
    },
    {
      id: 'cls-102',
      subject: 'Electromagnetic Field Theory & Wave Optics',
      code: 'PH-204',
      teacherName: 'Dr. Ananya Sen',
      department: 'Department of Applied Physics',
      time: '10:45 AM - 12:15 PM',
      startTime: '10:45',
      endTime: '12:15',
      status: 'live',
      meetCode: 'phy-wave-opt',
      meetLink: 'https://meet.google.com/phy-wave-opt',
      resourceFolderLink: 'https://drive.google.com'
    },
    {
      id: 'cls-103',
      subject: 'Machine Learning & Neural Architectures',
      code: 'AI-402',
      teacherName: 'Prof. Vikram Aditya',
      department: 'AI & Data Science',
      time: '02:00 PM - 03:30 PM',
      startTime: '14:00',
      endTime: '15:30',
      status: 'upcoming',
      meetCode: 'ml-deep-net',
      meetLink: 'https://meet.google.com/ml-deep-net',
      resourceFolderLink: 'https://drive.google.com'
    },
    {
      id: 'cls-104',
      subject: 'Database Systems & Cloud Optimization',
      code: 'CS-205',
      teacherName: 'Dr. Sneha Patil',
      department: 'Information Technology',
      time: '04:00 PM - 05:30 PM',
      startTime: '16:00',
      endTime: '17:30',
      status: 'upcoming',
      meetCode: 'dbms-cld-opt',
      meetLink: 'https://meet.google.com/dbms-cld-opt',
      resourceFolderLink: 'https://drive.google.com'
    }
  ];

  /* ==========================================================================
     2. SVG Icons (Material Symbols / Google Style)
     ========================================================================== */
  const ICONS = {
    meetLogo: `<svg viewBox="0 0 24 24"><path d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-2 10.5V9.5l4-2.5v10l-4-2.5z"/></svg>`,
    videoCam: `<svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`,
    copy: `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
    clock: `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>`
  };

  /* ==========================================================================
     3. State & Helpers
     ========================================================================== */
  let activeFilter = 'all';
  let observer = null;
  let isMutatingDOM = false;

  function isMeetHomePage() {
    const pathname = window.location.pathname;
    // Strictly avoid active meeting rooms (meet.google.com/xxx-yyyy-zzz)
    const isMeetingRoom = /\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(pathname);
    if (isMeetingRoom) return false;

    return (
      pathname === '/' ||
      pathname === '' ||
      pathname === '/home' ||
      pathname.startsWith('/home') ||
      pathname.startsWith('/landing') ||
      pathname.includes('/landing') ||
      pathname === '/_meet'
    );
  }

  function getFormattedToday() {
    const now = new Date();
    return now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  function getInitials(name) {
    if (!name) return 'MG';
    const parts = name.replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  function showToast(message) {
    let toast = document.querySelector('.mg-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'mg-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `${ICONS.check} <span>${message}</span>`;
    toast.classList.add('visible');

    setTimeout(() => {
      toast.classList.remove('visible');
    }, 2200);
  }

  async function copyMeetLink(link, buttonElement) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = link;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      buttonElement.classList.add('copied');
      buttonElement.innerHTML = ICONS.check;
      buttonElement.setAttribute('data-tooltip', 'Link Copied!');

      showToast(`Class link copied to clipboard`);

      setTimeout(() => {
        buttonElement.classList.remove('copied');
        buttonElement.innerHTML = ICONS.copy;
        buttonElement.setAttribute('data-tooltip', 'Copy meeting link');
      }, 2000);
    } catch (err) {
      console.error('[MeetGita] Error copying link:', err);
    }
  }

  /* ==========================================================================
     4. TreeWalker-Based Semantic Target Locator
     ========================================================================== */

  /**
   * Scans text nodes for "No meetings scheduled for today" or carousel empty phrases,
   * then climbs up to the exact container block representing the empty-state visual unit.
   */
  function findNativeEmptyStateContainer() {
    const searchPhrases = [
      'No meetings scheduled for today',
      'No meetings scheduled',
      'Get a link you can share',
      'Plan ahead',
      'Your meeting is safe'
    ];

    const root = document.body || document.documentElement;
    if (!root) return null;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      const text = (node.nodeValue || '').trim();
      if (!text) continue;

      for (const phrase of searchPhrases) {
        if (text.toLowerCase().includes(phrase.toLowerCase())) {
          let textElem = node.parentElement;
          if (!textElem) continue;

          // Climb upwards from text element to find the container holding the empty state / carousel
          let current = textElem;
          let candidate = null;

          // Traverse up to 6 levels to find the bounded card/column container
          for (let i = 0; i < 6 && current && current !== document.body; i++) {
            const parent = current.parentElement;
            if (!parent) break;

            // Stop before reaching body, main, or the full two-column container
            const isMainGridParent = parent.tagName === 'MAIN' || parent.getAttribute('role') === 'main';
            const isTwoColumnParent = parent.children.length >= 2 && Array.from(parent.children).some(c => 
              c !== current && c.querySelector && c.querySelector('button, input')
            );

            if (isTwoColumnParent || isMainGridParent || current.getAttribute('role') === 'region') {
              candidate = current;
              break;
            }

            candidate = current;
            current = parent;
          }

          if (candidate && candidate !== document.body) {
            return candidate;
          }
        }
      }
    }

    return null;
  }

  /* ==========================================================================
     5. Component Rendering (Material Design 3 Card Grid)
     ========================================================================== */

  function renderCard(cls) {
    const card = document.createElement('div');
    card.className = `mg-card ${cls.status === 'live' ? 'is-live' : ''}`;

    const statusBadge = cls.status === 'live'
      ? `<span class="mg-status-badge live"><span class="mg-pulsing-dot"></span> LIVE</span>`
      : `<span class="mg-status-badge upcoming">Upcoming</span>`;

    card.innerHTML = `
      <div class="mg-card-top">
        <div class="mg-tags-group">
          <span class="mg-subject-code">${cls.code}</span>
          ${statusBadge}
        </div>
        <span class="mg-time-slot">
          ${ICONS.clock} ${cls.time}
        </span>
      </div>
      <div class="mg-card-content">
        <h3 class="mg-subject-title" title="${cls.subject}">${cls.subject}</h3>
        <div class="mg-teacher-row">
          <div class="mg-avatar">${getInitials(cls.teacherName)}</div>
          <div class="mg-teacher-info">
            <span class="mg-teacher-name">${cls.teacherName}</span>
            <span class="mg-teacher-dept">${cls.department}</span>
          </div>
        </div>
      </div>
      <div class="mg-card-actions">
        <span class="mg-link-preview" title="${cls.meetLink}">${cls.meetCode}</span>
        <div class="mg-action-buttons">
          <button type="button" class="mg-btn-icon" data-tooltip="Copy meeting link" aria-label="Copy meeting link">
            ${ICONS.copy}
          </button>
          <a href="${cls.meetLink}" class="mg-btn-join" target="_blank" rel="noopener noreferrer">
            ${ICONS.videoCam} Join Class
          </a>
        </div>
      </div>
    `;

    const copyBtn = card.querySelector('.mg-btn-icon');
    copyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyMeetLink(cls.meetLink, copyBtn);
    });

    return card;
  }

  function renderCards(dashboard) {
    const container = dashboard.querySelector('.mg-cards-grid');
    if (!container) return;

    container.innerHTML = '';

    const filtered = CLASS_SCHEDULE.filter(item => {
      if (activeFilter === 'live') return item.status === 'live';
      if (activeFilter === 'upcoming') return item.status === 'upcoming';
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="mg-empty-state">
          <div class="mg-empty-icon">${ICONS.calendar}</div>
          <p class="mg-empty-title">No ${activeFilter} classes scheduled</p>
          <p class="mg-empty-subtitle">You are all caught up for today.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(cls => {
      container.appendChild(renderCard(cls));
    });
  }

  function createDashboardElement() {
    const dashboard = document.createElement('div');
    dashboard.id = 'meetgita-dashboard';

    const liveCount = CLASS_SCHEDULE.filter(c => c.status === 'live').length;
    const upcomingCount = CLASS_SCHEDULE.filter(c => c.status === 'upcoming').length;

    // Header
    const header = document.createElement('div');
    header.className = 'mg-header';
    header.innerHTML = `
      <div class="mg-header-top">
        <div class="mg-header-left">
          <div class="mg-logo-icon" title="MeetGita">
            ${ICONS.meetLogo}
          </div>
          <div class="mg-title-group">
            <span class="mg-subtitle">${getFormattedToday()}</span>
            <h2 class="mg-title">Class Schedule</h2>
          </div>
        </div>
        <div class="mg-header-right">
          ${
            liveCount > 0
              ? `<div class="mg-live-counter">
                  <span class="mg-pulsing-dot"></span>
                  <span>${liveCount} Live Now</span>
                </div>`
              : ''
          }
        </div>
      </div>
      <div class="mg-filters">
        <button type="button" class="mg-filter-chip ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">
          All Classes <span class="mg-chip-count">${CLASS_SCHEDULE.length}</span>
        </button>
        <button type="button" class="mg-filter-chip ${activeFilter === 'live' ? 'active' : ''}" data-filter="live">
          Live Now <span class="mg-chip-count">${liveCount}</span>
        </button>
        <button type="button" class="mg-filter-chip ${activeFilter === 'upcoming' ? 'active' : ''}" data-filter="upcoming">
          Upcoming <span class="mg-chip-count">${upcomingCount}</span>
        </button>
      </div>
    `;

    header.querySelectorAll('.mg-filter-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const selected = btn.getAttribute('data-filter');
        if (selected === activeFilter) return;
        activeFilter = selected;
        renderCards(dashboard);
        header.querySelectorAll('.mg-filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    dashboard.appendChild(header);

    // Responsive Grid
    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'mg-cards-grid';
    dashboard.appendChild(cardsGrid);

    renderCards(dashboard);

    return dashboard;
  }

  /* ==========================================================================
     6. Injection Engine with Idempotency & Observer Discipline
     ========================================================================== */

  function tryInjectDashboard() {
    if (isMutatingDOM) return;

    if (!isMeetHomePage()) {
      const existing = document.getElementById('meetgita-dashboard');
      if (existing) existing.remove();
      return;
    }

    const nativeContainer = findNativeEmptyStateContainer();
    const existingDashboard = document.getElementById('meetgita-dashboard');

    if (nativeContainer) {
      // Hide native container cleanly without destroying it
      if (nativeContainer.style.display !== 'none') {
        nativeContainer.style.setProperty('display', 'none', 'important');
        nativeContainer.classList.add('meetgita-hidden-native');
      }

      // If dashboard is already present in the right parent, we are done
      if (existingDashboard && existingDashboard.parentElement === nativeContainer.parentElement) {
        return;
      }
    }

    // If dashboard already exists and is attached, don't re-create
    if (existingDashboard && document.body.contains(existingDashboard)) {
      return;
    }

    if (!nativeContainer || !nativeContainer.parentElement) {
      return;
    }

    // Perform injection with observer temporarily disconnected to avoid loops
    isMutatingDOM = true;
    if (observer) observer.disconnect();

    try {
      if (existingDashboard) existingDashboard.remove();
      const dashboard = createDashboardElement();
      nativeContainer.parentElement.insertBefore(dashboard, nativeContainer);
      console.log('[MeetGita] Injected class schedule inline into page flow.');
    } catch (err) {
      console.error('[MeetGita] Injection error:', err);
    } finally {
      isMutatingDOM = false;
      if (observer) {
        observer.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true
        });
      }
    }
  }

  /* ==========================================================================
     7. Lifecycle & SPA Route Listeners
     ========================================================================== */

  function setupObserver() {
    if (observer) observer.disconnect();

    let debounceTimer = null;
    observer = new MutationObserver(() => {
      if (isMutatingDOM) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        tryInjectDashboard();
      }, 100);
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      tryInjectDashboard();
      setupObserver();
    });
  } else {
    tryInjectDashboard();
    setupObserver();
  }

  // SPA navigation handling
  window.addEventListener('popstate', tryInjectDashboard);

  const origPushState = history.pushState;
  history.pushState = function () {
    origPushState.apply(this, arguments);
    setTimeout(tryInjectDashboard, 100);
  };

  const origReplaceState = history.replaceState;
  history.replaceState = function () {
    origReplaceState.apply(this, arguments);
    setTimeout(tryInjectDashboard, 100);
  };

})();
