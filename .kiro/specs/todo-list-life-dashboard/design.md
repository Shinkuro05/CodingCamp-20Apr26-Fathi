# Design Document: To-Do List Life Dashboard

## Overview

The To-Do List Life Dashboard is a client-side productivity application built with vanilla HTML, CSS, and JavaScript. The application provides an integrated workspace combining time awareness, focus management (Pomodoro timer), task tracking, and quick website access—all persisted locally using the browser's Local Storage API.

### Key Design Principles

1. **Zero Dependencies**: Pure vanilla JavaScript with no frameworks or libraries
2. **Client-Side Only**: All functionality runs in the browser without server requirements
3. **Local-First**: Data persists using Local Storage API (5-10MB capacity)
4. **Component-Based Architecture**: Modular design using JavaScript module pattern
5. **Performance-Focused**: Sub-second load times and sub-100ms UI responsiveness
6. **Standalone Deployment**: Functions as a local HTML file or simple web app

### Technical Constraints

- **No Frameworks**: Vanilla JavaScript only (no React, Vue, Angular, etc.)
- **Single File Architecture**: One CSS file (`css/dashboard.css`), one JavaScript file (`js/dashboard.js`)
- **Browser Support**: Chrome, Firefox, Edge, Safari (latest versions)
- **Storage**: Local Storage API only (no backend, no external APIs)
- **Performance Targets**: 
  - Initial load: < 1 second
  - UI feedback: < 100ms
  - Task list operations: < 100ms for up to 100 tasks

## Architecture

### High-Level Architecture

The application follows a component-based architecture where each major feature is encapsulated in a JavaScript module. Components communicate through a central event system and share a common storage layer.

```
┌─────────────────────────────────────────────────────────┐
│                     index.html                          │
│  (Main HTML structure, component containers)            │
└─────────────────────────────────────────────────────────┘
                          │
                          ├─────────────────────────────────┐
                          │                                 │
                          ▼                                 ▼
┌─────────────────────────────────────┐   ┌──────────────────────────────┐
│         css/dashboard.css           │   │      js/dashboard.js         │
│  (All styling, themes, responsive)  │   │  (All application logic)     │
└─────────────────────────────────────┘   └──────────────────────────────┘
                                                          │
                          ┌───────────────────────────────┼───────────────────────────────┐
                          │                               │                               │
                          ▼                               ▼                               ▼
              ┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
              │  StorageManager     │       │  EventBus           │       │  Component Modules  │
              │  (Local Storage)    │       │  (Pub/Sub)          │       │  - GreetingComponent│
              └─────────────────────┘       └─────────────────────┘       │  - FocusTimer       │
                                                                           │  - TaskList         │
                                                                           │  - QuickLinks       │
                                                                           │  - ThemeManager     │
                                                                           └─────────────────────┘
```

### Component Architecture

Each component follows the **Revealing Module Pattern** for encapsulation:

```javascript
const ComponentName = (function() {
  // Private state
  let privateState = {};
  
  // Private methods
  function privateMethod() { }
  
  // Public API
  return {
    init: function() { },
    publicMethod: function() { }
  };
})();
```

### Data Flow

1. **User Interaction** → Component handles event
2. **Component** → Updates internal state
3. **Component** → Calls StorageManager to persist data
4. **Component** → Updates DOM to reflect changes
5. **Component** → Optionally publishes event via EventBus
6. **Other Components** → Subscribe to relevant events and react

## Components and Interfaces

### 1. StorageManager

**Purpose**: Centralized interface for all Local Storage operations with error handling and JSON serialization.

**Public API**:
```javascript
StorageManager = {
  // Get item from storage
  get(key: string): any | null
  
  // Set item in storage (auto-serializes objects)
  set(key: string, value: any): boolean
  
  // Remove item from storage
  remove(key: string): boolean
  
  // Clear all storage
  clear(): boolean
  
  // Check if key exists
  has(key: string): boolean
}
```

**Storage Keys**:
- `tasks`: Array of task objects
- `links`: Array of link objects
- `theme`: String ('light' | 'dark')
- `userName`: String (custom user name)
- `timerDuration`: Number (minutes, 1-60)
- `taskSortOrder`: String ('creation' | 'alphabetical' | 'completion')

