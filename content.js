/**
 * CG Meet Hub - Google Meet Class Schedule Content Script
 * 
 * Root Cause Resolution:
 * 1. Google Meet's Wiz Framework periodically re-renders and reconciles the contents of
 *    its Agenda Controller (`.cadSnb` / `div[jscontroller]`) when fetching agenda data.
 * 2. Injected nodes placed *inside* that controlled subtree get wiped out during Wiz reconciliation cycles.
 * 3. FIX: Hide the agenda empty-state container (`.cadSnb` / `.VBauye`) atomically and inject
 *    `#cgmeethub-dashboard` into the stable parent container (`div.u88fae` / column wrapper) as a sibling.
 * 4. Strictly Idempotent: If the dashboard is already present in document.body and healthy, the injection
 *    cycle never destroys or recreates it.
 */

(function () {
  'use strict';

  // Prevent multiple script initialization
  if (window.__cgmeethub_initialized) return;
  window.__cgmeethub_initialized = true;

  /* ==========================================================================
     1. Class Schedule Dataset (Single Source of Truth)
     ========================================================================== */
  const CG_MEET_HUB_CLASSES = [
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
     3. SVG Icons
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
     4. State & Helpers
     ========================================================================== */
  let activeFilter = 'all';
  let observer = null;
  let isInjecting = false;

  function isMeetHomePage() {
    const pathname = window.location.pathname;
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

  function isDashboardHealthy(dashboard) {
    const el = dashboard || document.getElementById('cgmeethub-dashboard') || document.getElementById('meetgita-dashboard');
    if (!el) return false;
    if (!document.body.contains(el)) return false;
    if (el.parentElement === null) return false;
    if (el.style.display === 'none') return false;
    return true;
  }

  function getInitials(name) {
    if (!name) return 'CG';
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
      console.error('[CG Meet Hub] Error copying link:', err);
    }
  }

  /* ==========================================================================
     5. Stable Container Locator
     ========================================================================== */

  /**
   * Discovers the agenda empty state container (.cadSnb / .VBauye) and its stable parent (div.u88fae).
   */
  function findNativeContainers() {
    // 1. Check if we already have a marked container attached
    const marked = document.querySelector('[data-cgmeethub-native-hidden="true"]');
    if (marked && document.body.contains(marked) && marked.parentElement) {
      return {
        hideTarget: marked,
        parent: marked.parentElement,
        insertRef: marked
      };
    }

    // 2. Full TreeWalker search for agenda empty state phrases
    const searchPhrases = [
      'No meetings scheduled for today',
      'No meetings scheduled',
      'Schedule a meeting or enjoy the free time'
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
          const textElem = node.parentElement;
          if (!textElem) continue;

          // Find the empty state card container (.VBauye or NuUMIe parent)
          const emptyCard = textElem.closest('.VBauye') ||
                            (textElem.closest('.NuUMIe') ? textElem.closest('.NuUMIe').parentElement : null) ||
                            textElem.closest('div[jscontroller]') ||
                            textElem.closest('div[role="region"]');

          if (emptyCard && emptyCard !== document.body && emptyCard.parentElement) {
            // Find the higher agenda controller wrapper if present (.cadSnb)
            const agendaWrapper = emptyCard.closest('.cadSnb') || emptyCard;
            const stableParent = agendaWrapper.parentElement;

            if (stableParent && stableParent !== document.body) {
              return {
                hideTarget: agendaWrapper,
                parent: stableParent,
                insertRef: agendaWrapper
              };
            }
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

    const filtered = CG_MEET_HUB_CLASSES.filter(item => {
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
    dashboard.id = 'cgmeethub-dashboard';

    const liveCount = CG_MEET_HUB_CLASSES.filter(c => c.status === 'live').length;
    const upcomingCount = CG_MEET_HUB_CLASSES.filter(c => c.status === 'upcoming').length;

    const header = document.createElement('div');
    header.className = 'mg-header';
    header.innerHTML = `
      <div class="mg-header-top">
        <div class="mg-header-left">
          <div class="mg-logo-icon" title="CG Meet Hub">
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
          All Classes <span class="mg-chip-count">${CG_MEET_HUB_CLASSES.length}</span>
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
     7. Stable Idempotent Injection
     ========================================================================== */

  function tryInjectDashboard() {
    if (isInjecting) return;

    if (!isMeetHomePage()) {
      const existing = document.getElementById('cgmeethub-dashboard') || document.getElementById('meetgita-dashboard');
      if (existing) existing.remove();
      return;
    }

    const containers = findNativeContainers();
    const existingDashboard = document.getElementById('cgmeethub-dashboard') || document.getElementById('meetgita-dashboard');

    // 1. Hide native container atomically
    if (containers && containers.hideTarget) {
      containers.hideTarget.dataset.cgmeethubNativeHidden = "true";
      if (containers.hideTarget.style.display !== 'none') {
        containers.hideTarget.style.setProperty('display', 'none', 'important');
        containers.hideTarget.classList.add('cgmeethub-hidden-native');
        containers.hideTarget.classList.add('meetgita-hidden-native');
      }
    }

    // 2. IDEMPOTENT CHECK: If dashboard already exists, is healthy, and in DOM, do NOT touch it!
    if (isDashboardHealthy(existingDashboard)) {
      return;
    }

    // 3. If parent container is not yet ready in DOM, wait for next mutation
    if (!containers || !containers.parent) {
      return;
    }

    isInjecting = true;

    try {
      if (existingDashboard) {
        existingDashboard.remove();
      }

      const dashboard = createDashboardElement();
      // Insert into stable parent alongside the agenda container
      containers.parent.insertBefore(dashboard, containers.insertRef);
      console.log('[CG Meet Hub] Injected class schedule dashboard into stable container.');
    } catch (err) {
      console.error('[CG Meet Hub] Injection error:', err);
    } finally {
      setTimeout(() => {
        isInjecting = false;
      }, 50);
    }
  }

  /* ==========================================================================
     8. Dev Recovery Helper
     ========================================================================== */

  window.__cgmeethubReset = window.__meetgitaReset = function () {
    console.log('[CG Meet Hub] Executing developer reset...');

    document.querySelectorAll('[data-cgmeethub-native-hidden="true"], .cgmeethub-hidden-native, .meetgita-hidden-native').forEach(el => {
      el.style.display = '';
      delete el.dataset.cgmeethubNativeHidden;
      el.classList.remove('cgmeethub-hidden-native', 'meetgita-hidden-native');
    });

    const dashboard = document.getElementById('cgmeethub-dashboard') || document.getElementById('meetgita-dashboard');
    if (dashboard) dashboard.remove();

    console.log('[CG Meet Hub] Reset complete. Native Meet UI restored.');
  };

  /* ==========================================================================
     9. Persistent Lifecycle Listeners
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

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Initial boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      tryInjectDashboard();
      setupPersistentObserver();
    });
  } else {
    tryInjectDashboard();
    setupPersistentObserver();
  }

  // React to visibility / tab changes
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
