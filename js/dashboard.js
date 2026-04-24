// To-Do List Life Dashboard
// All application logic will be implemented here

/**
 * StorageManager Module
 * Centralized interface for all Local Storage operations with error handling and JSON serialization.
 * 
 * Provides methods for:
 * - get(key): Retrieve and deserialize data from Local Storage
 * - set(key, value): Serialize and save data to Local Storage
 * - remove(key): Remove item from Local Storage
 * - clear(): Clear all Local Storage data
 * - has(key): Check if key exists in Local Storage
 * 
 * Error Handling:
 * - QuotaExceededError: Returns false and logs error when storage limit reached
 * - Storage unavailable: Gracefully handles when Local Storage is disabled
 * - Corrupted data: Returns null for invalid JSON and logs error
 */
const StorageManager = (function() {
  // Private state
  let isStorageAvailable = false;

  /**
   * Check if Local Storage is available and accessible
   * @private
   * @returns {boolean} True if Local Storage is available
   */
  function checkStorageAvailability() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.error('[StorageManager] Local Storage is not available:', e);
      return false;
    }
  }

  /**
   * Initialize the StorageManager
   * Checks storage availability and displays warning if unavailable
   * @public
   */
  function init() {
    isStorageAvailable = checkStorageAvailability();
    
    if (!isStorageAvailable) {
      console.warn('[StorageManager] Local Storage is disabled. Your data will not be saved.');
      // Display warning banner to user
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.showStorageWarningBanner();
      }
    }
    
    return isStorageAvailable;
  }

  /**
   * Get item from Local Storage and deserialize JSON
   * @public
   * @param {string} key - Storage key
   * @returns {any|null} Deserialized value or null if not found/error
   */
  function get(key) {
    if (!isStorageAvailable) {
      return null;
    }

    try {
      const item = localStorage.getItem(key);
      
      // Return null for missing keys
      if (item === null) {
        return null;
      }

      // Deserialize JSON
      return JSON.parse(item);
    } catch (e) {
      // Handle corrupted data (SyntaxError from JSON.parse)
      if (e instanceof SyntaxError) {
        console.error(`[StorageManager] Corrupted data for key "${key}":`, e);
        return null;
      }
      
      // Handle other errors
      console.error(`[StorageManager] Error reading key "${key}":`, e);
      return null;
    }
  }

  /**
   * Set item in Local Storage with JSON serialization
   * @public
   * @param {string} key - Storage key
   * @param {any} value - Value to store (will be JSON serialized)
   * @returns {boolean} True if successful, false on error
   */
  function set(key, value) {
    if (!isStorageAvailable) {
      return false;
    }

    try {
      // Serialize value to JSON
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      // Handle quota exceeded error
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.error('[StorageManager] Storage limit reached:', e);
        // Display error message to user
        if (typeof NotificationManager !== 'undefined') {
          NotificationManager.showNotification(
            'Storage limit reached. Please delete some tasks or links.',
            'error',
            5000
          );
        }
        return false;
      }
      
      // Handle other errors
      console.error(`[StorageManager] Error setting key "${key}":`, e);
      return false;
    }
  }

  /**
   * Remove item from Local Storage
   * @public
   * @param {string} key - Storage key to remove
   * @returns {boolean} True if successful, false on error
   */
  function remove(key) {
    if (!isStorageAvailable) {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error(`[StorageManager] Error removing key "${key}":`, e);
      return false;
    }
  }

  /**
   * Clear all items from Local Storage
   * @public
   * @returns {boolean} True if successful, false on error
   */
  function clear() {
    if (!isStorageAvailable) {
      return false;
    }

    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.error('[StorageManager] Error clearing storage:', e);
      return false;
    }
  }

  /**
   * Check if key exists in Local Storage
   * @public
   * @param {string} key - Storage key to check
   * @returns {boolean} True if key exists, false otherwise
   */
  function has(key) {
    if (!isStorageAvailable) {
      return false;
    }

    try {
      return localStorage.getItem(key) !== null;
    } catch (e) {
      console.error(`[StorageManager] Error checking key "${key}":`, e);
      return false;
    }
  }

  // Public API
  return {
    init: init,
    get: get,
    set: set,
    remove: remove,
    clear: clear,
    has: has
  };
})();

/**
 * EventBus Module
 * Lightweight publish-subscribe system for component communication.
 * 
 * Provides methods for:
 * - on(event, callback): Subscribe to an event
 * - off(event, callback): Unsubscribe from an event
 * - emit(event, data): Publish an event with optional data
 * 
 * Supported Events:
 * - theme:changed - Theme mode switched
 * - task:created - New task added
 * - task:updated - Task modified
 * - task:deleted - Task removed
 * - timer:complete - Pomodoro timer finished
 * 
 * Features:
 * - Supports multiple subscribers per event
 * - Passes data to all subscribers when event is emitted
 * - Allows unsubscribing specific callbacks
 */
const EventBus = (function() {
  // Private state: Map of event names to arrays of callback functions
  const subscribers = {};

  /**
   * Subscribe to an event
   * @public
   * @param {string} event - Event name to subscribe to
   * @param {function} callback - Function to call when event is emitted
   */
  function on(event, callback) {
    // Validate inputs
    if (typeof event !== 'string' || !event) {
      console.error('[EventBus] Invalid event name:', event);
      return;
    }

    if (typeof callback !== 'function') {
      console.error('[EventBus] Invalid callback for event:', event);
      return;
    }

    // Initialize subscriber array for this event if it doesn't exist
    if (!subscribers[event]) {
      subscribers[event] = [];
    }

    // Add callback to subscribers array
    subscribers[event].push(callback);
  }

  /**
   * Unsubscribe from an event
   * @public
   * @param {string} event - Event name to unsubscribe from
   * @param {function} callback - Specific callback function to remove
   */
  function off(event, callback) {
    // Validate inputs
    if (typeof event !== 'string' || !event) {
      console.error('[EventBus] Invalid event name:', event);
      return;
    }

    if (typeof callback !== 'function') {
      console.error('[EventBus] Invalid callback for event:', event);
      return;
    }

    // Check if event has any subscribers
    if (!subscribers[event]) {
      return;
    }

    // Find and remove the specific callback
    const index = subscribers[event].indexOf(callback);
    if (index !== -1) {
      subscribers[event].splice(index, 1);
    }

    // Clean up empty subscriber arrays
    if (subscribers[event].length === 0) {
      delete subscribers[event];
    }
  }

  /**
   * Publish an event with optional data
   * @public
   * @param {string} event - Event name to emit
   * @param {any} data - Optional data to pass to subscribers
   */
  function emit(event, data) {
    // Validate event name
    if (typeof event !== 'string' || !event) {
      console.error('[EventBus] Invalid event name:', event);
      return;
    }

    // Check if event has any subscribers
    if (!subscribers[event] || subscribers[event].length === 0) {
      return;
    }

    // Call all subscriber callbacks with the provided data
    // Use slice() to create a copy in case callbacks modify the subscribers array
    subscribers[event].slice().forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        // Catch errors in callbacks to prevent one failing callback from breaking others
        console.error(`[EventBus] Error in callback for event "${event}":`, e);
      }
    });
  }

  // Public API
  return {
    on: on,
    off: off,
    emit: emit
  };
})();

/**
 * NotificationManager Module
 * Centralized notification system for displaying user-facing messages.
 * 
 * Features:
 * - Display error, warning, info, and success messages
 * - Auto-dismiss temporary notifications (configurable duration)
 * - Persistent warning banner for critical issues (storage disabled)
 * - Fade in/out animations
 * - Accessible with ARIA attributes
 * 
 * Notification Types:
 * - error: Red, for critical errors (storage limit reached)
 * - warning: Yellow, for warnings (validation errors)
 * - info: Blue, for informational messages
 * - success: Green, for success confirmations
 * 
 * Public API:
 * - showNotification(message, type, duration): Display temporary notification
 * - showStorageWarningBanner(): Display persistent storage disabled banner
 * - hideStorageWarningBanner(): Hide storage warning banner
 */
