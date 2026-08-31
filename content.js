/**
 * CG Meet Hub - Google Meet Class Schedule Content Script
 * 
 * DIAGNOSTIC INSTRUMENTATION PASS:
 * This build instruments every MutationObserver tick, DOM search/hide action,
 * dashboard lifecycle event, scroll event, visibility change, and network activity
 * with unified timestamped logging to diagnose root causes before applying fixes.
 */

(function () {
  'use strict';

  // Prevent multiple script initialization
  if (window.__cgmeethub_initialized) return;
  window.__cgmeethub_initialized = true;

  const MEETGITA_DEBUG = true;

  /* ==========================================================================
     0. Diagnostic Logger Helper
     ========================================================================== */
  function logDebug(category, message, extra = null) {
    if (!MEETGITA_DEBUG) return;
    const now = new Date();
    const timeStr = `${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}`;
    const visState = document.visibilityState;
    const prefix = `[MeetGita-Diag | ${timeStr} | vis:${visState}] [${category}]`;
    if (extra !== null) {
      console.log(`%c${prefix} ${message}`, 'color: #0b57d0; font-weight: bold;', extra);
    } else {
      console.log(`%c${prefix} ${message}`, 'color: #0b57d0; font-weight: bold;');
    }
  }

  logDebug('INIT', 'Content script initialized on page: ' + window.location.href);

  /* ==========================================================================
     1. Class Schedule Dataset
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
      status: "upcoming",
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
     2. SVG Icons
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
     3. State & Controls
     ========================================================================== */
  let activeFilter = 'all';
  let observer = null;
  let isInjecting = false;
  let isHaltedDueToLoop = false;
  let mutationCount = 0;
  
  const injectionTimestamps = [];
  const MAX_INJECTIONS_WINDOW_MS = 2000;
  const MAX_INJECTIONS_CAP = 3;

  function canProceedWithInjection() {
    if (isHaltedDueToLoop) {
      logDebug('RATE_LIMIT', 'Blocked injection: engine halted due to previous loop detection.');
      return false;
    }

    const now = Date.now();
    injectionTimestamps.push(now);

    while (injectionTimestamps.length > 0 && injectionTimestamps[0] < now - MAX_INJECTIONS_WINDOW_MS) {
      injectionTimestamps.shift();
    }

    logDebug('RATE_LIMIT', `Injection attempt #${injectionTimestamps.length} in current ${MAX_INJECTIONS_WINDOW_MS}ms window`);

    if (injectionTimestamps.length > MAX_INJECTIONS_CAP) {
      isHaltedDueToLoop = true;
      console.error(
        '[MeetGita-Diag] CRITICAL: Injection attempt cap exceeded (more than 3 attempts in 2s) — halting injection.',
        {
          timestamps: [...injectionTimestamps],
          activeDashboard: document.getElementById('cgmeethub-dashboard'),
          markedNative: document.querySelector('[data-cgmeethub-native-hidden="true"]')
        }
      );
      return false;
    }

    return true;
  }

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

  function isDashboardHealthy() {
    const dashboard = document.getElementById('cgmeethub-dashboard') || document.getElementById('meetgita-dashboard');
    if (!dashboard) {
      logDebug('HEALTH_CHECK', 'isDashboardHealthy = false (element not found in DOM by ID)');
      return false;
    }
    if (!document.body.contains(dashboard)) {
      logDebug('HEALTH_CHECK', 'isDashboardHealthy = false (element found by ID but NOT in document.body)');
      return false;
    }
    if (dashboard.parentElement === null) {
      logDebug('HEALTH_CHECK', 'isDashboardHealthy = false (parentElement is null)');
      return false;
    }
    if (dashboard.style.display === 'none') {
      logDebug('HEALTH_CHECK', 'isDashboardHealthy = false (style.display is none)');
      return false;
    }
    logDebug('HEALTH_CHECK', 'isDashboardHealthy = true', {
      parent: dashboard.parentElement.tagName,
      siblingCount: dashboard.parentElement.children.length
    });
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
      console.error('[MeetGita-Diag] Error copying link:', err);
    }
  }

  /* ==========================================================================
     4. Atomic Empty-State Target Locator with Detailed Logging
     ========================================================================== */

  function findNativeEmptyStateContainer() {
    // 1. Fast path: Marked element
    const marked = document.querySelector('[data-cgmeethub-native-hidden="true"]');
    if (marked && document.body.contains(marked)) {
      logDebug('FIND_CONTAINER', 'Fast path: Found existing [data-cgmeethub-native-hidden="true"] marker', {
        tag: marked.tagName,
        snippet: marked.outerHTML.slice(0, 100),
        parent: marked.parentElement ? marked.parentElement.tagName : null
      });
      return marked;
    }

    // 2. Full TreeWalker search
    logDebug('FIND_CONTAINER', 'Running TreeWalker text search for empty state phrases...');
    const searchPhrases = [
      'No meetings scheduled for today',
      'Schedule a meeting or enjoy the free time',
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

          logDebug('FIND_CONTAINER', `Matched text phrase: "${phrase}" inside <${textElem.tagName}>`);

          let current = textElem;
          let candidate = null;

          for (let i = 0; i < 8 && current && current !== document.body; i++) {
            const parent = current.parentElement;
            if (!parent || parent === document.body) break;

            const isMainGridParent = parent.tagName === 'MAIN' || parent.getAttribute('role') === 'main';
            const isTwoColumnSplit = parent.children.length >= 2 && Array.from(parent.children).some(c => 
              c !== current && c.querySelector && c.querySelector('button, input[placeholder*="code" i], input[aria-label*="code" i]')
            );

            if (isTwoColumnSplit || isMainGridParent || current.getAttribute('role') === 'region') {
              candidate = current;
              break;
            }

            candidate = current;
            current = parent;
          }

          if (candidate && candidate !== document.body) {
            logDebug('FIND_CONTAINER', 'Resolved candidate container via TreeWalker climb:', {
              tag: candidate.tagName,
              snippet: candidate.outerHTML.slice(0, 120),
              parent: candidate.parentElement ? candidate.parentElement.tagName : null
            });
            return candidate;
          }
        }
      }
    }

    logDebug('FIND_CONTAINER', 'TreeWalker found NO matching empty state text nodes.');
    return null;
  }

  /* ==========================================================================
     5. Card & Dashboard Rendering
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
    logDebug('DASHBOARD_LIFECYCLE', 'createDashboardElement() called');
    if (MEETGITA_DEBUG) console.trace('[MeetGita-Diag] Stack trace for createDashboardElement:');

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

    // Instrument card grid scroll
    cardsGrid.addEventListener('scroll', (e) => {
      logDebug('SCROLL_DASHBOARD', `Card grid scrolled: scrollTop=${e.target.scrollTop}, scrollHeight=${e.target.scrollHeight}`);
    }, { passive: true });

    renderCards(dashboard);

    return dashboard;
  }

  /* ==========================================================================
     6. Injection Routine with Trace Logging
     ========================================================================== */

  function tryInjectDashboard(triggerSource = 'unknown') {
    logDebug('INJECT_CYCLE', `tryInjectDashboard() invoked by [${triggerSource}]`);

    if (isInjecting || isHaltedDueToLoop) {
      logDebug('INJECT_CYCLE', `Skipped: isInjecting=${isInjecting}, isHaltedDueToLoop=${isHaltedDueToLoop}`);
      return;
    }

    if (!isMeetHomePage()) {
      logDebug('INJECT_CYCLE', 'Not on Google Meet home page. Checking for cleanup...');
      const existing = document.getElementById('cgmeethub-dashboard') || document.getElementById('meetgita-dashboard');
      if (existing) {
        logDebug('DASHBOARD_LIFECYCLE', 'Removing dashboard (navigated away from home page)');
        existing.remove();
      }
      return;
    }

    const nativeContainer = findNativeEmptyStateContainer();
    const existingDashboard = document.getElementById('cgmeethub-dashboard') || document.getElementById('meetgita-dashboard');

    if (nativeContainer) {
      nativeContainer.dataset.cgmeethubNativeHidden = "true";
      if (nativeContainer.style.display !== 'none') {
        logDebug('HIDE_NATIVE', `Applying display: none !important to native container: <${nativeContainer.tagName}>`, {
          snippet: nativeContainer.outerHTML.slice(0, 100)
        });
        nativeContainer.style.setProperty('display', 'none', 'important');
        nativeContainer.classList.add('cgmeethub-hidden-native');
        nativeContainer.classList.add('meetgita-hidden-native');
      }

      if (
        isDashboardHealthy() &&
        existingDashboard &&
        existingDashboard.parentElement === nativeContainer.parentElement &&
        existingDashboard.nextElementSibling === nativeContainer
      ) {
        logDebug('INJECT_CYCLE', 'Dashboard already healthy, correctly placed before nativeContainer. No action needed.');
        return;
      }
    } else {
      if (isDashboardHealthy()) {
        logDebug('INJECT_CYCLE', 'Native container not found, but dashboard is healthy and in DOM. No action needed.');
        return;
      }
    }

    if (!nativeContainer || !nativeContainer.parentElement) {
      logDebug('INJECT_CYCLE', 'Cannot inject: nativeContainer or parentElement is null.', {
        nativeContainerExists: !!nativeContainer,
        parentExists: !!(nativeContainer && nativeContainer.parentElement)
      });
      return;
    }

    if (!canProceedWithInjection()) {
      return;
    }

    isInjecting = true;
    logDebug('DASHBOARD_LIFECYCLE', 'Starting DOM write: creating and inserting dashboard...');

    try {
      if (existingDashboard) {
        logDebug('DASHBOARD_LIFECYCLE', 'Removing stale existingDashboard before inserting fresh one');
        if (MEETGITA_DEBUG) console.trace('[MeetGita-Diag] Stack trace for existingDashboard.remove():');
        existingDashboard.remove();
      }

      const dashboard = createDashboardElement();
      nativeContainer.parentElement.insertBefore(dashboard, nativeContainer);
      logDebug('DASHBOARD_LIFECYCLE', 'Dashboard successfully inserted before nativeContainer in parent <' + nativeContainer.parentElement.tagName + '>');
    } catch (err) {
      console.error('[MeetGita-Diag] Injection exception:', err);
    } finally {
      setTimeout(() => {
        isInjecting = false;
        logDebug('INJECT_CYCLE', 'Mutex released (isInjecting = false)');
      }, 60);
    }
  }

  /* ==========================================================================
     7. Dev Recovery Helper
     ========================================================================== */

  window.__cgmeethubReset = window.__meetgitaReset = function () {
    logDebug('DEV_RESET', 'Manual developer reset invoked.');
    isHaltedDueToLoop = false;
    injectionTimestamps.length = 0;

    document.querySelectorAll('[data-cgmeethub-native-hidden="true"], .cgmeethub-hidden-native, .meetgita-hidden-native').forEach(el => {
      el.style.display = '';
      delete el.dataset.cgmeethubNativeHidden;
      el.classList.remove('cgmeethub-hidden-native', 'meetgita-hidden-native');
    });

    const dashboard = document.getElementById('cgmeethub-dashboard') || document.getElementById('meetgita-dashboard');
    if (dashboard) dashboard.remove();

    console.log('[MeetGita-Diag] Reset complete. Native Meet UI restored.');
  };

  /* ==========================================================================
     8. Persistent Observer & Global Event Diagnostics
     ========================================================================== */

  function setupPersistentObserver() {
    if (observer) {
      observer.disconnect();
    }

    let debounceTimer = null;
    observer = new MutationObserver((mutationsList) => {
      mutationCount++;
      const added = [];
      const removed = [];
      let attrChanges = 0;

      for (const m of mutationsList) {
        if (m.type === 'childList') {
          for (const node of m.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) added.push(`<${node.tagName.toLowerCase()}>`);
          }
          for (const node of m.removedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) removed.push(`<${node.tagName.toLowerCase()}>`);
          }
        } else if (m.type === 'attributes') {
          attrChanges++;
        }
      }

      logDebug('MUTATION_OBSERVER', `Batch #${mutationCount}: ${mutationsList.length} mutations (added: [${added.slice(0, 5).join(', ')}], removed: [${removed.slice(0, 5).join(', ')}], attrs: ${attrChanges})`);

      if (isInjecting || isHaltedDueToLoop) {
        logDebug('MUTATION_OBSERVER', `Ignored batch #${mutationCount}: isInjecting=${isInjecting}, isHaltedDueToLoop=${isHaltedDueToLoop}`);
        return;
      }

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        tryInjectDashboard(`mutation-debounce-#${mutationCount}`);
      }, 80);
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden']
    });

    logDebug('OBSERVER_INIT', 'Persistent MutationObserver actively observing document');
  }

  // Window/Document Scroll Listeners
  window.addEventListener('scroll', () => {
    logDebug('SCROLL_WINDOW', `Window scroll event: scrollY=${window.scrollY}, scrollX=${window.scrollX}, docHeight=${document.documentElement.scrollHeight}`);
  }, { passive: true });

  document.addEventListener('scroll', (e) => {
    if (e.target !== window && e.target !== document) {
      const tag = e.target.tagName ? e.target.tagName.toLowerCase() : 'unknown';
      const id = e.target.id ? `#${e.target.id}` : '';
      const cls = e.target.className ? `.${String(e.target.className).slice(0, 30)}` : '';
      logDebug('SCROLL_ELEMENT', `Element scroll event on <${tag}${id}${cls}>: scrollTop=${e.target.scrollTop}`);
    }
  }, { passive: true, capture: true });

  // Tab visibility
  document.addEventListener('visibilitychange', () => {
    logDebug('VISIBILITY_CHANGE', `visibilityState changed to: ${document.visibilityState}`);
    if (!document.hidden && !isHaltedDueToLoop) {
      tryInjectDashboard('visibilitychange');
    }
  });

  window.addEventListener('focus', () => {
    logDebug('WINDOW_FOCUS', 'Window received focus event');
    if (!isHaltedDueToLoop) {
      tryInjectDashboard('window-focus');
    }
  });

  window.addEventListener('blur', () => {
    logDebug('WINDOW_BLUR', 'Window blur event');
  });

  // SPA navigation
  window.addEventListener('popstate', () => {
    logDebug('SPA_NAV', 'popstate event');
    tryInjectDashboard('popstate');
  });

  const origPushState = history.pushState;
  history.pushState = function () {
    logDebug('SPA_NAV', 'history.pushState called with: ' + arguments[2]);
    origPushState.apply(this, arguments);
    setTimeout(() => tryInjectDashboard('pushState'), 80);
  };

  const origReplaceState = history.replaceState;
  history.replaceState = function () {
    logDebug('SPA_NAV', 'history.replaceState called with: ' + arguments[2]);
    origReplaceState.apply(this, arguments);
    setTimeout(() => tryInjectDashboard('replaceState'), 80);
  };

  // Intercept fetch & XHR to diagnose Meet background network calls during scroll
  const origFetch = window.fetch;
  window.fetch = function () {
    const url = arguments[0] ? (typeof arguments[0] === 'string' ? arguments[0] : arguments[0].url) : 'unknown';
    logDebug('NETWORK_FETCH', `fetch() called for URL: ${url}`);
    return origFetch.apply(this, arguments);
  };

  // Initial boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      logDebug('DOM_READY', 'DOMContentLoaded fired');
      tryInjectDashboard('DOMContentLoaded');
      setupPersistentObserver();
    });
  } else {
    logDebug('DOM_READY', 'Document already ready at script execution time');
    tryInjectDashboard('immediate-boot');
    setupPersistentObserver();
  }

})();
