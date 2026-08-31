# CG Meet Hub - Google Meet Class Schedule Chrome Extension

**CG Meet Hub** is a Manifest V3 Chrome Extension that injects a native Google Material Design 3 class schedule dashboard directly into the Google Meet homepage (`https://meet.google.com/`), seamlessly replacing the empty state carousel with an interactive class timetable.

---

## 🚀 Features

- **Google Material Design 3 (M3) UI**: Matches Google Meet's native light and dark modes, typography (`Google Sans`, `Google Sans Text`, `Roboto`), borders, elevation, and color palettes.
- **Dynamic Class Cards**: Displays subject code, title, instructor name, department, live status badge with pulsing animation, and time slots.
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