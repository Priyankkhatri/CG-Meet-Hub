/**
 * CG Meet Hub - Google Meet Class Schedule Content Script
 * 
 * Multi-Session Card Architecture & Material Visual Design:
 * 1. Single Source of Truth: CG_MEET_HUB_CLASSES groups sessions per teacher+subject.
 * 2. Generic Multi-Session Cards: Handles 1, 2, or N sessions per card dynamically.
 * 3. Material Design 3 Palette: Dynamic per-teacher avatar colors & left-accent styling.
 * 4. Scoped Live Indicators: Live badge attached to the specific active session row.
 * 5. Robust Ingress: Injects into stable parent (div.u88fae) alongside native agenda container.
 * 6. Idempotent Lifecycle: Does not thrash DOM on background Google Meet reconciliations.
 */

(function () {
  'use strict';

  // Prevent multiple script initialization
  if (window.__cgmeethub_initialized) return;
  window.__cgmeethub_initialized = true;

  /* ==========================================================================
     1. Class Schedule Dataset (Grouped by Teacher & Subject)
     ========================================================================== */
  const CG_MEET_HUB_CLASSES = [
    {
      id: "react",
      subjectCode: "CS-301",
      subject: "React.js Development",
      teacher: "Rajesh Ranjan Sir",
      teacherInitials: "RR",
      department: "Computer Science & Engineering",
      sessions: [
        {
          label: "Before Break",
          link: "https://meet.google.com/zkb-hdxv-aba",
          startTime: "09:00 AM",
          endTime: "10:30 AM",
          status: "upcoming",
        },
        {
          label: "After Break",
          link: "https://meet.google.com/hwu-yqkb-zyi",
          startTime: "11:00 AM",
          endTime: "12:30 PM",
          status: "upcoming",
        },
      ],
    },
    {
      id: "dbms",
      subjectCode: "CS-205",
      subject: "Database Management Systems",
      teacher: "Adil Sir",
      teacherInitials: "AS",
      department: "Information Technology",
      sessions: [
        {
          label: "Before Break",
          link: "https://meet.google.com/mqs-fenu-wkc",
          startTime: "09:00 AM",
          endTime: "10:30 AM",
          status: "upcoming",
        },
        {
          label: "After Break",
          link: "https://meet.google.com/mfy-tqua-keb",
          startTime: "11:00 AM",
          endTime: "12:30 PM",
          status: "upcoming",
        },
      ],
    },
    {
      id: "nextjs",
      subjectCode: "CS-310",
      subject: "Next.js Development",
      teacher: "Next.js Sir",
      teacherInitials: "NJ",
      department: "Computer Science & Engineering",
      sessions: [
        {
          label: "Full Session",
          link: "https://meet.google.com/xhb-ghvy-oys",
          startTime: "01:00 PM",
          endTime: "02:30 PM",
          status: "upcoming",
        },
      ],
    },
    {
      id: "dsa",
      subjectCode: "CS-201",
      subject: "Data Structures & Algorithms",
      teacher: "Samir Sir",
      teacherInitials: "SS",
      department: "Computer Science & Engineering",
      sessions: [
        {
          label: "Full Session",
          link: "https://meet.google.com/onx-qzxa-sao",
          startTime: "02:45 PM",
          endTime: "04:15 PM",
          status: "upcoming",
        },
      ],
    },
    {
      id: "neel",
      subjectCode: "GEN-000",
      subject: "General Session",
      teacher: "Neel Sir",
      teacherInitials: "NS",
      department: "Computer Science & Engineering",
      sessions: [
        {
          label: "Full Session",
          link: "https://meet.google.com/baj-jazt-nit",
          startTime: "04:30 PM",
          endTime: "05:30 PM",
          status: "upcoming",
        },
      ],
    },
    {
      id: "sumit",
      subjectCode: "GEN-001",
      subject: "Subject TBD",
      teacher: "Sumit Sir",
      teacherInitials: "SM",
      department: "Computer Science & Engineering",
      sessions: [
        {
          label: "Full Session",
          link: "https://meet.google.com/uhk-yvok-tqy",
          startTime: "05:45 PM",
          endTime: "06:45 PM",
          status: "upcoming",
        },
      ],
    },
    {
      id: "mongodb",
      subjectCode: "CS-220",
      subject: "MongoDB",
      teacher: "Yogesh Sir",
      teacherInitials: "YS",
      department: "Computer Science & Engineering",
      sessions: [
        {
          label: "Full Session",
          link: "https://meet.google.com/odt-xfzb-emm",
          startTime: "07:00 PM",
          endTime: "08:00 PM",
          status: "upcoming",
        },
      ],
    },
  ];
  const MEETGITA_CLASSES = CG_MEET_HUB_CLASSES;

  /* ==========================================================================
     2. Per-Teacher Material Palette Configuration
     ========================================================================== */
  const TEACHER_THEMES = {
    "RR": { primary: "#2563eb", bg: "#eff6ff", accent: "#3b82f6", rgb: "37, 99, 235", gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" }, // React.js - Modern Electric Blue
    "AS": { primary: "#059669", bg: "#ecfdf5", accent: "#10b981", rgb: "5, 150, 105", gradient: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }, // DBMS - Emerald Green
    "NJ": { primary: "#7c3aed", bg: "#f5f3ff", accent: "#8b5cf6", rgb: "124, 58, 237", gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" }, // Next.js - Vivid Violet
    "SS": { primary: "#d97706", bg: "#fffbeb", accent: "#f59e0b", rgb: "217, 119, 6", gradient: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)" }, // DSA - Amber Flame
    "NS": { primary: "#0891b2", bg: "#ecfeff", accent: "#06b6d4", rgb: "8, 145, 178", gradient: "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)" }, // General - Cyan Teal
    "SM": { primary: "#e11d48", bg: "#fff1f2", accent: "#f43f5e", rgb: "225, 29, 72", gradient: "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)" }, // Subject TBD - Rose Ruby
    "YS": { primary: "#15803d", bg: "#f0fdf4", accent: "#22c55e", rgb: "21, 128, 61", gradient: "linear-gradient(135deg, #22c55e 0%, #166534 100%)" }, // MongoDB - Vibrant Forest
  };
  const DEFAULT_THEME = { primary: "#2563eb", bg: "#eff6ff", accent: "#3b82f6", rgb: "37, 99, 235", gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" };

  /* ==========================================================================
     3. Helper Functions & SVG Icons
     ========================================================================== */
  function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [time, meridian] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  function computeSessionStatus(session, now = new Date()) {
    if (!session.startTime || !session.endTime) return session.status || "upcoming";
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const start = parseTimeToMinutes(session.startTime);
    const end = parseTimeToMinutes(session.endTime);
    if (nowMinutes >= start && nowMinutes <= end) return "live";
    if (nowMinutes < start) return "upcoming";
    return "completed";
  }

  const ICONS = {
    codingGitaLogo: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="18" r="1.6" fill="#f8b721"/>
      <rect x="17" y="14" width="66" height="49" rx="4.5" stroke="#f8b721" stroke-width="4.5"/>
      <path d="M9 66h82c1.5 0 2.5 1 2.5 2.2v0.6c0 1.2-1 2.2-2.5 2.2H9c-1.5 0-2.5-1-2.5-2.2v-0.6C6.5 67 7.5 66 9 66z" fill="#f8b721"/>
      <path d="M29 30.5v25.5c2.5-2 5.2-3.4 8.5-4v-25.5c-3.3 0.6-6 2-8.5 4z" fill="#f8b721"/>
      <path d="M48 26.5c-6.8-2.8-13.8-2.2-19 1.5v28c5.2-3.7 12.2-4.3 19-1.5v-28z" fill="#f8b721"/>
      <path d="M52 26.5c6.8-2.8 13.8-2.2 19 1.5v28c-5.2-3.7-12.2-4.3-19-1.5v-28z" fill="#f8b721"/>
      <path d="M71 30.5v25.5c-2.5-2-5.2-3.4-8.5-4v-25.5c3.3 0.6 6 2 8.5 4z" fill="#f8b721"/>
    </svg>`,
    codingGitaWatermark: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="17" r="2.8" fill="#4a154b"/>
      <rect x="14" y="11" width="72" height="52" rx="6" stroke="#4a154b" stroke-width="5.5"/>
      <path d="M6 63h88c2 0 3.5 1.2 3.5 2.6v1c0 1.4-1.5 2.6-3.5 2.6H6c-2 0-3.5-1.2-3.5-2.6v-1C2.5 64.2 4 63 6 63z" fill="#4a154b"/>
      <path d="M26 28v28c3.2-2.2 6.6-3.8 10.5-4.4V24c-3.9 0.6-7.3 2.2-10.5 4z" fill="#4a154b"/>
      <path d="M48 24c-8.5-3.2-17-2.6-23.5 1.6v31c6.5-4.2 15-4.8 23.5-1.6V24z" fill="#4a154b"/>
      <path d="M52 24c8.5-3.2 17-2.6 23.5 1.6v31c-6.5-4.2-15-4.8-23.5-1.6V24z" fill="#4a154b"/>
      <path d="M74 28v28c-3.2-2.2-6.6-3.8-10.5-4.4V24c3.9 0.6 7.3 2.2 10.5 4z" fill="#4a154b"/>
      <text x="50" y="86" text-anchor="middle" font-family="'Plus Jakarta Sans', 'Google Sans', Roboto, sans-serif" font-size="14.5" font-weight="800" fill="#4a154b" letter-spacing="0.8">CodingGita</text>
    </svg>`,
    videoCam: `<svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`,
    copy: `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
    calendarEmpty: `<svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>`
  };

  /* ==========================================================================
     4. State & Controls
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
    const marked = document.querySelector('[data-cgmeethub-native-hidden="true"]');
    if (marked && document.body.contains(marked) && marked.parentElement) {
      return {
        hideTarget: marked,
        parent: marked.parentElement,
        insertRef: marked
      };
    }

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

          const emptyCard = textElem.closest('.VBauye') ||
                            (textElem.closest('.NuUMIe') ? textElem.closest('.NuUMIe').parentElement : null) ||
                            textElem.closest('div[jscontroller]') ||
                            textElem.closest('div[role="region"]');

          if (emptyCard && emptyCard !== document.body && emptyCard.parentElement) {
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
     6. Card & Dashboard Rendering (Multi-Session & Palette Redesign)
     ========================================================================== */

  function renderCard(cls) {
    const initials = cls.teacherInitials || getInitials(cls.teacher);
    const hasLiveSession = cls.sessions && cls.sessions.some(s => s.status === 'live');

    const card = document.createElement('div');
    card.className = `mg-card ${hasLiveSession ? 'is-live-card' : ''}`;

    // Interactive Liquid Glass cursor spotlight reflection (inspired by archisvaze/liquid-glass)
    const glare = document.createElement('div');
    glare.className = 'mg-card-glare';
    card.appendChild(glare);

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateX = ((y / rect.height) - 0.5) * -4;
      const rotateY = ((x / rect.width) - 0.5) * 4;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
      card.style.setProperty('--card-rotate-x', `${rotateX.toFixed(2)}deg`);
      card.style.setProperty('--card-rotate-y', `${rotateY.toFixed(2)}deg`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.removeProperty('--card-rotate-x');
      card.style.removeProperty('--card-rotate-y');
      card.style.removeProperty('--mouse-x');
      card.style.removeProperty('--mouse-y');
    });

    // Build session rows dynamically and generically
    const sessionRowsHtml = (cls.sessions || []).map((session, idx) => {
      const meetCode = extractMeetCode(session.link);
      const isLive = session.status === 'live';
      const liveBadge = isLive
        ? `<span class="mg-session-live-badge"><span class="mg-pulsing-dot"></span> LIVE</span>`
        : '';

      return `
        <div class="mg-session-row ${isLive ? 'is-live-row' : ''}">
          <div class="mg-session-left">
            <span class="mg-session-label">${session.label || `Session ${idx + 1}`}</span>
            ${liveBadge}
            <span class="mg-session-link-preview" title="${session.link}">
              <svg class="mg-link-icon" viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
              meet.google.com/${meetCode}
            </span>
          </div>
          <div class="mg-session-actions">
            <button type="button" class="mg-btn-icon" data-link="${session.link}" data-tooltip="Copy meeting link" aria-label="Copy meeting link">
              ${ICONS.copy}
            </button>
            <a href="${session.link}" class="mg-btn-join" target="_blank" rel="noopener noreferrer">
              ${ICONS.videoCam}
              <span>Join</span>
            </a>
          </div>
        </div>
      `;
    }).join('');

    card.innerHTML += `
      <div class="mg-card-header">
        <div class="mg-card-header-left">
          <div class="mg-avatar">
            ${initials}
          </div>
          <div class="mg-header-info">
            <h3 class="mg-subject-title" title="${cls.subject}">${cls.subject}</h3>
            <div class="mg-teacher-meta">
              <span class="mg-teacher-name">${cls.teacher}</span>
              <span class="mg-meta-dot">·</span>
              <span class="mg-teacher-dept">${cls.department || 'CodingGita'}</span>
            </div>
          </div>
        </div>
        <div class="mg-card-header-right">
          <span class="mg-subject-code">${cls.subjectCode || 'CLASS'}</span>
        </div>
      </div>
      <div class="mg-sessions-list">
        ${sessionRowsHtml}
      </div>
    `;

    // Bind copy link buttons
    card.querySelectorAll('.mg-btn-icon').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const link = btn.getAttribute('data-link');
        if (link) copyMeetLink(link, btn);
      });
    });

    return card;
  }

  function renderCards(dashboard) {
    const container = dashboard.querySelector('.mg-cards-grid');
    if (!container) return;

    container.innerHTML = '';

    const filtered = CG_MEET_HUB_CLASSES.filter(item => {
      if (activeFilter === 'live') return item.sessions && item.sessions.some(s => s.status === 'live');
      if (activeFilter === 'upcoming') return item.sessions && item.sessions.some(s => s.status === 'upcoming');
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

    // Centered CodingGita watermark background visible behind cards
    const watermark = document.createElement('div');
    watermark.className = 'mg-watermark';
    watermark.setAttribute('aria-hidden', 'true');
    watermark.innerHTML = ICONS.codingGitaWatermark;
    dashboard.appendChild(watermark);

    const liveCount = CG_MEET_HUB_CLASSES.filter(c => c.sessions && c.sessions.some(s => s.status === 'live')).length;
    const upcomingCount = CG_MEET_HUB_CLASSES.filter(c => c.sessions && c.sessions.some(s => s.status === 'upcoming')).length;

    const header = document.createElement('div');
    header.className = 'mg-header';
    header.innerHTML = `
      <div class="mg-header-top">
        <div class="mg-header-left">
          <div class="mg-brand-badge">
            <div class="mg-logo-icon" title="CodingGita">
              ${ICONS.codingGitaLogo}
            </div>
          </div>
          <div class="mg-title-lockup">
            <div class="mg-title-row">
              <h2 class="mg-title">CG Meet Hub</h2>
              <span class="mg-brand-tag">CodingGita</span>
            </div>
            <span class="mg-subtitle">Live Class Schedule & Direct Access</span>
          </div>
        </div>
        <div class="mg-header-right">
          ${
            liveCount > 0
              ? `<div class="mg-live-counter">
                  <span class="mg-pulsing-dot"></span>
                  <span>${liveCount} Live Now</span>
                </div>`
              : `<div class="mg-ready-badge">
                  <span class="mg-ready-dot"></span>
                  <span>${CG_MEET_HUB_CLASSES.length} Classes Today</span>
                </div>`
          }
        </div>
      </div>
      <div class="mg-filters-wrapper">
        <div class="mg-filters">
          <button type="button" class="mg-filter-chip ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">
            <svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
            <span>All Classes</span>
            <span class="mg-chip-count">${CG_MEET_HUB_CLASSES.length}</span>
          </button>
          <button type="button" class="mg-filter-chip ${activeFilter === 'live' ? 'active' : ''}" data-filter="live">
            <span class="mg-filter-live-dot"></span>
            <span>Live Now</span>
            <span class="mg-chip-count">${liveCount}</span>
          </button>
          <button type="button" class="mg-filter-chip ${activeFilter === 'upcoming' ? 'active' : ''}" data-filter="upcoming">
            <svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            <span>Upcoming</span>
            <span class="mg-chip-count">${upcomingCount}</span>
          </button>
        </div>
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

    if (containers && containers.hideTarget) {
      containers.hideTarget.dataset.cgmeethubNativeHidden = "true";
      if (containers.hideTarget.style.display !== 'none') {
        containers.hideTarget.style.setProperty('display', 'none', 'important');
        containers.hideTarget.classList.add('cgmeethub-hidden-native');
        containers.hideTarget.classList.add('meetgita-hidden-native');
      }
    }

    if (isDashboardHealthy(existingDashboard)) {
      return;
    }

    if (!containers || !containers.parent) {
      return;
    }

    isInjecting = true;

    try {
      if (existingDashboard) {
        existingDashboard.remove();
      }

      const dashboard = createDashboardElement();
      containers.parent.insertBefore(dashboard, containers.insertRef);
      console.log('[CG Meet Hub] Injected multi-session class schedule dashboard into stable container.');
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      tryInjectDashboard();
      setupPersistentObserver();
    });
  } else {
    tryInjectDashboard();
    setupPersistentObserver();
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      tryInjectDashboard();
    }
  });

  window.addEventListener('focus', () => {
    tryInjectDashboard();
  });

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