const NotificationManager = (function() {
  // Private state
  let notificationContainer = null;
  let storageWarningBanner = null;
  let currentTimeout = null;

  /**
   * Initialize the NotificationManager
   * Gets DOM references and sets up notification container
   * @private
   */
  function init() {
    try {
      // Get notification container reference
      notificationContainer = document.getElementById('notification-container');
      
      if (!notificationContainer) {
        console.error('[NotificationManager] Notification container not found');
        return false;
      }
      
      return true;
    } catch (e) {
      console.error('[NotificationManager] Initialization failed:', e);
      return false;
    }
  }

  /**
   * Show a temporary notification message
   * @public
   * @param {string} message - Message to display
   * @param {string} type - Notification type ('error' | 'warning' | 'info' | 'success')
   * @param {number} duration - Duration in milliseconds (default 3000, 0 for no auto-dismiss)
   */
  function showNotification(message, type, duration) {
    try {
      // Initialize if not already done
      if (!notificationContainer) {
        const initialized = init();
        if (!initialized) {
          console.error('[NotificationManager] Cannot show notification: initialization failed');
          return;
        }
      }

      // Validate type
      const validTypes = ['error', 'warning', 'info', 'success'];
      if (!validTypes.includes(type)) {
        console.warn('[NotificationManager] Invalid notification type:', type, '- defaulting to "info"');
        type = 'info';
      }

      // Default duration to 3 seconds if not specified
      if (typeof duration === 'undefined') {
        duration = 3000;
      }

      // Clear any existing timeout
      if (currentTimeout) {
        clearTimeout(currentTimeout);
        currentTimeout = null;
      }

      // Remove all type classes
      notificationContainer.classList.remove(
        'notification-error',
        'notification-warning',
        'notification-info',
        'notification-success',
        'notification-hide'
      );

      // Set message
      notificationContainer.textContent = message;

      // Add type class
      notificationContainer.classList.add('notification-' + type);

      // Show notification
      notificationContainer.classList.remove('hidden');
      notificationContainer.classList.add('notification-show');

      // Auto-dismiss after duration (if duration > 0)
      if (duration > 0) {
        currentTimeout = setTimeout(function() {
          hideNotification();
        }, duration);
      }
    } catch (e) {
      console.error('[NotificationManager] Error showing notification:', e);
    }
  }

  /**
   * Hide the current notification
   * @private
   */
  function hideNotification() {
    try {
      if (!notificationContainer) {
        return;
      }

      // Add hide animation class
      notificationContainer.classList.remove('notification-show');
      notificationContainer.classList.add('notification-hide');

      // After animation completes, hide the element
      setTimeout(function() {
        notificationContainer.classList.add('hidden');
        notificationContainer.classList.remove('notification-hide');
      }, 300); // Match transition duration
    } catch (e) {
      console.error('[NotificationManager] Error hiding notification:', e);
    }
  }

  /**
   * Show persistent storage warning banner
   * Displays when Local Storage is disabled or unavailable
   * @public
   */
  function showStorageWarningBanner() {
    try {
      // Check if banner already exists
      if (storageWarningBanner) {
        return;
      }

      // Create banner element
      storageWarningBanner = document.createElement('div');
      storageWarningBanner.id = 'storage-warning-banner';
      storageWarningBanner.setAttribute('role', 'alert');
      storageWarningBanner.setAttribute('aria-live', 'polite');

      // Create banner message
      const message = document.createTextNode('⚠️ Local Storage is disabled. Your data will not be saved between sessions.');

      // Create close button
      const closeButton = document.createElement('button');
      closeButton.className = 'banner-close';
      closeButton.textContent = '×';
      closeButton.setAttribute('aria-label', 'Close warning banner');
      closeButton.addEventListener('click', function() {
        try {
          hideStorageWarningBanner();
        } catch (e) {
          console.error('[NotificationManager] Error closing banner:', e);
        }
      });

      // Assemble banner
      storageWarningBanner.appendChild(message);
      storageWarningBanner.appendChild(closeButton);

      // Insert banner at the beginning of body
      document.body.insertBefore(storageWarningBanner, document.body.firstChild);

      // Add class to body to adjust layout
      document.body.classList.add('has-storage-banner');
    } catch (e) {
      console.error('[NotificationManager] Error showing storage warning banner:', e);
    }
  }

  /**
   * Hide storage warning banner
   * @public
   */
  function hideStorageWarningBanner() {
    try {
      if (!storageWarningBanner) {
        return;
      }

      // Remove banner from DOM
      storageWarningBanner.remove();
      storageWarningBanner = null;

      // Remove body class
      document.body.classList.remove('has-storage-banner');
    } catch (e) {
      console.error('[NotificationManager] Error hiding storage warning banner:', e);
    }
  }

  // Public API
  return {
    showNotification: showNotification,
    showStorageWarningBanner: showStorageWarningBanner,
    hideStorageWarningBanner: hideStorageWarningBanner
  };
})();

/**
 * GreetingComponent Module
 * Displays current time, date, and personalized greeting based on time of day.
 * 
 * Features:
 * - Real-time clock display (HH:MM format)
 * - Current date display (Day, Month Date format)
 * - Time-based greeting (morning/afternoon/evening/night)
 * - Custom user name support with Local Storage persistence
 * - Automatic updates every second
 * 
 * Time-based greetings:
 * - 05:00-11:59: "Good morning"
 * - 12:00-16:59: "Good afternoon"
 * - 17:00-20:59: "Good evening"
 * - 21:00-04:59: "Good night"
 */
const GreetingComponent = (function() {
  // Private state
  let userName = '';
  let updateInterval = null;
  
  // DOM element references
  let timeDisplay = null;
  let dateDisplay = null;
  let greetingMessage = null;
  let nameInput = null;

  /**
   * Format time in HH:MM:SS format
   * @private
   * @param {Date} date - Date object to format
   * @returns {string} Time string in HH:MM:SS format
   */
  function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Format date as "Day, Month Date"
   * @private
   * @param {Date} date - Date object to format
   * @returns {string} Date string (e.g., "Monday, January 15")
   */
  function formatDate(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayNumber = date.getDate();
    
    return `${dayName}, ${monthName} ${dayNumber}`;
  }

  /**
   * Get time-based greeting based on current hour
   * @private
   * @param {number} hour - Hour value (0-23)
   * @returns {string} Greeting text ("morning", "afternoon", "evening", or "night")
   */
  function getGreeting(hour) {
    if (hour >= 5 && hour < 12) {
      return 'morning';
    } else if (hour >= 12 && hour < 17) {
      return 'afternoon';
    } else if (hour >= 17 && hour < 21) {
      return 'evening';
    } else {
      return 'night';
    }
  }

  /**
   * Update time, date, and greeting displays
   * @public
   */
  function updateTime() {
    const now = new Date();
    
    // Update time display
    if (timeDisplay) {
      timeDisplay.textContent = formatTime(now);
    }
    
    // Update date display
    if (dateDisplay) {
      dateDisplay.textContent = formatDate(now);
    }
    
    // Update greeting message
    if (greetingMessage) {
      const hour = now.getHours();
      const greeting = getGreeting(hour);
      const nameText = userName ? `, ${userName}` : '';
      greetingMessage.textContent = `Good ${greeting}${nameText}`;
    }
  }

  /**
   * Set custom user name and save to Local Storage
   * @public
   * @param {string} name - User's name
   */
  function setUserName(name) {
    userName = name.trim();
    StorageManager.set('userName', userName);
    updateTime(); // Update greeting with new name
    
    // Clear input value after saving
    if (nameInput) {
      nameInput.value = '';
    }
  }

  /**
   * Handle name input change event
   * @private
   */
  function handleNameInput() {
    try {
      if (nameInput && nameInput.value.trim()) {
        setUserName(nameInput.value);
      }
    } catch (e) {
      console.error('[GreetingComponent] Error handling name input:', e);
    }
  }

  /**
   * Load saved user name from Local Storage
   * @private
   */
  function loadUserName() {
    const savedName = StorageManager.get('userName');
    if (savedName) {
      userName = savedName;
    }
  }

  /**
   * Initialize the GreetingComponent
   * Sets up DOM references, loads saved data, and starts update interval
   * @public
   */
  function init() {
    try {
      // Initialize StorageManager
      StorageManager.init();
      
      // Get DOM element references
      timeDisplay = document.getElementById('time-display');
      dateDisplay = document.getElementById('date-display');
      greetingMessage = document.getElementById('greeting-message');
      nameInput = document.getElementById('name-input');
      
      // Check if required elements exist
      if (!timeDisplay || !dateDisplay || !greetingMessage) {
        console.error('[GreetingComponent] Required DOM elements not found');
        return;
      }
      
      // Load saved user name
      loadUserName();
      
      // Initial update
      updateTime();
      
      // Set up automatic updates every second
      updateInterval = setInterval(updateTime, 1000);
      
      // Set up name input event listener
      if (nameInput) {
        nameInput.addEventListener('change', handleNameInput);
        nameInput.addEventListener('blur', handleNameInput);
      }
    } catch (e) {
      console.error('[GreetingComponent] Initialization failed:', e);
    }
  }

  // Public API
  return {
    init: init,
    updateTime: updateTime,
    setUserName: setUserName
  };
})();