**Implementation Details**:
- Wraps `localStorage.getItem()` and `localStorage.setItem()`
- Automatically serializes/deserializes JSON
- Handles quota exceeded errors gracefully
- Returns `null` for missing keys
- Returns `false` on operation failures

### 2. EventBus

**Purpose**: Lightweight publish-subscribe system for component communication.

**Public API**:
```javascript
EventBus = {
  // Subscribe to event
  on(event: string, callback: function): void
  
  // Unsubscribe from event
  off(event: string, callback: function): void
  
  // Publish event with data
  emit(event: string, data: any): void
}
```

**Event Types**:
- `theme:changed` - Theme mode switched
- `task:created` - New task added
- `task:updated` - Task modified
- `task:deleted` - Task removed
- `timer:complete` - Pomodoro timer finished

### 3. GreetingComponent

**Purpose**: Displays current time, date, and personalized greeting based on time of day.

**DOM Structure**:
```html
<div id="greeting-section">
  <div id="time-display">HH:MM</div>
  <div id="date-display">Day, Month Date</div>
  <div id="greeting-message">Good [morning/afternoon/evening/night], [Name]</div>
  <input id="name-input" type="text" placeholder="Enter your name">
</div>
```

**Public API**:
```javascript
GreetingComponent = {
  init(): void
  updateTime(): void
  setUserName(name: string): void
}
```

**State**:
- `userName`: String (from Local Storage or default)
- `currentTime`: Date object
- `updateInterval`: setInterval reference

**Behavior**:
- Updates time display every second using `setInterval`
- Determines greeting based on hour:
  - 05:00-11:59: "Good morning"
  - 12:00-16:59: "Good afternoon"
  - 17:00-20:59: "Good evening"
  - 21:00-04:59: "Good night"
- Saves custom name to Local Storage on input change
- Uses user's local timezone via `new Date()`

### 4. FocusTimer

**Purpose**: Pomodoro-style countdown timer with configurable duration.

**DOM Structure**:
```html
<div id="timer-section">
  <div id="timer-display">MM:SS</div>
  <div id="timer-controls">
    <button id="timer-start">Start</button>
    <button id="timer-stop">Stop</button>
    <button id="timer-reset">Reset</button>
  </div>
  <input id="timer-duration" type="number" min="1" max="60" value="25">
  <div id="timer-complete" class="hidden">Timer Complete!</div>
</div>
```

**Public API**:
```javascript
FocusTimer = {
  init(): void
  start(): void
  stop(): void
  reset(): void
  setDuration(minutes: number): boolean
}
```

**State**:
- `duration`: Number (minutes, default 25)
- `remainingTime`: Number (seconds)
- `isRunning`: Boolean
- `intervalId`: setInterval reference

**Behavior**:
- Countdown updates every 1000ms using `setInterval`
- Start button begins countdown from current `remainingTime`
- Stop button pauses countdown (preserves `remainingTime`)
- Reset button restores `remainingTime` to `duration * 60`
- Duration changes only allowed when timer is not running
- Validates duration between 1-60 minutes
- Shows completion indicator when countdown reaches 0
- Persists custom duration to Local Storage
- Publishes `timer:complete` event when finished

### 5. TaskList

**Purpose**: Full CRUD operations for task management with sorting and duplicate prevention.

**DOM Structure**:
```html
<div id="task-section">
  <div id="task-input-container">
    <input id="task-input" type="text" placeholder="Add a new task">
    <button id="task-add">Add</button>
  </div>
  <div id="task-sort">
    <select id="task-sort-select">
      <option value="creation">Creation Order</option>
      <option value="alphabetical">Alphabetical</option>
      <option value="completion">Completion Status</option>
    </select>
  </div>
  <ul id="task-list">
    <!-- Task items rendered here -->
  </ul>
  <div id="task-notification" class="hidden"></div>
</div>
```

**Task Item Structure**:
```html
<li class="task-item" data-id="unique-id">
  <input type="checkbox" class="task-checkbox">
  <span class="task-text">Task description</span>
  <button class="task-edit">Edit</button>
  <button class="task-delete">Delete</button>
</li>
```

