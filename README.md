# CG Meet Hub - Google Meet Faculty Schedule Chrome Extension

**CG Meet Hub** is a Manifest V3 Chrome Extension that injects a native Google Material Design 3 faculty class schedule dashboard directly into the Google Meet homepage (`https://meet.google.com/`), seamlessly replacing the empty state illustration with an interactive timetable organized by teacher.

---

## 🚀 Features

- **Google Material Design 3 (M3) UI**: Matches Google Meet's native typography (`Google Sans`, `Google Sans Text`, `Roboto`), dynamic per-instructor color accents, and elevation tokens.
- **Teacher-Centric Schedule Cards**: Identifies sessions by Faculty Name with custom avatar squircle initials and direct access meeting codes.
- **One-Click Actions**:
  - 🎥 **Join Class**: Primary Google Blue pill button launching the meeting link directly.
  - 📋 **Copy Link**: Secondary icon button with clipboard copy and animated Google-style feedback toast.
- **Filter Tabs**: Filter by "All Classes", "Live Now", and "Upcoming".
- **Robust DOM Injection**: Persistent TreeWalker MutationObserver automatically detects Google Meet layout updates, SPA route transitions, tab switches, and gracefully ignores active meeting rooms (`/xxx-yyyy-zzz`).

---

## 🛠️ How to Install in Chrome / Edge / Brave

1. Open **Google Chrome** (or any Chromium browser).
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select this project directory (`d:\Migrated_Desktop_Projects\CG-Meet-Hub`).
6. Navigate to [https://meet.google.com/](https://meet.google.com/) or [https://meet.google.com/home](https://meet.google.com/home).
7. The **CG Meet Hub** class schedule dashboard will instantly replace the default empty state illustration!