/**
 * FocusTimer Module
 * Pomodoro-style countdown timer with configurable duration.
 * 
 * Features:
 * - Countdown timer with 25-minute default duration
 * - Start, stop, and reset controls
 * - MM:SS format display
 * - Configurable duration (1-60 minutes)
 * - Local Storage persistence for custom duration
 * - Timer completion event publishing
 * 
 * State Management:
 * - duration: Timer duration in minutes (default 25)
 * - remainingTime: Remaining time in seconds
 * - isRunning: Boolean indicating if timer is active
 * - intervalId: Reference to setInterval for countdown updates
 */
const FocusTimer = (function() {
  // Private state
  let durationMinutes = 25; // Default 25 minutes
  let durationSeconds = 0; // Default 0 seconds
  let remainingTime = 0; // Remaining time in seconds
  let isRunning = false;
  let intervalId = null;
  let alarmAudio = null; // Audio element for alarm sound
  
  // DOM element references
  let timerDisplay = null;
  let startButton = null;
  let stopButton = null;
  let resetButton = null;
  let durationInput = null;
  let secondsInput = null;
  let timerComplete = null;

  /**
   * Format time in MM:SS format
   * @private
   * @param {number} seconds - Time in seconds
   * @returns {string} Time string in MM:SS format (e.g., "25:00", "03:45")
   */
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Update timer display with current remaining time
   * @private
   */
  function updateDisplay() {
    if (timerDisplay) {
      timerDisplay.textContent = formatTime(remainingTime);
    }
  }

  /**
   * Play completion sound using HTML5 Audio
   * Plays alarm.mp3 from audio folder
   * @private
   */
  function playCompletionSound() {
    try {
      if (!alarmAudio) {
        console.warn('[FocusTimer] Alarm audio element not found');
        return;
      }

      // Stop any existing sound
      stopCompletionSound();

      // Reset audio to beginning and play
      alarmAudio.currentTime = 0;
      alarmAudio.play().catch(function(e) {
        console.error('[FocusTimer] Error playing alarm sound:', e);
      });
      
    } catch (e) {
      console.error('[FocusTimer] Error playing completion sound:', e);
    }
  }

  /**
   * Stop completion sound
   * Pauses alarm audio and resets to beginning
   * @private
   */
  function stopCompletionSound() {
    try {
      if (alarmAudio) {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
      }
    } catch (e) {
      console.error('[FocusTimer] Error stopping completion sound:', e);
    }
  }

  /**
   * Show browser notification for timer completion
   * Uses Notification API for system-level alerts
   * @private
   */
  function showBrowserNotification() {
    try {
      // Check if Notification API is supported
      if (!('Notification' in window)) {
        console.warn('[FocusTimer] Browser notifications not supported');
        return;
      }

      // Check permission status
      if (Notification.permission === 'granted') {
        // Permission already granted, show notification
        new Notification('Focus Timer Complete! 🎉', {
          body: 'Time for a break. Great work!',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">⏰</text></svg>',
          requireInteraction: false,
          silent: false
        });
      } else if (Notification.permission !== 'denied') {
        // Request permission
        Notification.requestPermission().then(function(permission) {
          if (permission === 'granted') {
            new Notification('Focus Timer Complete! 🎉', {
              body: 'Time for a break. Great work!',
              icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">⏰</text></svg>',
              requireInteraction: false,
              silent: false
            });
          }
        });
      }
    } catch (e) {
      console.error('[FocusTimer] Error showing browser notification:', e);
    }
  }

  /**
   * Start the countdown timer
   * Begins countdown from current remainingTime
   * @public
   */
  function start() {
    try {
      // Don't start if already running
      if (isRunning) {
        return;
      }

      isRunning = true;
      
      // Disable duration inputs while timer is running
      if (durationInput) {
        durationInput.disabled = true;
      }
      
      if (secondsInput) {
        secondsInput.disabled = true;
      }

      // Hide completion indicator
      if (timerComplete) {
        timerComplete.classList.add('hidden');
      }

      // Start countdown interval (updates every 1000ms)
      intervalId = setInterval(function() {
        try {
          if (remainingTime > 0) {
            remainingTime--;
            updateDisplay();
          } else {
            // Timer reached zero
            stop();
            
            // Show completion indicator
            if (timerComplete) {
              timerComplete.classList.remove('hidden');
            }
            
            // Show notification
            if (typeof NotificationManager !== 'undefined') {
              NotificationManager.showNotification(
                'Focus session complete! Time for a break.',
                'success',
                5000
              );
            }
            
            // Request browser notification permission and show
            showBrowserNotification();
            
            // Play completion sound
            playCompletionSound();
            
            // Publish timer:complete event
            EventBus.emit('timer:complete', { durationMinutes: durationMinutes, durationSeconds: durationSeconds });
          }
        } catch (e) {
          console.error('[FocusTimer] Error in countdown interval:', e);
        }
      }, 1000);
    } catch (e) {
      console.error('[FocusTimer] Error starting timer:', e);
    }
  }

  /**
   * Stop the countdown timer
   * Pauses countdown and preserves current remainingTime
   * Also stops completion sound if playing
   * @public
   */
  function stop() {
    try {
      // Stop completion sound if playing (even if timer not running)
      stopCompletionSound();
      
      // If timer not running, nothing else to do
      if (!isRunning) {
        return;
      }

      isRunning = false;
      
      // Clear countdown interval
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      
      // Re-enable duration inputs
      if (durationInput) {
        durationInput.disabled = false;
      }
      
      if (secondsInput) {
        secondsInput.disabled = false;
      }
    } catch (e) {
      console.error('[FocusTimer] Error stopping timer:', e);
    }
  }

  /**
   * Reset the timer to initial duration
   * Restores remainingTime to duration in seconds
   * @public
   */
  function reset() {
    try {
      // Stop timer if running
      if (isRunning) {
        stop();
      }
      
      // Reset remaining time to full duration (minutes * 60 + seconds)
      remainingTime = (durationMinutes * 60) + durationSeconds;
      updateDisplay();
      
      // Hide completion indicator
      if (timerComplete) {
        timerComplete.classList.add('hidden');
      }
    } catch (e) {
      console.error('[FocusTimer] Error resetting timer:', e);
    }
  }

  /**
   * Set timer duration
   * Only allowed when timer is not running
   * @public
   * @param {number} minutes - Duration in minutes (0-60)
   * @param {number} seconds - Duration in seconds (0-59)
   * @returns {boolean} True if duration was set, false if invalid or timer is running
   */
  function setDuration(minutes, seconds) {
    // Don't allow duration changes while timer is running
    if (isRunning) {
      return false;
    }

    // Validate minutes is an integer between 0 and 60
    const parsedMinutes = parseInt(minutes, 10);
    if (isNaN(parsedMinutes) || parsedMinutes < 0 || parsedMinutes > 60) {
      // Show validation message for invalid duration
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.showNotification(
          'Timer minutes must be between 0 and 60',
          'warning',
          3000
        );
      }
      return false;
    }

    // Validate seconds is an integer between 0 and 59
    const parsedSeconds = parseInt(seconds, 10);
    if (isNaN(parsedSeconds) || parsedSeconds < 0 || parsedSeconds > 59) {
      // Show validation message for invalid seconds
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.showNotification(
          'Timer seconds must be between 0 and 59',
          'warning',
          3000
        );
      }
      return false;
    }

    // Update duration
    durationMinutes = parsedMinutes;
    durationSeconds = parsedSeconds;
    
    // Reset remaining time to new duration
    remainingTime = (durationMinutes * 60) + durationSeconds;
    updateDisplay();
    
    // Save to Local Storage
    StorageManager.set('timerDuration', { minutes: durationMinutes, seconds: durationSeconds });
    
    return true;
  }

  /**
   * Handle duration input change event
   * @private
   */
  function handleDurationChange() {
    try {
      if (durationInput && secondsInput) {
        const newMinutes = durationInput.value;
        const newSeconds = secondsInput.value;
        setDuration(newMinutes, newSeconds);
        // Allow any input values, don't reset on validation failure
      }
    } catch (e) {
      console.error('[FocusTimer] Error handling duration change:', e);
    }
  }

  /**
   * Load saved duration from Local Storage
   * @private
   */
  function loadDuration() {
    const savedDuration = StorageManager.get('timerDuration');
    if (savedDuration !== null) {
      // Check if new format (object with minutes and seconds)
      if (typeof savedDuration === 'object' && savedDuration.minutes !== undefined) {
        // Validate saved duration
        if (savedDuration.minutes >= 0 && savedDuration.minutes <= 60 &&
            savedDuration.seconds >= 0 && savedDuration.seconds <= 59) {
          durationMinutes = savedDuration.minutes;
          durationSeconds = savedDuration.seconds;
        }
      } else if (typeof savedDuration === 'number') {
        // Old format (just minutes), migrate to new format
        if (savedDuration >= 1 && savedDuration <= 60) {
          durationMinutes = savedDuration;
          durationSeconds = 0;
        }
      }
    }
  }

  /**
   * Initialize the FocusTimer
   * Sets up DOM references, loads saved data, and initializes state
   * @public
   */
  function init() {
    try {
      // Initialize StorageManager if not already initialized
      StorageManager.init();
      
      // Get DOM element references
      timerDisplay = document.getElementById('timer-display');
      startButton = document.getElementById('timer-start');
      stopButton = document.getElementById('timer-stop');
      resetButton = document.getElementById('timer-reset');
      durationInput = document.getElementById('timer-duration');
      secondsInput = document.getElementById('timer-seconds');
      timerComplete = document.getElementById('timer-complete');
      alarmAudio = document.getElementById('timer-alarm');
      
      // Check if required elements exist
      if (!timerDisplay) {
        console.error('[FocusTimer] Required DOM element #timer-display not found');
        return;
      }
      
      // Load saved duration from Local Storage
      loadDuration();
      
      // Initialize remaining time to full duration
      remainingTime = (durationMinutes * 60) + durationSeconds;
      
      // Update duration inputs to reflect loaded duration
      if (durationInput) {
        durationInput.value = durationMinutes;
      }
      
      if (secondsInput) {
        secondsInput.value = durationSeconds;
      }
      
      // Initial display update
      updateDisplay();
      
      // Set up event listeners
      if (startButton) {
        startButton.addEventListener('click', start);
      }
      
      if (stopButton) {
        stopButton.addEventListener('click', stop);
      }
      
      if (resetButton) {
        resetButton.addEventListener('click', reset);
      }
      
      if (durationInput) {
        durationInput.addEventListener('change', handleDurationChange);
        durationInput.addEventListener('blur', handleDurationChange);
      }
      
      if (secondsInput) {
        secondsInput.addEventListener('change', handleDurationChange);
        secondsInput.addEventListener('blur', handleDurationChange);
      }
    } catch (e) {
      console.error('[FocusTimer] Initialization failed:', e);
    }
  }

  // Public API
  return {
    init: init,
    start: start,
    stop: stop,
    reset: reset,
    setDuration: setDuration
  };
})();