**Public API**:
```javascript
TaskList = {
  init(): void
  createTask(text: string): boolean
  updateTask(id: string, text: string): boolean
  deleteTask(id: string): boolean
  toggleComplete(id: string): boolean
  setSortOrder(order: string): void
  render(): void
}
```

**State**:
- `tasks`: Array of task objects
- `sortOrder`: String ('creation' | 'alphabetical' | 'completion')

**Task Object Schema**:
```javascript
{
  id: string,           // UUID or timestamp-based
  text: string,         // Task description
  completed: boolean,   // Completion status
  createdAt: number     // Timestamp (for sorting)
}
```

**Behavior**:
- **Create**: Validates non-empty text, checks for duplicates (case-insensitive, trimmed), generates unique ID, saves to storage
- **Update**: Validates non-empty text, updates task object, saves to storage
- **Delete**: Removes from array, saves to storage
- **Toggle Complete**: Flips boolean, applies visual styling, saves to storage
- **Duplicate Prevention**: Trims whitespace, converts to lowercase for comparison
- **Sorting**:
  - Creation: Original insertion order (by `createdAt`)
  - Alphabetical: Case-insensitive text sort
  - Completion: Incomplete tasks first, then completed
- **Notifications**: Shows temporary message for duplicate attempts
- Publishes events: `task:created`, `task:updated`, `task:deleted`

### 6. QuickLinks

**Purpose**: Manage and access favorite website shortcuts.

**DOM Structure**:
```html
<div id="links-section">
  <div id="link-input-container">
    <input id="link-name" type="text" placeholder="Link name">
    <input id="link-url" type="url" placeholder="https://example.com">
    <button id="link-add">Add Link</button>
  </div>
  <ul id="link-list">
    <!-- Link items rendered here -->
  </ul>
</div>
```

**Link Item Structure**:
```html
<li class="link-item" data-id="unique-id">
  <a href="url" target="_blank" rel="noopener noreferrer">Link Name</a>
  <button class="link-delete">Delete</button>
</li>
```

**Public API**:
```javascript
QuickLinks = {
  init(): void
  createLink(name: string, url: string): boolean
  deleteLink(id: string): boolean
  render(): void
}
```

**State**:
- `links`: Array of link objects

**Link Object Schema**:
```javascript
{
  id: string,      // UUID or timestamp-based
  name: string,    // Display name
  url: string      // Full URL
}
```

**Behavior**:
- Validates both name and URL are non-empty
- Opens links in new tab with `target="_blank"` and `rel="noopener noreferrer"` for security
- Saves to Local Storage on create/delete
- Renders links as clickable anchors

### 7. ThemeManager

**Purpose**: Toggle between light and dark color schemes.

**DOM Structure**:
```html
<div id="theme-toggle-container">
  <button id="theme-toggle" aria-label="Toggle theme">
    <span class="theme-icon">🌙</span>
  </button>
</div>
```

**Public API**:
```javascript
ThemeManager = {
  init(): void
  toggle(): void
  setTheme(theme: string): void
  getCurrentTheme(): string
}
```

**State**:
- `currentTheme`: String ('light' | 'dark')

**Behavior**:
- Applies theme by adding/removing CSS class on `<body>` element
- Default theme: 'light'
- Saves theme preference to Local Storage
- Loads saved theme on initialization
- Publishes `theme:changed` event
- Updates toggle button icon (🌙 for dark mode, ☀️ for light mode)

## Data Models

### Local Storage Schema

All data is stored as JSON strings in Local Storage with the following structure:

#### Tasks
**Key**: `tasks`  
**Type**: Array of Task objects

```javascript
[
  {
    id: "1234567890",
    text: "Complete project documentation",
    completed: false,
    createdAt: 1704067200000
  },
  {
    id: "1234567891",
    text: "Review pull requests",
    completed: true,
    createdAt: 1704070800000
  }
]
```

#### Links
**Key**: `links`  
**Type**: Array of Link objects

```javascript
[
  {
    id: "link-001",
    name: "GitHub",
    url: "https://github.com"
  },
  {
    id: "link-002",
    name: "Documentation",
    url: "https://developer.mozilla.org"
  }
]
```

#### Theme
**Key**: `theme`  
**Type**: String

```javascript
"dark"  // or "light"
```

#### User Name
**Key**: `userName`  
**Type**: String

