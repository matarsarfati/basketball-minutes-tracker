# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Basketball Team Management System** built with React that includes multiple modules:
- **Minutes Tracker**: Real-time game time tracking and player rotation management
- **Schedule Planner**: Team schedule management with practice sessions, games, and events
- **Practice Live**: Live practice session tracking with RPE (Rate of Perceived Exertion) monitoring
- **Wellness Surveys**: Daily player wellness tracking (sleep, fatigue, soreness)
- **Gym Module**: Exercise library and workout plan builder with image management

The application uses Firebase/Firestore for backend storage and supports offline capabilities with local caching.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm start

# Run tests
npm test

# Build for production
npm build
```

## Architecture

### Routing Structure
The app uses `react-router-dom` v7 with `createBrowserRouter`. Main routes defined in `src/index.js`:
- `/` - Minutes Tracker (main game rotation tracker)
- `/schedule` - Schedule Planner
- `/practice/:sessionId` - Live Practice Session
- `/survey/:sessionId` - RPE Survey (post-practice)
- `/gym-survey/:sessionId` - Gym Session Survey
- `/wellness` - Wellness Dashboard
- `/wellness/survey` - Daily Wellness Form
- `/gym` - Gym Page (exercise library and plans)

### Service Layer Pattern
All Firebase/data operations are abstracted into service modules in `src/services/`:
- `scheduleService.js` - Schedule CRUD operations
- `practiceDataService.js` - Practice session data management
- `wellnessService.js` - Wellness check data
- `rosterService.js` - Team roster management
- `planService.js` - Gym workout plans
- `exerciseService.js` - Exercise library management
- `firestoreService.js` - Core Firestore utilities

**When implementing new features**: Always use or extend these services rather than accessing Firebase directly in components.

### Firebase Configuration
Firebase config is in `src/config/firebase.js`. The app uses:
- Firestore with memory cache (not persistent IndexedDB)
- Firebase Storage for exercise images
- Collections: `schedule`, `wellness`, `roster`, `exercises`, `muscle-groups`, `plans`

### State Management Patterns
This codebase uses **local component state** with `useState` and `useEffect` - there is no global state management library (Redux/Context).

Common patterns:
- Local storage for offline-first data (keys like `teamScheduleV2`, `teamRosterV1`)
- Firestore for server-side persistence
- Dual storage: many features save to both localStorage (immediate) and Firestore (sync)

### PDF Generation
PDF exports use:
- `jspdf` + `jspdf-autotable` for tabular reports
- `html2canvas` for capturing visual snapshots
- Custom PDF generator in `src/pdfGenerator.js` for practice reports

### Styling Approach
- **Tailwind CSS** configured for utility classes (see `tailwind.config.js`)
- Inline styles used heavily throughout (legacy pattern)
- Custom CSS files for specific modules (e.g., `src/SurveyForm.css`, `src/styles.css`)
- Hebrew font support via `@fontsource/heebo`

### Key Data Models

**Player Object** (Minutes Tracker):
```javascript
{
  id: number,
  name: string,
  number: number,
  isPlaying: boolean,
  totalMinutes: number,
  currentSessionStart: number,
  currentRestTime: number,
  hasEverPlayed: boolean,
  playingSessions: Array<{start, end, quarter, isActive}>,
  showRestTime: boolean
}
```

**Schedule Event**:
```javascript
{
  id: string,
  firebaseId: string,
  date: string,
  type: 'Practice'|'Game'|'DayOff'|'SplitPractice'|'Meeting'|'Recovery'|'Travel',
  slot: 'AM'|'PM',
  title: string,
  location: string,
  notes: string,
  parts: Array<{title, duration, description}>
}
```

**Wellness Check**:
```javascript
{
  date: string (YYYY-MM-DD),
  responses: {
    [playerName]: {
      sleep: number (1-10),
      fatigue: number (1-10),
      soreness: number (1-10),
      physioNotes: string,
      timestamp: serverTimestamp
    }
  },
  averages: {sleep, fatigue, soreness},
  completedCount: number
}
```

## Important Implementation Notes

### Time Management in Minutes Tracker
- Game time counts DOWN from 2400 seconds (40 minutes)
- Quarter length is 600 seconds (10 minutes)
- Uses real-time intervals for rest time tracking (separate from game clock)
- Speed multiplier (1x, 2x, 4x) affects both game clock and rest timers

### Practice Sessions
- RPE data collected post-practice via surveys
- Survey responses stored with player name as key
- Averages calculated automatically when surveys submitted
- Practice sessions linked to schedule via `sessionId`

### Gym Module Specifics
- Exercise categories called "muscle groups" with configurable row counts
- Drag-and-drop for exercise reordering
- Image uploads stored in Firebase Storage with compression via `src/utils/imageCompression.js`
- Plans can be minimized/maximized and positioned on screen
- Merge images feature combines multiple exercise images into single PDF

### Wellness Data Collection
- One document per day in `wellness` collection
- Document ID is the date (YYYY-MM-DD format)
- Each player submits once per day
- Averages auto-calculated across all responses

## Testing Notes

The project uses Jest and React Testing Library (configured via `react-scripts`). Test files follow the pattern `*.test.js` (e.g., `App.test.js`).

## Firebase Security
The Firebase config includes production API keys. These are safe to commit for client-side apps but ensure Firestore security rules are properly configured in the Firebase console.

## Language and Localization
Code comments and some UI text include Hebrew. The app uses Heebo font for Hebrew text rendering.