/**
 * TaskList Module
 * Full CRUD operations for task management with sorting and duplicate prevention.
 * 
 * Features:
 * - Create, read, update, delete tasks
 * - Mark tasks as complete/incomplete
 * - Duplicate prevention (case-insensitive, trimmed)
 * - Sorting by creation order, alphabetical, or completion status
 * - Local Storage persistence
 * - Event publishing for task operations
 * 
 * Task Object Schema:
 * {
 *   id: string,           // UUID or timestamp-based
 *   text: string,         // Task description
 *   completed: boolean,   // Completion status
 *   createdAt: number     // Timestamp (for sorting)
 * }
 * 
 * State Management:
 * - tasks: Array of task objects
 * - sortOrder: String ('creation' | 'alphabetical' | 'completion')
 */
const TaskList = (function() {
  // Private state
  let tasks = [];
  let sortOrder = 'creation'; // Default sort order
  
  // DOM element references
  let taskInput = null;
  let taskAddButton = null;
  let taskList = null;
  let taskSortSelect = null;

  /**
   * Generate unique ID for tasks
   * Uses timestamp + random string for uniqueness
   * @private
   * @returns {string} Unique ID string
   */
  function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Normalize task text for comparison
   * Trims whitespace and converts to lowercase
   * @private
   * @param {string} text - Task text to normalize
   * @returns {string} Normalized text
   */
  function normalizeText(text) {
    return text.trim().toLowerCase();
  }

  /**
   * Check if task text is a duplicate
   * @private
   * @param {string} text - Task text to check
   * @returns {boolean} True if duplicate exists
   */
  function isDuplicate(text) {
    const normalized = normalizeText(text);
    return tasks.some(task => normalizeText(task.text) === normalized);
  }

  /**
   * Save tasks to Local Storage
   * @private
   * @returns {boolean} True if successful
   */
  function saveTasks() {
    return StorageManager.set('tasks', tasks);
  }

  /**
   * Load tasks from Local Storage
   * @private
   */
  function loadTasks() {
    const savedTasks = StorageManager.get('tasks');
    if (savedTasks && Array.isArray(savedTasks)) {
      tasks = savedTasks;
    } else {
      tasks = [];
    }
  }

  /**
   * Load sort order from Local Storage
   * @private
   */
  function loadSortOrder() {
    const savedSortOrder = StorageManager.get('taskSortOrder');
    if (savedSortOrder && ['creation', 'alphabetical', 'completion'].includes(savedSortOrder)) {
      sortOrder = savedSortOrder;
    } else {
      sortOrder = 'creation';
    }
  }

  /**
   * Sort tasks based on current sort order
   * @private
   * @returns {Array} Sorted copy of tasks array
   */
  function getSortedTasks() {
    const tasksCopy = tasks.slice(); // Create copy to avoid mutating original

    switch (sortOrder) {
      case 'alphabetical':
        // Case-insensitive alphabetical sort
        return tasksCopy.sort(function(a, b) {
          return a.text.toLowerCase().localeCompare(b.text.toLowerCase());
        });

      case 'completion':
        // Completed tasks first, then incomplete tasks
        return tasksCopy.sort(function(a, b) {
          if (a.completed === b.completed) {
            return 0;
          }
          return a.completed ? -1 : 1;
        });

      case 'creation':
      default:
        // Sort by creation timestamp (ascending)
        return tasksCopy.sort(function(a, b) {
          return a.createdAt - b.createdAt;
        });
    }
  }

  /**
   * Enter edit mode for a task
   * Replaces task text with an editable input field
   * @private
   * @param {string} id - Task ID
   */
  function enterEditMode(id) {
    try {
      // Find the task item in the DOM
      const taskItem = taskList.querySelector(`[data-id="${id}"]`);
      if (!taskItem) {
        return;
      }

      // Find the task in the tasks array
      const task = tasks.find(function(t) {
        return t.id === id;
      });
      if (!task) {
        return;
      }

      // Find the task text span
      const taskTextSpan = taskItem.querySelector('.task-text');
      if (!taskTextSpan) {
        return;
      }

      // Create edit input field
      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'task-edit-input';
      editInput.value = task.text;

      // Create save button
      const saveButton = document.createElement('button');
      saveButton.className = 'task-save';
      saveButton.textContent = 'Save';

      // Create cancel button
      const cancelButton = document.createElement('button');
      cancelButton.className = 'task-cancel';
      cancelButton.textContent = 'Cancel';

      // Save edit handler
      function saveEdit() {
        try {
          const newText = editInput.value;
          const success = updateTask(id, newText);
          
          // If update failed (empty text), don't exit edit mode
          if (!success) {
            editInput.focus();
          }
        } catch (e) {
          console.error('[TaskList] Error saving task edit:', e);
        }
      }

      // Cancel edit handler
      function cancelEdit() {
        try {
          // Re-render to restore original view
          render();
        } catch (e) {
          console.error('[TaskList] Error canceling task edit:', e);
        }
      }

      // Add event listeners
      saveButton.addEventListener('click', saveEdit);
      cancelButton.addEventListener('click', cancelEdit);
      
      // Allow Enter key to save
      editInput.addEventListener('keypress', function(e) {
        try {
          if (e.key === 'Enter') {
            saveEdit();
          }
        } catch (err) {
          console.error('[TaskList] Error handling Enter key in edit mode:', err);
        }
      });
      
      // Allow Escape key to cancel
      editInput.addEventListener('keydown', function(e) {
        try {
          if (e.key === 'Escape') {
            cancelEdit();
          }
        } catch (err) {
          console.error('[TaskList] Error handling Escape key in edit mode:', err);
        }
      });

      // Replace task text span with edit input
      taskTextSpan.replaceWith(editInput);

      // Replace edit button with save and cancel buttons
      const editButton = taskItem.querySelector('.task-edit');
      if (editButton) {
        editButton.replaceWith(saveButton);
      }

      const deleteButton = taskItem.querySelector('.task-delete');
      if (deleteButton) {
        deleteButton.replaceWith(cancelButton);
      }

      // Focus the input field
      editInput.focus();
      editInput.select();
    } catch (e) {
      console.error('[TaskList] Error entering edit mode:', e);
    }
  }

  /**
   * Render task list to DOM
   * Optimized with document fragments for batch rendering to minimize reflows
   * @public
   */
  function render() {
    try {
      if (!taskList) {
        return;
      }

      // Get sorted tasks
      const sortedTasks = getSortedTasks();

      // Use document fragment for batch DOM manipulation
      // This minimizes reflows by building the entire list in memory first
      const fragment = document.createDocumentFragment();

      // Render each task into the fragment
      sortedTasks.forEach(function(task) {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.setAttribute('data-id', task.id);

        // Checkbox for completion status
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', function() {
          try {
            toggleComplete(task.id);
          } catch (e) {
            console.error('[TaskList] Error toggling task completion:', e);
          }
        });

        // Task text
        const span = document.createElement('span');
        span.className = 'task-text';
        span.textContent = task.text;
        if (task.completed) {
          span.classList.add('completed');
        }

        // Edit button
        const editButton = document.createElement('button');
        editButton.className = 'task-edit';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', function() {
          try {
            enterEditMode(task.id);
          } catch (e) {
            console.error('[TaskList] Error entering edit mode:', e);
          }
        });

        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'task-delete';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', function() {
          try {
            deleteTask(task.id);
          } catch (e) {
            console.error('[TaskList] Error deleting task:', e);
          }
        });

        // Assemble task item
        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(editButton);
        li.appendChild(deleteButton);

        // Add to fragment instead of directly to DOM
        fragment.appendChild(li);
      });

      // Single DOM operation: clear and append all tasks at once
      // This triggers only one reflow instead of one per task
      taskList.innerHTML = '';
      taskList.appendChild(fragment);
    } catch (e) {
      console.error('[TaskList] Error rendering task list:', e);
    }
  }

  /**
   * Create a new task
   * @public
   * @param {string} text - Task description
   * @returns {boolean} True if task was created, false if invalid or duplicate
   */
  function createTask(text) {
    // Validate text is non-empty after trimming
    const trimmedText = text.trim();
    if (!trimmedText) {
      // Show validation message for empty input
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.showNotification(
          'Task cannot be empty',
          'warning',
          2000
        );
      }
      return false;
    }

    // Check for duplicates
    if (isDuplicate(trimmedText)) {
      // Show duplicate notification
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.showNotification(
          'Task already exists',
          'warning',
          3000
        );
      }
      return false;
    }

    // Create new task object
    const newTask = {
      id: generateId(),
      text: trimmedText,
      completed: false,
      createdAt: Date.now()
    };

    // Add to tasks array
    tasks.push(newTask);

    // Save to Local Storage
    saveTasks();

    // Publish event
    EventBus.emit('task:created', newTask);

    // Re-render list
    render();

    return true;
  }

  /**
   * Update an existing task's text
   * @public
   * @param {string} id - Task ID
   * @param {string} text - New task description
   * @returns {boolean} True if task was updated, false if invalid or not found
   */
  function updateTask(id, text) {
    // Validate text is non-empty after trimming
    const trimmedText = text.trim();
    if (!trimmedText) {
      // Show validation message for empty input
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.showNotification(
          'Task cannot be empty',
          'warning',
          2000
        );
      }
      return false;
    }

    // Find task by ID
    const task = tasks.find(function(t) {
      return t.id === id;
    });

    if (!task) {
      return false;
    }

    // Update task text
    task.text = trimmedText;

    // Save to Local Storage
    saveTasks();

    // Publish event
    EventBus.emit('task:updated', task);

    // Re-render list
    render();

    return true;
  }

  /**
   * Delete a task
   * @public
   * @param {string} id - Task ID
   * @returns {boolean} True if task was deleted, false if not found
   */
  function deleteTask(id) {
    // Find task index
    const index = tasks.findIndex(function(t) {
      return t.id === id;
    });

    if (index === -1) {
      return false;
    }

    // Remove task from array
    const deletedTask = tasks.splice(index, 1)[0];

    // Save to Local Storage
    saveTasks();

    // Publish event
    EventBus.emit('task:deleted', deletedTask);

    // Re-render list
    render();

    return true;
  }

  /**
   * Toggle task completion status
   * @public
   * @param {string} id - Task ID
   * @returns {boolean} True if task was toggled, false if not found
   */
  function toggleComplete(id) {
    // Find task by ID
    const task = tasks.find(function(t) {
      return t.id === id;
    });

    if (!task) {
      return false;
    }

    // Toggle completion status
    task.completed = !task.completed;

    // Save to Local Storage
    saveTasks();

    // Publish event
    EventBus.emit('task:updated', task);

    // Re-render list
    render();

    return true;
  }

  /**
   * Set sort order for task list
   * @public
   * @param {string} order - Sort order ('creation' | 'alphabetical' | 'completion')
   */
  function setSortOrder(order) {
    // Validate sort order
    if (!['creation', 'alphabetical', 'completion'].includes(order)) {
      return;
    }

    sortOrder = order;

    // Save to Local Storage
    StorageManager.set('taskSortOrder', sortOrder);

    // Re-render with new sort order
    render();
  }

  /**
   * Handle add task button click
   * @private
   */
  function handleAddTask() {
    try {
      if (!taskInput) {
        return;
      }

      const text = taskInput.value;
      const success = createTask(text);

      // Clear input if task was created successfully
      if (success) {
        taskInput.value = '';
      }
    } catch (e) {
      console.error('[TaskList] Error handling add task:', e);
    }
  }

  /**
   * Handle sort order change
   * @private
   */
  function handleSortChange() {
    try {
      if (!taskSortSelect) {
        return;
      }

      setSortOrder(taskSortSelect.value);
    } catch (e) {
      console.error('[TaskList] Error handling sort change:', e);
    }
  }

  /**
   * Initialize the TaskList module
   * Sets up DOM references, loads saved data, and initializes state
   * @public
   */
  function init() {
    try {
      // Initialize StorageManager if not already initialized
      StorageManager.init();

      // Get DOM element references
      taskInput = document.getElementById('task-input');
      taskAddButton = document.getElementById('task-add');
      taskList = document.getElementById('task-list');
      taskSortSelect = document.getElementById('task-sort-select');
      // Note: taskNotification is no longer used - using NotificationManager instead

      // Check if required elements exist
      if (!taskList) {
        console.error('[TaskList] Required DOM element #task-list not found');
        return;
      }

      // Load saved tasks from Local Storage
      loadTasks();

      // Load saved sort order from Local Storage
      loadSortOrder();

      // Update sort select to reflect loaded sort order
      if (taskSortSelect) {
        taskSortSelect.value = sortOrder;
      }

      // Initial render
      render();

      // Set up event listeners
      if (taskAddButton) {
        taskAddButton.addEventListener('click', handleAddTask);
      }

      if (taskInput) {
        // Allow Enter key to add task
        taskInput.addEventListener('keypress', function(e) {
          try {
            if (e.key === 'Enter') {
              handleAddTask();
            }
          } catch (err) {
            console.error('[TaskList] Error handling Enter key:', err);
          }
        });
      }

      if (taskSortSelect) {
        taskSortSelect.addEventListener('change', handleSortChange);
      }
    } catch (e) {
      console.error('[TaskList] Initialization failed:', e);
    }
  }

  // Public API
  return {
    init: init,
    createTask: createTask,
    updateTask: updateTask,
    deleteTask: deleteTask,
    toggleComplete: toggleComplete,
    setSortOrder: setSortOrder,
    render: render
  };
})();

