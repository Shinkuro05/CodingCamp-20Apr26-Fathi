# To-Do List Life Dashboard

Personal productivity dashboard with time tracking, task management, and quick links. Built with vanilla HTML, CSS, and JavaScript.

## Features

- **Live Clock & Date**: Real-time display with HH:MM:SS format
- **Personalized Greeting**: Custom name input with localStorage persistence
- **Pomodoro Timer**: Configurable focus sessions with minutes and seconds, start/stop/reset controls
- **Timer Notifications**: Visual notification, 60-second crescendo sound alert (60 ascending beeps, quiet to loud), and browser notification when timer completes. Stop button also stops sound.
- **Task Management**: Add, complete, delete tasks with sort options (date added, alphabetical, completion status)
- **Quick Links**: Customizable shortcuts to frequently visited sites
- **Theme Toggle**: Light/dark mode with localStorage persistence
- **Data Export/Import**: Backup and restore all data as JSON file
- **Responsive Design**: Side-by-side layout on desktop, stacked on mobile

## Tech Stack

- **HTML5**: Semantic elements with ARIA attributes
- **CSS3**: Custom properties, flexbox, grid, gradients
- **Vanilla JavaScript**: No frameworks, IIFE pattern, component-based architecture
- **Local Storage API**: Client-side data persistence

## Setup

1. Clone or download repository
2. Open `index.html` in browser
3. No build process or dependencies required

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Project Structure

```
├── index.html          # Main HTML file
├── css/
│   └── dashboard.css   # Styles with theme support
├── js/
│   └── dashboard.js    # Component logic and state management
└── README.md           # Documentation
```

## Usage

- **Set Name**: Click greeting text, enter name, click outside to save
- **Timer**: Click Start for 25-min session, Stop to pause, Reset to clear
- **Tasks**: Add via input, check to complete, X to delete, sort via dropdown
- **Links**: Click + to add, X to remove
- **Theme**: Toggle sun/moon icon for light/dark mode
- **Export Data**: Click Export Data button (top-right) to download JSON backup
- **Import Data**: Click Import Data button, select JSON file to restore

## License

Mini Project Batch 20-04-2026
