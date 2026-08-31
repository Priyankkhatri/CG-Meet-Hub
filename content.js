/**
 * MeetGita - Google Meet Class Schedule Dashboard Content Script
 * Seamlessly replaces the native empty state container in the normal DOM flow.
 */

(function () {
  'use strict';

  if (window.__meetgita_injected) return;
  window.__meetgita_injected = true;

  /* ==========================================================================
     1. Mock Class Schedule Data
     ========================================================================== */
  const CLASS_SCHEDULE = [
    {
      id: 'cls-101',
      subject: 'Advanced Data Structures & Algorithms',
      code: 'CS-301',
      teacherName: 'Prof. Rajesh Sharma',
      department: 'Computer Science & Engineering',
      time: '09:00 AM - 10:30 AM',
      status: 'live', // 'live' | 'upcoming'
      meetCode: 'dsa-core-live',
      meetLink: 'https://meet.google.com/dsa-core-live'
    },
    {
      id: 'cls-102',
      subject: 'Electromagnetic Field Theory & Wave Optics',
      code: 'PH-204',
      teacherName: 'Dr. Ananya Sen',
      department: 'Department of Applied Physics',
      time: '10:45 AM - 12:15 PM',
      status: 'live',
      meetCode: 'phy-wave-opt',
      meetLink: 'https://meet.google.com/phy-wave-opt'
    },
    {
      id: 'cls-103',
      subject: 'Machine Learning & Neural Architectures',
      code: 'AI-402',
      teacherName: 'Prof. Vikram Aditya',
      department: 'AI & Data Science',
      time: '02:00 PM - 03:30 PM',
      status: 'upcoming',
      meetCode: 'ml-deep-net',
      meetLink: 'https://meet.google.com/ml-deep-net'
    },
    {
      id: 'cls-104',
      subject: 'Database Systems & Cloud Optimization',
      code: 'CS-205',
      teacherName: 'Dr. Sneha Patil',
      department: 'Information Technology',
      time: '04:00 PM - 05:30 PM',
      status: 'upcoming',
      meetCode: 'dbms-cld-opt',
      meetLink: 'https://meet.google.com/dbms-cld-opt'
    }
  ];

  /* ==========================================================================
     2. SVG Icons (Google Material Design)
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
     3. State Management
     ========================================================================== */
  let activeFilter = 'all';
  let injectionInProgress = false;

  /* ==========================================================================
     4. Helper Functions
     ========================================================================== */

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
    }, 2400);
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
     5. Dashboard DOM Builder (Inline Flow)
     ========================================================================== */

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

    // 2-Column Cards Grid Container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'mg-cards-grid';
    dashboard.appendChild(cardsContainer);

    renderCards(dashboard);

    return dashboard;
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

      container.appendChild(card);
    });
  }

  /* ==========================================================================
     6. Strict DOM Replacement & Inline Injection
     ========================================================================== */

  /**
   * Locate the specific container holding the empty state / illustration
   */
  function findNativeEmptyStateContainer() {
    // 1. Check for elements with explicit empty state text
    const textNodes = document.querySelectorAll('h2, h3, div, span, p');
    for (const el of textNodes) {
      const text = (el.textContent || '').trim();
      if (
        text.includes('No meetings scheduled for today') ||
        text.includes('No meetings scheduled') ||
        text.includes('Get a link you can share') ||
        text.includes('Plan ahead') ||
        text.includes('Your meeting is safe')
      ) {
        // Traverse up to find the top container card of this right column section
        let parent = el.parentElement;
        for (let i = 0; i < 6 && parent; i++) {
          if (
            parent.getAttribute('role') === 'region' ||
            parent.classList.contains('g3VIeb') ||
            (parent.tagName === 'DIV' && parent.parentElement && parent.parentElement.children.length >= 2)
          ) {
            return parent;
          }
          parent = parent.parentElement;
        }
        return el.closest('div[role="region"]') || el.parentElement;
      }
    }

    // 2. Check for carousel/region selectors
    const carouselCandidates = [
      'div[role="region"][aria-label*="carousel" i]',
      'div[role="region"]',
      'div[data-carousel-item]',
      'c-wiz div[jscontroller] > div:has(img[src*="googleusercontent"])',
      'div:has(> div > img[src*="googleusercontent"])',
      'div:has(> button[aria-label*="Next slide" i])'
    ];

    for (const sel of carouselCandidates) {
      try {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) {
          return el;
        }
      } catch (_) {}
    }

    // 3. Fallback: Right-side column sibling in the landing layout
    const mainCols = document.querySelectorAll('c-wiz, main, div[role="main"], div[jscontroller]');
    for (const container of mainCols) {
      const directChildren = Array.from(container.children).filter(c => c.tagName === 'DIV');
      if (directChildren.length >= 2) {
        const hasMeetingControls = directChildren[0].querySelector('button, input[placeholder*="code" i], input[aria-label*="code" i]');
        if (hasMeetingControls && directChildren[1]) {
          return directChildren[1];
        }
      }
    }

    return null;
  }

  /**
   * Main Inline Injection Routine
   */
  function tryInjectDashboard() {
    if (!isMeetHomePage()) {
      const existing = document.getElementById('meetgita-dashboard');
      if (existing) existing.remove();
      return;
    }

    // If dashboard already exists in document, ensure native remains hidden
    const existingDashboard = document.getElementById('meetgita-dashboard');
    const target = findNativeEmptyStateContainer();

    if (target) {
      // Strictly hide native container with display: none !important
      target.classList.add('meetgita-hidden-native');
      target.style.setProperty('display', 'none', 'important');
    }

    if (existingDashboard) {
      return; // Already present in DOM flow
    }

    if (injectionInProgress) return;
    injectionInProgress = true;

    try {
      if (target && target.parentElement) {
        const dashboard = createDashboardElement();

        // Inject cleanly into natural DOM flow right before the hidden native container
        target.parentElement.insertBefore(dashboard, target);
        console.log('[MeetGita] Injected cleanly into inline document flow.');
      }
    } catch (err) {
      console.error('[MeetGita] Injection error:', err);
    } finally {
      injectionInProgress = false;
    }
  }

  /* ==========================================================================
     7. Robust Observer & SPA Lifecycle
     ========================================================================== */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInjectDashboard);
  } else {
    tryInjectDashboard();
  }

  let debounceTimeout = null;
  const observer = new MutationObserver(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(tryInjectDashboard, 120);
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true
  });

  window.addEventListener('popstate', tryInjectDashboard);

  const originalPush = history.pushState;
  history.pushState = function () {
    originalPush.apply(this, arguments);
    setTimeout(tryInjectDashboard, 100);
  };

  const originalReplace = history.replaceState;
  history.replaceState = function () {
    originalReplace.apply(this, arguments);
    setTimeout(tryInjectDashboard, 100);
  };

})();