/**
 * QuickLinks Module
 * Manages and provides access to favorite website shortcuts.
 * 
 * Features:
 * - Create and delete links
 * - Link data model (id, name, url)
 * - Local Storage persistence
 * - Render links as clickable anchors
 * 
 * Link Object Schema:
 * {
 *   id: string,      // UUID or timestamp-based
 *   name: string,    // Display name
 *   url: string      // Full URL
 * }
 * 
 * State Management:
 * - links: Array of link objects
 */
const QuickLinks = (function() {
  // Private state
  let links = [];
  
  // DOM element references
  let linkNameInput = null;
  let linkUrlInput = null;
  let linkAddButton = null;
  let linkList = null;

  /**
   * Generate unique ID for links
   * Uses timestamp + random string for uniqueness
   * @private
   * @returns {string} Unique ID string
   */
  function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Save links to Local Storage
   * @private
   * @returns {boolean} True if successful
   */
  function saveLinks() {
    return StorageManager.set('links', links);
  }

  /**
   * Load links from Local Storage
   * @private
   */
  function loadLinks() {
    const savedLinks = StorageManager.get('links');
    if (savedLinks && Array.isArray(savedLinks)) {
      links = savedLinks;
    } else {
      links = [];
    }
  }

  /**
   * Render link list to DOM
   * @public
   */
  function render() {
    try {
      if (!linkList) {
        return;
      }

      // Clear current list
      linkList.innerHTML = '';

      // Render each link
      links.forEach(function(link) {
        const li = document.createElement('li');
        li.className = 'link-item';
        li.setAttribute('data-id', link.id);

        // Link anchor
        const anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.textContent = link.name;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';

        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'link-delete';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', function() {
          try {
            deleteLink(link.id);
          } catch (e) {
            console.error('[QuickLinks] Error deleting link:', e);
          }
        });

        // Assemble link item
        li.appendChild(anchor);
        li.appendChild(deleteButton);

        linkList.appendChild(li);
      });
    } catch (e) {
      console.error('[QuickLinks] Error rendering link list:', e);
    }
  }

  /**
   * Create a new link
   * @public
   * @param {string} name - Link display name
   * @param {string} url - Link URL
   * @returns {boolean} True if link was created, false if invalid
   */
  function createLink(name, url) {
    // Validate name and URL are non-empty after trimming
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    
    if (!trimmedName || !trimmedUrl) {
      // Show validation message for empty inputs
      if (typeof NotificationManager !== 'undefined') {
        if (!trimmedName && !trimmedUrl) {
          NotificationManager.showNotification(
            'Link name and URL cannot be empty',
            'warning',
            2000
          );
        } else if (!trimmedName) {
          NotificationManager.showNotification(
            'Link name cannot be empty',
            'warning',
            2000
          );
        } else {
          NotificationManager.showNotification(
            'Link URL cannot be empty',
            'warning',
            2000
          );
        }
      }
      return false;
    }

    // Create new link object
    const newLink = {
      id: generateId(),
      name: trimmedName,
      url: trimmedUrl
    };

    // Add to links array
    links.push(newLink);

    // Save to Local Storage
    saveLinks();

    // Re-render list
    render();

    return true;
  }

  /**
   * Delete a link
   * @public
   * @param {string} id - Link ID
   * @returns {boolean} True if link was deleted, false if not found
   */
  function deleteLink(id) {
    // Find link index
    const index = links.findIndex(function(l) {
      return l.id === id;
    });

    if (index === -1) {
      return false;
    }

    // Remove link from array
    links.splice(index, 1);

    // Save to Local Storage
    saveLinks();

    // Re-render list
    render();

    return true;
  }

  /**
   * Handle add link button click
   * @private
   */
  function handleAddLink() {
    try {
      if (!linkNameInput || !linkUrlInput) {
        return;
      }

      const name = linkNameInput.value;
      const url = linkUrlInput.value;
      const success = createLink(name, url);

      // Clear inputs if link was created successfully
      if (success) {
        linkNameInput.value = '';
        linkUrlInput.value = '';
      }
    } catch (e) {
      console.error('[QuickLinks] Error handling add link:', e);
    }
  }

  /**
   * Initialize the QuickLinks module
   * Sets up DOM references, loads saved data, and initializes state
   * @public
   */
  function init() {
    try {
      // Initialize StorageManager if not already initialized
      StorageManager.init();
      
      // Get DOM element references
      linkNameInput = document.getElementById('link-name');
      linkUrlInput = document.getElementById('link-url');
      linkAddButton = document.getElementById('link-add');
      linkList = document.getElementById('link-list');
      
      // Check if required elements exist
      if (!linkList) {
        console.error('[QuickLinks] Required DOM element #link-list not found');
        return;
      }
      
      // Load saved links from Local Storage
      loadLinks();

      // Initial render
      render();

      // Set up event listeners
      if (linkAddButton) {
        linkAddButton.addEventListener('click', handleAddLink);
      }

      if (linkUrlInput) {
        // Allow Enter key to add link
        linkUrlInput.addEventListener('keypress', function(e) {
          try {
            if (e.key === 'Enter') {
              handleAddLink();
            }
          } catch (err) {
            console.error('[QuickLinks] Error handling Enter key:', err);
          }
        });
      }
    } catch (e) {
      console.error('[QuickLinks] Initialization failed:', e);
    }
  }

  // Public API
  return {
    init: init,
    createLink: createLink,
    deleteLink: deleteLink,
    render: render
  };
})();

