// Production configuration
export const PRODUCTION_CONFIG = {
  // Disable console logs in production
  enableLogging: false,
  
  // Enable error tracking
  enableErrorTracking: true,
  
  // Performance optimizations
  enablePerformanceMonitoring: true,
  
  // Security settings
  strictMode: true,
  
  // Cache settings
  enableCaching: true,
  
  // Analytics (if needed)
  enableAnalytics: false
};

// Production environment check
export const isProduction = () => {
  return process.env.NODE_ENV === 'production' || 
         window.location.hostname !== 'localhost';
};

// Safe logging function
export const safeLog = (...args) => {
  if (!isProduction() && PRODUCTION_CONFIG.enableLogging) {
    console.log(...args);
  }
};

// Safe error logging
export const safeError = (...args) => {
  if (PRODUCTION_CONFIG.enableErrorTracking) {
    console.error(...args);
  }
};
