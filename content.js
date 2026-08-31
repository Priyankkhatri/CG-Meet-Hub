/**
 * MeetGita - Google Meet Class Schedule Dashboard Content Script
 * Uses TreeWalker / XPath text detection to strictly replace the native empty state block.
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
      status: 'live',
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
     5. Foolproof DOM Traversal via TreeWalker & XPath
     ========================================================================== */

  /**
   * Search for text node containing 'No meetings scheduled for today' or carousel text
   * using TreeWalker and traverse up to the wrapper block holding illustration + text.
   */
  function findNativeEmptyStateWrapper() {
    const targetPhrases = [
      'No meetings scheduled for today',
      'No meetings scheduled',
      'Get a link you can share',
      'Plan ahead',
      'Your meeting is safe'
    ];

    // Method 1: document.createTreeWalker for exact text node detection
    const walker = document.createTreeWalker(
      document.body || document.documentElement,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      const text = (node.nodeValue || '').trim();
      if (!text) continue;

      for (const phrase of targetPhrases) {
        if (text.toLowerCase().includes(phrase.toLowerCase())) {
          // Found target text node! Traverse upwards to find its main container block
          let el = node.parentElement;
          if (!el) continue;

          // Traverse upwards to find the wrapper block holding illustration and text
          // Stop at the column container level so we don't hide the whole page
          let current = el;
          let wrapper = el;
          for (let i = 0; i < 8 && current && current !== document.body; i++) {
            const tag = current.tagName.toLowerCase();
            // If the element has multiple children (e.g. illustration img/svg + text container + buttons)
            if (
              tag === 'div' ||
              current.getAttribute('role') === 'region' ||
              current.getAttribute('jscontroller')
            ) {
              wrapper = current;
              // Check if parent is a multi-column flex/grid container
              const parent = current.parentElement;
              if (parent && parent.children.length >= 2) {
                return current;
              }
            }
            current = current.parentElement;
          }
          return wrapper;
        }
      }
    }

    // Method 2: XPath fallback
    try {
      const xpathQuery = "//*[contains(text(), 'No meetings scheduled') or contains(text(), 'Get a link you can share')]";
      const result = document.evaluate(xpathQuery, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      if (result && result.singleNodeValue) {
        const found = result.singleNodeValue;
        let parent = found.closest('div');
        for (let i = 0; i < 4 && parent && parent.parentElement; i++) {
          if (parent.parentElement.children.length >= 2) {
            return parent;
          }
          parent = parent.parentElement;
        }
        return found.closest('div') || found;
      }
    } catch (_) {}

    return null;
  }

  /* ==========================================================================
     6. Dashboard DOM Builder (Native Light Material Design)
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

    // Responsive Cards Grid
    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'mg-cards-grid';
    dashboard.appendChild(cardsGrid);

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
     7. Precise Injection Routine
     ========================================================================== */

  function tryInjectDashboard() {
    if (!isMeetHomePage()) {
      const existing = document.getElementById('meetgita-dashboard');
      if (existing) existing.remove();
      return;
    }

    const wrapper = findNativeEmptyStateWrapper();

    if (wrapper) {
      // Hide the specific native empty state wrapper
      wrapper.classList.add('meetgita-hidden-native');
      wrapper.style.setProperty('display', 'none', 'important');

      // Check if dashboard already exists
      const existing = document.getElementById('meetgita-dashboard');
      if (!existing && !injectionInProgress && wrapper.parentElement) {
        injectionInProgress = true;
        try {
          const dashboard = createDashboardElement();
          // Inject exactly inside the parent of the hidden block
          wrapper.parentElement.insertBefore(dashboard, wrapper);
          console.log('[MeetGita] Successfully injected into parent of empty state wrapper.');
        } catch (err) {
          console.error('[MeetGita] Injection error:', err);
        } finally {
          injectionInProgress = false;
        }
      }
    }
  }

  /* ==========================================================================
     8. MutationObserver & SPA Lifecycle
     ========================================================================== */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInjectDashboard);
  } else {
    tryInjectDashboard();
  }

  let debounceTimeout = null;
  const observer = new MutationObserver(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(tryInjectDashboard, 100);
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
