/**
 * MeetGita - Google Meet Class Schedule Content Script
 * 
 * Architecture & Resilience Strategy:
 * 1. Single Source of Truth: Uses MEETGITA_CLASSES dataset with extensible schema.
 * 2. TreeWalker Text-Content Search: Scans for "No meetings scheduled for today" or carousel empty states
 *    without relying on obfuscated CSS class names.
 * 3. Fresh Lookup on Every Cycle: Re-evaluates container lookup dynamically on mutations, tab-switches (visibilitychange),
 *    and window focus events to counter Google Meet's internal SPA re-renders and polling.
 * 4. Liveness & Health Check (isDashboardHealthy): Verifies attached DOM presence and layout validity rather
 *    than relying on a naive ID-only existence check.
 * 5. Non-Destructive Hiding: Applies `display: none !important` to the native container so Google Meet's SPA reconciliation
 *    remains intact.
 * 6. Loop Throttling & Observer Discipline: Uses debounce, an `isInjecting` mutex flag, and rolling-window injection
 *    rate-limiting with console warning diagnostics.
 */

(function () {
  'use strict';

  // Prevent multiple script initialization
  if (window.__meetgita_initialized) return;
  window.__meetgita_initialized = true;

  /* ==========================================================================
     1. Class Schedule Dataset (Single Source of Truth)
     ========================================================================== */
  const MEETGITA_CLASSES = [
    {
      id: "react-1",
      subjectCode: "CS-301",
      subject: "React.js Development",
      teacher: "Rajesh Ranjan Sir",
      teacherInitials: "RR",
      department: "Computer Science & Engineering",
      session: "Before Break",
      link: "https://meet.google.com/zkb-hdxv-aba",
      startTime: "09:00 AM",
      endTime: "10:30 AM",
      status: "upcoming", // "live" | "upcoming" | "completed"
    },
    {
      id: "react-2",
      subjectCode: "CS-301",
      subject: "React.js Development",
      teacher: "Rajesh Ranjan Sir",
      teacherInitials: "RR",
      department: "Computer Science & Engineering",
      session: "After Break",
      link: "https://meet.google.com/hwu-yqkb-zyi",
      startTime: "11:00 AM",
      endTime: "12:30 PM",
      status: "upcoming",
    },
    {
      id: "dbms-1",
      subjectCode: "CS-205",
      subject: "Database Management Systems",
      teacher: "Adil Sir",
      teacherInitials: "AS",
      department: "Information Technology",
      session: "Before Break",
      link: "https://meet.google.com/mqs-fenu-wkc",
      startTime: "09:00 AM",
      endTime: "10:30 AM",
      status: "upcoming",
    },
    {
      id: "dbms-2",
      subjectCode: "CS-205",
      subject: "Database Management Systems",
      teacher: "Adil Sir",
      teacherInitials: "AS",
      department: "Information Technology",
      session: "After Break",
      link: "https://meet.google.com/mfy-tqua-keb",
      startTime: "11:00 AM",
      endTime: "12:30 PM",
      status: "upcoming",
    },
    {
      id: "nextjs-1",
      subjectCode: "CS-310",
      subject: "Next.js Development",
      teacher: "Next.js Sir",
      teacherInitials: "NJ",
      department: "Computer Science & Engineering",
      session: "Full Session",
      link: "https://meet.google.com/xhb-ghvy-oys",
      startTime: "01:00 PM",
      endTime: "02:30 PM",
      status: "upcoming",
    },
    {
      id: "dsa-1",
      subjectCode: "CS-201",
      subject: "Data Structures & Algorithms",
      teacher: "Samir Sir",
      teacherInitials: "SS",
      department: "Computer Science & Engineering",
      session: "Full Session",
      link: "https://meet.google.com/onx-qzxa-sao",
      startTime: "02:45 PM",
      endTime: "04:15 PM",
      status: "upcoming",
    },
    {
      id: "neel-1",
      subjectCode: "GEN-000",
      subject: "General Session",
      teacher: "Neel Sir",
      teacherInitials: "NS",
      department: "Computer Science & Engineering",
      session: "Full Session",
      link: "https://meet.google.com/baj-jazt-nit",
      startTime: "04:30 PM",
      endTime: "05:30 PM",
      status: "upcoming",
    },
    {
      id: "sumit-1",
      subjectCode: "GEN-001",
      subject: "Subject TBD",
      teacher: "Sumit Sir",
      teacherInitials: "SM",
      department: "Computer Science & Engineering",
      session: "Full Session",
      link: "https://meet.google.com/uhk-yvok-tqy",
      startTime: "05:45 PM",
      endTime: "06:45 PM",
      status: "upcoming",
    },
    {
      id: "mongodb-1",
      subjectCode: "CS-220",
      subject: "MongoDB",
      teacher: "Yogesh Sir",
      teacherInitials: "YS",
      department: "Computer Science & Engineering",
      session: "Full Session",
      link: "https://meet.google.com/odt-xfzb-emm",
      startTime: "07:00 PM",
      endTime: "08:00 PM",
      status: "upcoming",
    }
  ];

  /* ==========================================================================
     2. Phase 2 Timetable Helper Functions
     ========================================================================== */
  function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [time, meridian] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  function computeClassStatus(cls, now = new Date()) {
    if (!cls.startTime || !cls.endTime) return cls.status || "upcoming";
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const start = parseTimeToMinutes(cls.startTime);
    const end = parseTimeToMinutes(cls.endTime);
    if (nowMinutes >= start && nowMinutes <= end) return "live";
    if (nowMinutes < start) return "upcoming";
    return "completed";
  }

  /* ==========================================================================
     3. SVG Icons (Material Symbols / Google Style)
     ========================================================================== */
  const ICONS = {
    calendarHeader: `<svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zM7 12h5v5H7z"/></svg>`,
    videoCam: `<svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`,
    copy: `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
    clock: `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
    calendarEmpty: `<svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>`
  };

  /* ==========================================================================
     4. State & Throttling
     ========================================================================== */
  let activeFilter = 'all';
  let observer = null;
  let isInjecting = false;
  
  // Rate-limiting diagnostics to avoid render loops
  const injectionTimestamps = [];
  const MAX_INJECTIONS_WINDOW_MS = 4000;
  const MAX_INJECTIONS_COUNT = 8;

  function recordInjectionAttempt() {
    const now = Date.now();
    injectionTimestamps.push(now);
    // Prune timestamps older than window
    while (injectionTimestamps.length > 0 && injectionTimestamps[0] < now - MAX_INJECTIONS_WINDOW_MS) {
      injectionTimestamps.shift();
    }
    if (injectionTimestamps.length >= MAX_INJECTIONS_COUNT) {
      console.warn('[MeetGita] Repeated re-injection detected — possible render loop in progress');
      return false;
    }
    return true;
  }

  function isMeetHomePage() {
    const pathname = window.location.pathname;
    // Avoid active video call rooms (meet.google.com/xxx-yyyy-zzz)
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

  /**
   * Checks whether our dashboard node is attached, live, and visible in document flow.
   */
  function isDashboardHealthy() {
    const dashboard = document.getElementById('meetgita-dashboard');
    if (!dashboard) return false;
    if (!document.body.contains(dashboard)) return false;
    if (dashboard.parentElement === null) return false;
    // Ensure dashboard has not been hidden by external styles
    if (dashboard.style.display === 'none') return false;
    return true;
  }

  function getInitials(name) {
    if (!name) return 'MG';
    const parts = name.replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').replace(/\s+Sir$/i, '').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  function extractMeetCode(link) {
    if (!link) return '';
    return link.replace(/^https?:\/\/meet\.google\.com\//i, '').trim();
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
     5. TreeWalker-Based Semantic Target Locator (Always run fresh)
     ========================================================================== */

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

          let current = textElem;
          let candidate = null;

          for (let i = 0; i < 6 && current && current !== document.body; i++) {
            const parent = current.parentElement;
            if (!parent) break;

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
     6. Card & Dashboard Rendering
     ========================================================================== */

  function renderCard(cls) {
    const card = document.createElement('div');
    card.className = `mg-card ${cls.status === 'live' ? 'is-live' : ''}`;

    const statusBadge = cls.status === 'live'
      ? `<span class="mg-status-badge live"><span class="mg-pulsing-dot"></span> LIVE</span>`
      : '';

    const sessionBadge = cls.session
      ? `<span class="mg-session-badge">${cls.session}</span>`
      : '';

    const meetCode = extractMeetCode(cls.link);
    const initials = cls.teacherInitials || getInitials(cls.teacher);
    const timeDisplay = cls.startTime && cls.endTime ? `${cls.startTime} - ${cls.endTime}` : (cls.startTime || '');

    card.innerHTML = `
      <div class="mg-card-top">
        <div class="mg-tags-group">
          <span class="mg-subject-code">${cls.subjectCode || 'CLASS'}</span>
          ${sessionBadge}
          ${statusBadge}
        </div>
        ${timeDisplay ? `
          <span class="mg-time-slot">
            ${ICONS.clock} ${timeDisplay}
          </span>
        ` : ''}
      </div>
      <div class="mg-card-content">
        <h3 class="mg-subject-title" title="${cls.subject}">${cls.subject}</h3>
        <div class="mg-teacher-row">
          <div class="mg-avatar">${initials}</div>
          <div class="mg-teacher-info">
            <span class="mg-teacher-name">${cls.teacher}</span>
            <span class="mg-teacher-dept">${cls.department || 'CodingGita'}</span>
          </div>
        </div>
      </div>
      <div class="mg-card-actions">
        <span class="mg-link-preview" title="${cls.link}">meet.google.com/${meetCode}</span>
        <div class="mg-action-buttons">
          <button type="button" class="mg-btn-icon" data-tooltip="Copy meeting link" aria-label="Copy meeting link">
            ${ICONS.copy}
          </button>
          <a href="${cls.link}" class="mg-btn-join" target="_blank" rel="noopener noreferrer">
            ${ICONS.videoCam} Join Class
          </a>
        </div>
      </div>
    `;

    const copyBtn = card.querySelector('.mg-btn-icon');
    copyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyMeetLink(cls.link, copyBtn);
    });

    return card;
  }

  function renderCards(dashboard) {
    const container = dashboard.querySelector('.mg-cards-grid');
    if (!container) return;

    container.innerHTML = '';

    const filtered = MEETGITA_CLASSES.filter(item => {
      if (activeFilter === 'live') return item.status === 'live';
      if (activeFilter === 'upcoming') return item.status === 'upcoming';
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="mg-empty-state">
          <div class="mg-empty-icon">${ICONS.calendarEmpty}</div>
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

    const liveCount = MEETGITA_CLASSES.filter(c => c.status === 'live').length;
    const upcomingCount = MEETGITA_CLASSES.filter(c => c.status === 'upcoming').length;

    const header = document.createElement('div');
    header.className = 'mg-header';
    header.innerHTML = `
      <div class="mg-header-top">
        <div class="mg-header-left">
          <div class="mg-logo-icon" title="MeetGita">
            ${ICONS.calendarHeader}
          </div>
          <h2 class="mg-title">Class Schedule</h2>
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
          All Classes <span class="mg-chip-count">${MEETGITA_CLASSES.length}</span>
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

    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'mg-cards-grid';
    dashboard.appendChild(cardsGrid);

    renderCards(dashboard);

    return dashboard;
  }

  /* ==========================================================================
     7. Robust Injection & Self-Healing Engine
     ========================================================================== */

  function tryInjectDashboard() {
    if (isInjecting) return;

    if (!isMeetHomePage()) {
      const existing = document.getElementById('meetgita-dashboard');
      if (existing) existing.remove();
      return;
    }

    const nativeContainer = findNativeEmptyStateContainer();
    const existingDashboard = document.getElementById('meetgita-dashboard');

    // 1. If native container is present, ensure it is hidden
    if (nativeContainer) {
      if (nativeContainer.style.display !== 'none') {
        nativeContainer.style.setProperty('display', 'none', 'important');
        nativeContainer.classList.add('meetgita-hidden-native');
      }

      // 2. Check if existing dashboard is already healthy and positioned directly before nativeContainer
      if (
        isDashboardHealthy() &&
        existingDashboard &&
        existingDashboard.parentElement === nativeContainer.parentElement &&
        existingDashboard.nextElementSibling === nativeContainer
      ) {
        return; // Fully healthy and accurately placed
      }
    } else {
      // Native container not found; if dashboard is healthy and in DOM, let it stay
      if (isDashboardHealthy()) {
        return;
      }
    }

    // If native container is missing or has no parent yet, we cannot inject safely
    if (!nativeContainer || !nativeContainer.parentElement) {
      return;
    }

    // Rate-limiting sanity check
    if (!recordInjectionAttempt()) {
      return;
    }

    // Perform the injection/re-injection
    isInjecting = true;

    try {
      if (existingDashboard) {
        existingDashboard.remove();
      }

      const dashboard = createDashboardElement();
      nativeContainer.parentElement.insertBefore(dashboard, nativeContainer);
      console.log('[MeetGita] Verified & injected class schedule inline into page flow.');
    } catch (err) {
      console.error('[MeetGita] Injection error:', err);
    } finally {
      // Allow next mutation batch after DOM write completes
      setTimeout(() => {
        isInjecting = false;
      }, 50);
    }
  }

  /* ==========================================================================
     8. Persistent Lifecycle & Observer Listeners (Never Disconnected Permanently)
     ========================================================================== */

  function setupPersistentObserver() {
    if (observer) {
      observer.disconnect();
    }

    let debounceTimer = null;
    observer = new MutationObserver(() => {
      if (isInjecting) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        tryInjectDashboard();
      }, 80);
    });

    // Observe documentElement/body persistently for full page lifetime
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Initial Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      tryInjectDashboard();
      setupPersistentObserver();
    });
  } else {
    tryInjectDashboard();
    setupPersistentObserver();
  }

  // React to tab switching & window focus immediately
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      tryInjectDashboard();
    }
  });

  window.addEventListener('focus', () => {
    tryInjectDashboard();
  });

  // SPA navigation handling
  window.addEventListener('popstate', tryInjectDashboard);

  const origPushState = history.pushState;
  history.pushState = function () {
    origPushState.apply(this, arguments);
    setTimeout(tryInjectDashboard, 80);
  };

  const origReplaceState = history.replaceState;
  history.replaceState = function () {
    origReplaceState.apply(this, arguments);
    setTimeout(tryInjectDashboard, 80);
  };

})();