```javascript
"Alex"
```

#### Timer Duration
**Key**: `timerDuration`  
**Type**: Number (minutes)

```javascript
25
```

#### Task Sort Order
**Key**: `taskSortOrder`  
**Type**: String

```javascript
"completion"  // or "creation" or "alphabetical"
```

### Data Validation Rules

1. **Task Text**: 
   - Must be non-empty after trimming
   - Must be unique (case-insensitive comparison)
   - No maximum length enforced (Local Storage limit is ~5MB total)

2. **Link URL**:
   - Must be non-empty
   - Should be valid URL format (basic validation)
   - No protocol enforcement (user can enter any string)

3. **Timer Duration**:
   - Must be integer between 1 and 60 (inclusive)
   - Invalid values rejected, current duration preserved

4. **Theme**:
   - Must be 'light' or 'dark'
   - Invalid values default to 'light'

5. **Sort Order**:
   - Must be 'creation', 'alphabetical', or 'completion'
   - Invalid values default to 'creation'

### ID Generation Strategy

Use timestamp-based IDs for simplicity and uniqueness:

```javascript
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
```

This provides sufficient uniqueness for a single-user, client-side application without requiring a UUID library.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Time Display Format

*For any* Date object, the time formatting function SHALL produce output matching the HH:MM format pattern (two digits for hours, colon separator, two digits for minutes).

**Validates: Requirements 1.1**

### Property 2: Date Display Completeness

*For any* Date object, the date formatting function SHALL produce output containing the day of week, month name, and day number.

**Validates: Requirements 1.2**

### Property 3: Time-Based Greeting Selection

*For any* hour value (0-23), the greeting selection function SHALL return:
- "morning" for hours 5-11
- "afternoon" for hours 12-16
- "evening" for hours 17-20
- "night" for hours 21-4

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 4: Timer Display Format

*For any* remaining time value in seconds, the timer formatting function SHALL produce output matching the MM:SS format pattern (two digits for minutes, colon separator, two digits for seconds).

**Validates: Requirements 3.6**

### Property 5: Timer Start Behavior

*For any* valid timer duration (1-60 minutes), starting the timer SHALL set the remaining time to duration × 60 seconds and set the running state to true.

**Validates: Requirements 3.2**

### Property 6: Timer Stop Preserves State

*For any* remaining time value while the timer is running, stopping the timer SHALL preserve the current remaining time value and set the running state to false.

**Validates: Requirements 3.3**

### Property 7: Timer Reset Restores Duration

*For any* timer duration and any current remaining time, resetting the timer SHALL restore the remaining time to duration × 60 seconds.

**Validates: Requirements 3.4**

### Property 8: Valid Task Creation

*For any* non-empty, non-whitespace task text that doesn't match an existing task (after normalization), creating a task SHALL increase the task list length by 1 and the new task SHALL have the provided text.

**Validates: Requirements 4.1, 4.3**

### Property 9: Empty Task Rejection

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), attempting to create a task SHALL not change the task list length.

**Validates: Requirements 4.4**

### Property 10: Task Update

*For any* existing task and any non-empty, non-whitespace new text, updating the task SHALL change the task's text property to the new text.

**Validates: Requirements 5.2**

### Property 11: Empty Task Update Rejection

*For any* existing task and any string composed entirely of whitespace, attempting to update the task SHALL not change the task's text property.

**Validates: Requirements 5.4**

### Property 12: Task Completion Toggle

*For any* task, toggling its completion status SHALL flip the completed boolean value (false → true or true → false) and apply corresponding visual styling.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 13: Task Deletion

*For any* task list and any task within that list, deleting the task SHALL decrease the list length by 1 and the deleted task SHALL not be present in the resulting list.

**Validates: Requirements 7.1, 7.3**

### Property 14: Task Serialization Round-Trip

*For any* task object with text and completion status, saving to Local Storage then loading SHALL produce a task object with identical text and completion status.

**Validates: Requirements 4.2, 5.3, 6.4, 7.2, 8.1, 8.2, 8.3**

### Property 15: Link Creation

*For any* non-empty link name and non-empty URL, creating a link SHALL increase the link list length by 1 and the new link SHALL have the provided name and URL.