/**
 * ThemeManager Module
 * Manages light/dark mode display with Local Storage persistence.
 * 
 * Features:
 * - Toggle between light and dark themes
 * - Default 'dark' theme
 * - Applies theme by adding/removing CSS class on body element
 * - Local Storage persistence
 * - Event publishing for theme changes
 * - Updates toggle button icon (🌙 for dark mode, ☀️ for light mode)
 * 
 * State Management:
 * - currentTheme: String ('light' | 'dark')
 */
const ThemeManager = (function() {
  // Private state
  let currentTheme = 'dark'; // Default theme
  
  // DOM element references
  let themeToggleButton = null;
  let themeIcon = null;

  /**
   * Apply theme to body element
   * Adds/removes CSS class based on current theme
   * @private
   */
  function applyTheme() {
    // Remove both theme classes first
    document.body.classList.remove('light-theme', 'dark-theme');
    
    // Add current theme class
    if (currentTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.add('dark-theme');
    }
    
    // Update toggle button icon
    updateIcon();
  }

  /**
   * Update toggle button icon based on current theme
   * @private
   */
  function updateIcon() {
    if (!themeIcon) {
      return;
    }
    
    // 🌙 for dark mode, ☀️ for light mode
    if (currentTheme === 'dark') {
      themeIcon.textContent = '🌙';
    } else {
      themeIcon.textContent = '☀️';
    }
  }

  /**
   * Save current theme to Local Storage
   * @private
   */
  function saveTheme() {
    StorageManager.set('theme', currentTheme);
  }

  /**
   * Load saved theme from Local Storage
   * @private
   */
  function loadTheme() {
    const savedTheme = StorageManager.get('theme');
    
    // Validate saved theme
    if (savedTheme === 'light' || savedTheme === 'dark') {
      currentTheme = savedTheme;
    } else {
      // Default to 'dark' if no valid saved theme
      currentTheme = 'dark';
    }
  }

  /**
   * Toggle between light and dark themes
   * @public
   */
  function toggle() {
    // Switch theme
    if (currentTheme === 'dark') {
      currentTheme = 'light';
    } else {
      currentTheme = 'dark';
    }
    
    // Apply new theme
    applyTheme();
    
    // Save to Local Storage
    saveTheme();
    
    // Publish event
    EventBus.emit('theme:changed', { theme: currentTheme });
  }

  /**
   * Set specific theme
   * @public
   * @param {string} theme - Theme to set ('light' | 'dark')
   * @returns {boolean} True if theme was set, false if invalid
   */
  function setTheme(theme) {
    // Validate theme
    if (theme !== 'light' && theme !== 'dark') {
      return false;
    }
    
    // Update current theme
    currentTheme = theme;
    
    // Apply theme
    applyTheme();
    
    // Save to Local Storage
    saveTheme();
    
    // Publish event
    EventBus.emit('theme:changed', { theme: currentTheme });
    
    return true;
  }

  /**
   * Get current theme
   * @public
   * @returns {string} Current theme ('light' | 'dark')
   */
  function getCurrentTheme() {
    return currentTheme;
  }

  /**
   * Handle toggle button click
   * @private
   */
  function handleToggleClick() {
    try {
      toggle();
    } catch (e) {
      console.error('[ThemeManager] Error handling toggle click:', e);
    }
  }

  /**
   * Initialize the ThemeManager
   * Sets up DOM references, loads saved theme, and applies initial theme
   * @public
   */
  function init() {
    try {
      // Initialize StorageManager if not already initialized
      StorageManager.init();
      
      // Get DOM element references
      themeToggleButton = document.getElementById('theme-toggle');
      themeIcon = document.querySelector('.theme-icon');
      
      // Load saved theme from Local Storage BEFORE applying
      loadTheme();
      
      // Apply the loaded theme
      applyTheme();
      
      // Set up event listener for toggle button
      if (themeToggleButton) {
        themeToggleButton.addEventListener('click', handleToggleClick);
      }
    } catch (e) {
      console.error('[ThemeManager] Initialization failed:', e);
    }
  }

  // Public API
  return {
    init: init,
    toggle: toggle,
    setTheme: setTheme,
    getCurrentTheme: getCurrentTheme
  };
})();