**Validates: Requirements 9.1**

### Property 16: Link Deletion

*For any* link list and any link within that list, deleting the link SHALL decrease the list length by 1 and the deleted link SHALL not be present in the resulting list.

**Validates: Requirements 9.4**

### Property 17: Link Serialization Round-Trip

*For any* link object with name and URL, saving to Local Storage then loading SHALL produce a link object with identical name and URL.

**Validates: Requirements 9.2, 9.5**

### Property 18: Theme Toggle

*For any* current theme value ('light' or 'dark'), toggling the theme SHALL switch to the opposite value ('light' → 'dark' or 'dark' → 'light').

**Validates: Requirements 10.2**

### Property 19: Theme Application

*For any* theme value ('light' or 'dark'), applying the theme SHALL add the corresponding CSS class to the body element and remove the opposite class.

**Validates: Requirements 10.3**

### Property 20: Theme Persistence

*For any* theme value ('light' or 'dark'), setting the theme SHALL save that value to Local Storage, and loading SHALL retrieve and apply that same theme value.

**Validates: Requirements 10.4, 10.5**

### Property 21: User Name Inclusion

*For any* non-empty user name string, setting the name SHALL result in the greeting message containing that exact name string.

**Validates: Requirements 11.3**

### Property 22: User Name Persistence

*For any* user name string, setting the name SHALL save that value to Local Storage, and loading SHALL retrieve and display that same name in the greeting.

**Validates: Requirements 11.2, 11.4**

### Property 23: Valid Timer Duration Update

*For any* integer duration value between 1 and 60 (inclusive) when the timer is not running, setting the duration SHALL update the timer's duration property to that value.

**Validates: Requirements 12.1**

### Property 24: Invalid Timer Duration Rejection

*For any* duration value less than 1 or greater than 60, attempting to set the duration SHALL not change the timer's current duration property.

**Validates: Requirements 12.3, 12.5**

### Property 25: Timer Duration Persistence

*For any* valid timer duration (1-60 minutes), setting the duration SHALL save that value to Local Storage, and loading SHALL retrieve and apply that same duration value.

**Validates: Requirements 12.2, 12.4**

### Property 26: Duplicate Task Prevention with Normalization

*For any* existing task with text T, attempting to create a new task with text that matches T after case-insensitive comparison and whitespace trimming SHALL not change the task list length.

**Validates: Requirements 13.1, 13.3, 13.4**

### Property 27: Duplicate Task Notification

*For any* duplicate task attempt, the task list SHALL display a notification message to the user.

**Validates: Requirements 13.2**

### Property 28: Task Sorting by Creation Order

*For any* task list, sorting by creation order SHALL produce a list ordered by the createdAt timestamp in ascending order.

**Validates: Requirements 14.2**

### Property 29: Task Sorting Alphabetically

*For any* task list, sorting alphabetically SHALL produce a list ordered by task text in case-insensitive lexicographic order.

**Validates: Requirements 14.2**

### Property 30: Task Sorting by Completion Status

*For any* task list, sorting by completion status SHALL produce a list where all incomplete tasks (completed = false) appear before all completed tasks (completed = true).

**Validates: Requirements 14.2, 14.3**

### Property 31: Sort Preference Persistence

*For any* sort order value ('creation', 'alphabetical', or 'completion'), setting the sort order SHALL save that value to Local Storage, and loading SHALL retrieve and apply that same sort order.

**Validates: Requirements 14.4, 14.5**

### Property 32: Color Contrast Compliance

*For any* text and background color pair used in the dashboard CSS, the contrast ratio SHALL meet or exceed WCAG AA standards (4.5:1 for normal text, 3:1 for large text).

**Validates: Requirements 17.4**



## Error Handling

### Local Storage Error Handling

**Quota Exceeded Errors**:
- **Scenario**: Local Storage quota exceeded (typically 5-10MB)
- **Handling**: 
  - Catch `QuotaExceededError` in StorageManager.set()
  - Display user-friendly error message: "Storage limit reached. Please delete some tasks or links."
  - Return `false` to indicate operation failure
  - Do not modify application state if save fails
  - Log error to console for debugging

**Storage Access Errors**:
- **Scenario**: Local Storage disabled or unavailable (private browsing, browser settings)
- **Handling**:
  - Detect on initialization by attempting to write test value
  - Display warning banner: "Local Storage is disabled. Your data will not be saved."
  - Allow application to function with in-memory state only
  - Gracefully degrade persistence features

**Corrupted Data Errors**:
- **Scenario**: Invalid JSON in Local Storage (manual editing, corruption)
- **Handling**:
  - Catch `SyntaxError` in StorageManager.get()
  - Log error to console with key name
  - Return `null` or default value
  - Continue with empty/default state
  - Optionally clear corrupted key

### Input Validation Errors

**Invalid Timer Duration**:
- **Scenario**: User enters duration < 1 or > 60
- **Handling**:
  - Reject input silently (do not update duration)
  - Optionally display validation message: "Duration must be between 1 and 60 minutes"
  - Keep current duration unchanged
  - Reset input field to current valid duration

**Empty Task Text**:
- **Scenario**: User attempts to create/update task with empty or whitespace-only text
- **Handling**:
  - Reject operation silently (do not create/update task)
  - Clear input field
  - No error message needed (expected behavior)

**Duplicate Task**:
- **Scenario**: User attempts to create task with text matching existing task
- **Handling**:
  - Reject operation (do not create task)
  - Display temporary notification: "Task already exists"
  - Clear input field after 2 seconds
  - Fade out notification after 3 seconds

**Invalid URL Format**:
- **Scenario**: User enters malformed URL for quick link
- **Handling**:
  - Accept any non-empty string (no strict validation)
  - Browser will handle invalid URLs when clicked
  - Rationale: Flexibility for local file paths, custom protocols

### Browser Compatibility Errors

**Unsupported Browser**:
- **Scenario**: User accesses dashboard from browser without required Web API support
- **Handling**:
  - Detect missing APIs on initialization (localStorage, Date, setInterval)
  - Display compatibility notice: "This browser is not supported. Please use Chrome, Firefox, Edge, or Safari."
  - Prevent application initialization
  - Provide list of supported browsers

**Feature Detection**:
```javascript
function checkBrowserSupport() {
  const required = [
    typeof Storage !== 'undefined',
    typeof Date !== 'undefined',
    typeof setInterval !== 'undefined'
  ];
  return required.every(feature => feature === true);
}
```

### Timer Edge Cases

**Timer Running During Duration Change**:
- **Scenario**: User attempts to change duration while timer is running
- **Handling**:
  - Disable duration input field when timer is running
  - Add visual indicator (grayed out, disabled attribute)
  - Ignore any change attempts
  - Re-enable input when timer stops or resets

**Timer at Zero**:
- **Scenario**: Countdown reaches 0:00
- **Handling**:
  - Stop countdown interval
  - Display completion indicator
  - Keep timer at 0:00 (do not reset automatically)
  - User must click reset to start new session

### DOM Manipulation Errors

**Missing DOM Elements**:
- **Scenario**: Component initialization fails to find required DOM element
- **Handling**:
  - Check for element existence before adding event listeners
  - Log error to console: "Required element not found: #element-id"
  - Skip component initialization gracefully
  - Do not crash entire application

**Event Listener Errors**:
- **Scenario**: Error occurs within event handler
- **Handling**:
  - Wrap event handlers in try-catch blocks
  - Log error to console with context
  - Display generic error message to user if needed
  - Prevent error from breaking other components

### Error Logging Strategy

**Console Logging**:
- Log all errors to console with context
- Include component name, operation, and error details
- Use `console.error()` for errors, `console.warn()` for warnings
- Format: `[ComponentName] Operation failed: error message`

**User-Facing Messages**:
- Keep messages simple and actionable
- Avoid technical jargon
- Provide clear next steps when possible
- Use temporary notifications that auto-dismiss

**No External Error Tracking**:
- No external error reporting services (maintains standalone nature)
- All error handling is client-side only
- Errors are not persisted or transmitted

## Testing Strategy

### Overview

The testing strategy employs a dual approach combining property-based testing for universal correctness guarantees with example-based unit tests for specific scenarios and edge cases. This comprehensive approach ensures both broad input coverage and targeted validation of critical behaviors.

### Property-Based Testing