/**
 * DataManager Module
 * Export and import all dashboard data as JSON file.
 * 
 * Features:
 * - Export all localStorage data to JSON file
 * - Import JSON file to restore data
 * - Validates imported data structure
 * - Downloads file with timestamp
 * 
 * Exported Data Structure:
 * {
 *   userName: string,
 *   timerDuration: number,
 *   tasks: Array,
 *   taskSortOrder: string,
 *   links: Array,
 *   theme: string,
 *   exportedAt: string (ISO timestamp)
 * }
 */
const DataManager = (function() {
  // DOM element references
  let exportButton = null;
  let importButton = null;
  let importFileInput = null;

  /**
   * Get all dashboard data from localStorage
   * @private
   * @returns {Object} All dashboard data
   */
  function getAllData() {
    return {
      userName: StorageManager.get('userName') || '',
      timerDuration: StorageManager.get('timerDuration') || { minutes: 25, seconds: 0 },
      tasks: StorageManager.get('tasks') || [],
      taskSortOrder: StorageManager.get('taskSortOrder') || 'creation',
      links: StorageManager.get('links') || [],
      theme: StorageManager.get('theme') || 'dark',
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Export data as JSON file
   * @public
   */
  function exportData() {
    try {
      // Get all data
      const data = getAllData();

      // Convert to JSON string
      const jsonString = JSON.stringify(data, null, 2);

      // Create blob
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `dashboard-data-${timestamp}.json`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up URL
      URL.revokeObjectURL(url);

      // Show success notification
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.showNotification(
          'Data exported successfully',
          'success',
          3000
        );
      }
    } catch (e) {
      console.error('[DataManager] Error exporting data:', e);
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.showNotification(
          'Export failed',
          'error',
          3000
        );
      }
    }
  }

  /**
   * Validate imported data structure
   * @private
   * @param {Object} data - Data to validate
   * @returns {boolean} True if valid
   */
  function validateData(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check required fields exist
    const hasValidStructure = (
      'userName' in data &&
      'timerDuration' in data &&
      'tasks' in data &&
      'taskSortOrder' in data &&
      'links' in data &&
      'theme' in data
    );

    if (!hasValidStructure) {
      return false;
    }

    // Validate types
    if (typeof data.userName !== 'string') return false;
    
    // Timer duration can be number (old format) or object (new format)
    if (typeof data.timerDuration === 'number') {
      // Old format, valid
    } else if (typeof data.timerDuration === 'object') {
      // New format, check structure
      if (typeof data.timerDuration.minutes !== 'number' || 
          typeof data.timerDuration.seconds !== 'number') {
        return false;
      }
    } else {
      return false;
    }
    
    if (!Array.isArray(data.tasks)) return false;
    if (typeof data.taskSortOrder !== 'string') return false;
    if (!Array.isArray(data.links)) return false;
    if (typeof data.theme !== 'string') return false;

    return true;
  }

  /**
   * Import data from JSON file
   * @public
   * @param {File} file - JSON file to import
   */
  function importData(file) {
    try {
      // Validate file type
      if (!file.name.endsWith('.json')) {
        if (typeof NotificationManager !== 'undefined') {
          NotificationManager.showNotification(
            'Please select a JSON file',
            'warning',
            3000
          );
        }
        return;
      }

      // Read file
      const reader = new FileReader();
      
      reader.onload = function(e) {
        try {
          // Parse JSON
          const data = JSON.parse(e.target.result);

          // Validate data structure
          if (!validateData(data)) {
            if (typeof NotificationManager !== 'undefined') {
              NotificationManager.showNotification(
                'Invalid data format',
                'error',
                3000
              );
            }
            return;
          }

          // Save all data to localStorage
          StorageManager.set('userName', data.userName);
          StorageManager.set('timerDuration', data.timerDuration);
          StorageManager.set('tasks', data.tasks);
          StorageManager.set('taskSortOrder', data.taskSortOrder);
          StorageManager.set('links', data.links);
          StorageManager.set('theme', data.theme);

          // Show success notification
          if (typeof NotificationManager !== 'undefined') {
            NotificationManager.showNotification(
              'Data imported successfully. Reloading...',
              'success',
              2000
            );
          }

          // Reload page to apply imported data
          setTimeout(function() {
            window.location.reload();
          }, 2000);

        } catch (parseError) {
          console.error('[DataManager] Error parsing JSON:', parseError);
          if (typeof NotificationManager !== 'undefined') {
            NotificationManager.showNotification(
              'Invalid JSON file',
              'error',
              3000
            );
          }
        }
      };

      reader.onerror = function() {
        console.error('[DataManager] Error reading file');
        if (typeof NotificationManager !== 'undefined') {
          NotificationManager.showNotification(
            'Error reading file',
            'error',
            3000
          );
        }
      };

      reader.readAsText(file);

    } catch (e) {
      console.error('[DataManager] Error importing data:', e);
      if (typeof NotificationManager !== 'undefined') {
        NotificationManager.showNotification(
          'Import failed',
          'error',
          3000
        );
      }
    }
  }

  /**
   * Handle export button click
   * @private
   */
  function handleExportClick() {
    try {
      exportData();
    } catch (e) {
      console.error('[DataManager] Error handling export click:', e);
    }
  }

  /**
   * Handle import button click
   * @private
   */
  function handleImportClick() {
    try {
      // Trigger file input click
      if (importFileInput) {
        importFileInput.click();
      }
    } catch (e) {
      console.error('[DataManager] Error handling import click:', e);
    }
  }

  /**
   * Handle file input change
   * @private
   */
  function handleFileChange(e) {
    try {
      const file = e.target.files[0];
      if (file) {
        importData(file);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    } catch (err) {
      console.error('[DataManager] Error handling file change:', err);
    }
  }

  /**
   * Initialize DataManager
   * @public
   */
  function init() {
    try {
      // Get DOM element references
      exportButton = document.getElementById('data-export');
      importButton = document.getElementById('data-import');
      importFileInput = document.getElementById('data-import-file');

      // Set up event listeners
      if (exportButton) {
        exportButton.addEventListener('click', handleExportClick);
      }

      if (importButton) {
        importButton.addEventListener('click', handleImportClick);
      }

      if (importFileInput) {
        importFileInput.addEventListener('change', handleFileChange);
      }

      console.log('[DataManager] Initialized');
    } catch (e) {
      console.error('[DataManager] Initialization failed:', e);
    }
  }

  // Public API
  return {
    init: init,
    exportData: exportData,
    importData: importData
  };
})();

/**
 * Application Initialization Module
 * Coordinates browser compatibility checks and component initialization.
 * 
 * Features:
 * - Browser support detection (Local Storage, Date, setInterval)
 * - Compatibility notice display for unsupported browsers
 * - Centralized component initialization in correct order
 * - Error handling for missing DOM elements
 * 
 * Initialization Order:
 * 1. Check browser support
 * 2. Initialize StorageManager (foundation for all components)
 * 3. Initialize EventBus (communication layer)
 * 4. Initialize ThemeManager (affects visual appearance)
 * 5. Initialize UI components (GreetingComponent, FocusTimer, TaskList, QuickLinks)
 */
const DashboardApp = (function() {
  /**
   * Check if browser supports required Web APIs
   * @private
   * @returns {Object} Object with support status and missing features
   */
  function checkBrowserSupport() {
    const missingFeatures = [];
    
    // Check for Local Storage support
    try {
      if (typeof Storage === 'undefined' || typeof localStorage === 'undefined') {
        missingFeatures.push('Local Storage');
      } else {
        // Test if Local Storage is actually accessible (can be disabled in private mode)
        const testKey = '__browser_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
      }
    } catch (e) {
      missingFeatures.push('Local Storage');
    }
    
    // Check for Date support
    if (typeof Date === 'undefined') {
      missingFeatures.push('Date');
    }
    
    // Check for setInterval support
    if (typeof setInterval === 'undefined') {
      missingFeatures.push('setInterval');
    }
    
    return {
      isSupported: missingFeatures.length === 0,
      missingFeatures: missingFeatures
    };
  }

  /**
   * Display compatibility notice for unsupported browsers
   * @private
   * @param {Array<string>} missingFeatures - List of missing browser features
   */
  function displayCompatibilityNotice(missingFeatures) {
    // Create compatibility notice element
    const notice = document.createElement('div');
    notice.id = 'compatibility-notice';
    notice.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #ff4444; color: white; padding: 20px; text-align: center; z-index: 9999; font-family: sans-serif;';
    
    // Create notice content
    const heading = document.createElement('h2');
    heading.textContent = 'Browser Not Supported';
    heading.style.margin = '0 0 10px 0';
    
    const message = document.createElement('p');
    message.textContent = 'This browser is missing required features: ' + missingFeatures.join(', ');
    message.style.margin = '0 0 10px 0';
    
    const recommendation = document.createElement('p');
    recommendation.textContent = 'Please use the latest version of Chrome, Firefox, Edge, or Safari.';
    recommendation.style.margin = '0';
    
    // Assemble notice
    notice.appendChild(heading);
    notice.appendChild(message);
    notice.appendChild(recommendation);
    
    // Insert at the beginning of body
    document.body.insertBefore(notice, document.body.firstChild);
    
    // Log to console
    console.error('[DashboardApp] Browser not supported. Missing features:', missingFeatures);
  }

  /**
   * Initialize all dashboard components in correct order
   * @private
   * @returns {boolean} True if all components initialized successfully
   */
  function initializeComponents() {
    let allSuccess = true;
    
    // 1. Initialize StorageManager (foundation for all components)
    try {
      console.log('[DashboardApp] Initializing StorageManager...');
      const storageAvailable = StorageManager.init();
      if (!storageAvailable) {
        console.warn('[DashboardApp] StorageManager initialized but Local Storage is unavailable');
      }
    } catch (e) {
      console.error('[DashboardApp] StorageManager initialization failed:', e);
      allSuccess = false;
    }
    
    // 2. EventBus doesn't need initialization (stateless pub/sub)
    console.log('[DashboardApp] EventBus ready');
    
    // 3. Initialize ThemeManager (affects visual appearance of all components)
    try {
      console.log('[DashboardApp] Initializing ThemeManager...');
      ThemeManager.init();
    } catch (e) {
      console.error('[DashboardApp] ThemeManager initialization failed:', e);
      allSuccess = false;
    }
    
    // 4. Initialize GreetingComponent
    try {
      console.log('[DashboardApp] Initializing GreetingComponent...');
      GreetingComponent.init();
    } catch (e) {
      console.error('[DashboardApp] GreetingComponent initialization failed:', e);
      allSuccess = false;
    }
    
    // 5. Initialize FocusTimer
    try {
      console.log('[DashboardApp] Initializing FocusTimer...');
      FocusTimer.init();
    } catch (e) {
      console.error('[DashboardApp] FocusTimer initialization failed:', e);
      allSuccess = false;
    }
    
    // 6. Initialize TaskList
    try {
      console.log('[DashboardApp] Initializing TaskList...');
      TaskList.init();
    } catch (e) {
      console.error('[DashboardApp] TaskList initialization failed:', e);
      allSuccess = false;
    }
    
    // 7. Initialize QuickLinks
    try {
      console.log('[DashboardApp] Initializing QuickLinks...');
      QuickLinks.init();
    } catch (e) {
      console.error('[DashboardApp] QuickLinks initialization failed:', e);
      allSuccess = false;
    }
    
    // 8. Initialize DataManager
    try {
      console.log('[DashboardApp] Initializing DataManager...');
      DataManager.init();
    } catch (e) {
      console.error('[DashboardApp] DataManager initialization failed:', e);
      allSuccess = false;
    }
    
    return allSuccess;
  }

  /**
   * Main initialization function
   * Checks browser support and initializes all components
   * @public
   */
  function init() {
    console.log('[DashboardApp] Starting initialization...');
    
    // Check browser support
    const supportCheck = checkBrowserSupport();
    
    if (!supportCheck.isSupported) {
      // Display compatibility notice and stop initialization
      displayCompatibilityNotice(supportCheck.missingFeatures);
      console.error('[DashboardApp] Initialization aborted due to unsupported browser');
      return false;
    }
    
    console.log('[DashboardApp] Browser support check passed');
    
    // Initialize all components
    const success = initializeComponents();
    
    if (success) {
      console.log('[DashboardApp] All components initialized successfully');
    } else {
      console.warn('[DashboardApp] Some components failed to initialize (see errors above)');
    }
    
    return success;
  }

  // Public API
  return {
    init: init
  };
})();

// Export modules to window object for testing
// IMPORTANT: Export BEFORE auto-initialization to ensure modules are available even if init fails
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
  window.EventBus = EventBus;
  window.NotificationManager = NotificationManager;
  window.GreetingComponent = GreetingComponent;
  window.FocusTimer = FocusTimer;
  window.TaskList = TaskList;
  window.QuickLinks = QuickLinks;
  window.ThemeManager = ThemeManager;
  window.DataManager = DataManager;
  window.DashboardApp = DashboardApp;
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    try {
      DashboardApp.init();
    } catch (e) {
      console.error('[DashboardApp] Error during initialization:', e);
    }
  });
} else {
  // DOM is already ready
  try {
    DashboardApp.init();
  } catch (e) {
    console.error('[DashboardApp] Error during initialization:', e);
  }
}