**Framework**: [fast-check](https://github.com/dubzzz/fast-check) for JavaScript

**Configuration**:
- Minimum 100 iterations per property test
- Each test references its design document property
- Tag format: `Feature: todo-list-life-dashboard, Property {number}: {property_text}`

**Property Test Implementation**:

Each correctness property from the design document SHALL be implemented as a property-based test. Example:

```javascript
// Feature: todo-list-life-dashboard, Property 1: Time Display Format
test('Time formatting produces HH:MM format', () => {
  fc.assert(
    fc.property(
      fc.date(), // Generate random dates
      (date) => {
        const formatted = formatTime(date);
        // Verify HH:MM pattern
        expect(formatted).toMatch(/^\d{2}:\d{2}$/);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Generators**:

Custom generators for domain objects:

```javascript
// Task generator
const taskArbitrary = fc.record({
  id: fc.string(),
  text: fc.string({ minLength: 1 }),
  completed: fc.boolean(),
  createdAt: fc.integer({ min: 0 })
});

// Link generator
const linkArbitrary = fc.record({
  id: fc.string(),
  name: fc.string({ minLength: 1 }),
  url: fc.webUrl()
});

// Whitespace string generator (for validation tests)
const whitespaceArbitrary = fc.stringOf(
  fc.constantFrom(' ', '\t', '\n', '\r')
);

// Timer duration generator (valid range)
const validDurationArbitrary = fc.integer({ min: 1, max: 60 });

// Timer duration generator (invalid range)
const invalidDurationArbitrary = fc.oneof(
  fc.integer({ max: 0 }),
  fc.integer({ min: 61 })
);
```

**Property Test Coverage**:

The following properties SHALL be implemented as property-based tests:

1. **Formatting Properties** (1, 2, 4): Test output format compliance
2. **Greeting Logic** (3): Test time-based conditional logic
3. **Timer Operations** (5, 6, 7): Test state transitions
4. **Task CRUD** (8, 9, 10, 11, 12, 13): Test task operations and validation
5. **Persistence** (14, 17, 20, 22, 25, 31): Test serialization round-trips
6. **Link Operations** (15, 16): Test link CRUD
7. **Theme Management** (18, 19): Test theme toggling and application
8. **User Name** (21): Test name inclusion in greeting
9. **Timer Duration** (23, 24): Test duration validation
10. **Duplicate Prevention** (26, 27): Test normalization and detection
11. **Sorting** (28, 29, 30): Test sort algorithms
12. **Accessibility** (32): Test color contrast ratios

### Unit Testing

**Framework**: [Vitest](https://vitest.dev/) (fast, modern, ESM-native)

**Unit Test Focus**:

Unit tests complement property tests by covering:

1. **Specific Examples**: Concrete scenarios that demonstrate correct behavior
2. **Edge Cases**: Boundary conditions and special values
3. **Integration Points**: Component interactions and event flow
4. **Error Conditions**: Error handling and validation messages

**Example Unit Tests**:

```javascript
// Specific example: Default timer duration
test('Timer initializes with 25 minute default', () => {
  const timer = FocusTimer.init();
  expect(timer.duration).toBe(25);
});

// Edge case: Empty task list
test('Empty storage returns empty task list', () => {
  localStorage.clear();
  const tasks = TaskList.loadTasks();
  expect(tasks).toEqual([]);
});

// Integration: Event publishing
test('Task creation publishes task:created event', () => {
  const handler = jest.fn();
  EventBus.on('task:created', handler);
  TaskList.createTask('Test task');
  expect(handler).toHaveBeenCalledWith(
    expect.objectContaining({ text: 'Test task' })
  );
});

// Error handling: Duplicate notification
test('Duplicate task shows notification', () => {
  TaskList.createTask('Existing task');
  TaskList.createTask('Existing task');
  const notification = document.getElementById('task-notification');
  expect(notification.textContent).toContain('already exists');
});
```

**Mock Strategy**:

- **Local Storage**: Mock `localStorage` for isolated testing
- **Timers**: Use `vi.useFakeTimers()` for timer tests
- **DOM**: Use JSDOM for DOM manipulation tests
- **Events**: Spy on EventBus methods to verify event flow

### Integration Testing

**Focus**: End-to-end user workflows and browser compatibility

**Test Scenarios**:

1. **Complete Task Workflow**:
   - Create task → Mark complete → Edit → Delete
   - Verify persistence at each step
   - Verify UI updates correctly

2. **Timer Workflow**:
   - Set custom duration → Start → Stop → Reset
   - Verify countdown accuracy
   - Verify completion indicator

3. **Theme Persistence**:
   - Toggle theme → Reload page
   - Verify theme persists across sessions

4. **Cross-Browser**:
   - Run test suite in Chrome, Firefox, Edge, Safari
   - Verify all features work identically

5. **Performance**:
   - Load 100 tasks
   - Measure render time (< 100ms)
   - Measure sort time (< 100ms)

**Tools**:
- **Playwright** or **Cypress** for browser automation
- **Lighthouse** for performance auditing
- **BrowserStack** for cross-browser testing (optional)

### Accessibility Testing

**Automated Checks**:
- **axe-core**: Run accessibility audit on rendered HTML
- **Color Contrast**: Verify all text/background pairs meet WCAG AA (Property 32)
- **Semantic HTML**: Verify proper use of semantic elements

**Manual Checks**:
- Keyboard navigation (tab order, focus indicators)
- Screen reader compatibility (NVDA, JAWS, VoiceOver)
- Zoom to 200% (text remains readable)

### Test Organization

**Directory Structure**:
```
tests/
├── unit/
│   ├── storage-manager.test.js
│   ├── event-bus.test.js
│   ├── greeting-component.test.js
│   ├── focus-timer.test.js
│   ├── task-list.test.js
│   ├── quick-links.test.js
│   └── theme-manager.test.js
├── property/
│   ├── formatting.property.test.js
│   ├── task-operations.property.test.js
│   ├── persistence.property.test.js
│   ├── sorting.property.test.js
│   └── validation.property.test.js
├── integration/
│   ├── task-workflow.test.js
│   ├── timer-workflow.test.js
│   └── theme-persistence.test.js
└── accessibility/
    └── wcag-compliance.test.js
```

**Test Naming Convention**:
- Unit tests: `describe('ComponentName')` → `test('should do something')`
- Property tests: `test('Property N: property description')`
- Integration tests: `test('User can complete workflow')`

### Coverage Goals

**Target Coverage**:
- **Line Coverage**: > 90%
- **Branch Coverage**: > 85%
- **Function Coverage**: > 95%

**Coverage Exclusions**:
- Browser compatibility detection code
- Error logging statements
- Development-only code

### Continuous Testing

**Pre-Commit**:
- Run unit tests and property tests
- Run linter (ESLint)
- Check code formatting (Prettier)

**CI Pipeline** (if applicable):
- Run full test suite (unit + property + integration)
- Generate coverage report
- Run accessibility audit
- Test in multiple browsers

### Test Execution

**Commands**:
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run property tests only
npm run test:property

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Run in watch mode (development)
npm run test:watch
```

**Performance**:
- Unit tests: < 5 seconds total
- Property tests: < 30 seconds total (100 iterations × 32 properties)
- Integration tests: < 60 seconds total
- Full suite: < 2 minutes

### Testing Anti-Patterns to Avoid

**Don't**:
- Write too many unit tests for behaviors covered by property tests
- Test implementation details (internal state, private methods)
- Write brittle tests that break with UI changes
- Mock everything (test real integrations when possible)
- Ignore flaky tests (fix or remove them)

**Do**:
- Focus unit tests on specific examples and edge cases
- Test public APIs and observable behavior
- Write tests that document expected behavior
- Use property tests for comprehensive input coverage
- Keep tests fast and deterministic

---

## Summary

This design document provides a comprehensive blueprint for the To-Do List Life Dashboard, a vanilla JavaScript productivity application. The architecture emphasizes:

1. **Modularity**: Component-based design with clear separation of concerns
2. **Simplicity**: Zero dependencies, single-file architecture
3. **Correctness**: 32 formally specified properties with property-based testing
4. **Performance**: Sub-second load times, sub-100ms UI responsiveness
5. **Reliability**: Comprehensive error handling and graceful degradation
6. **Testability**: Dual testing strategy with 90%+ coverage goals

The design is ready for implementation following the task breakdown in the tasks document.
