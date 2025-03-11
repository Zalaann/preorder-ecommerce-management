/**
 * Theme Configuration
 * 
 * This file contains the theme configuration for the application.
 * It defines color palettes, spacing, and other design tokens.
 */

export const themeColors = {
  // Primary brand color
  primary: {
    light: '#9333ea', // Purple 600
    DEFAULT: '#7e22ce', // Purple 700
    dark: '#6b21a8', // Purple 800
  },
  
  // Secondary accent color
  secondary: {
    light: '#f97316', // Orange 500
    DEFAULT: '#ea580c', // Orange 600
    dark: '#c2410c', // Orange 700
  },
  
  // Success color
  success: {
    light: '#22c55e', // Green 500
    DEFAULT: '#16a34a', // Green 600
    dark: '#15803d', // Green 700
  },
  
  // Warning color
  warning: {
    light: '#facc15', // Yellow 400
    DEFAULT: '#eab308', // Yellow 500
    dark: '#ca8a04', // Yellow 600
  },
  
  // Error/Danger color
  error: {
    light: '#ef4444', // Red 500
    DEFAULT: '#dc2626', // Red 600
    dark: '#b91c1c', // Red 700
  },
  
  // Info color
  info: {
    light: '#3b82f6', // Blue 500
    DEFAULT: '#2563eb', // Blue 600
    dark: '#1d4ed8', // Blue 700
  },
  
  // Neutral colors for backgrounds, text, etc.
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
};

// Modal design tokens
export const modalStyles = {
  // Base styles for all modals
  base: {
    backdropFilter: 'blur(8px)',
    background: 'bg-white/95 dark:bg-gray-900/95',
    border: 'border border-gray-200/50 dark:border-gray-700/50',
    shadow: 'shadow-xl',
    rounded: 'rounded-2xl',
  },
  
  // Header styles
  header: {
    background: 'bg-gray-50/80 dark:bg-gray-800/80',
    border: 'border-b border-gray-200/50 dark:border-gray-700/50',
    padding: 'p-5',
  },
  
  // Content styles
  content: {
    padding: 'p-5',
  },
  
  // Footer styles
  footer: {
    background: 'bg-gray-50/80 dark:bg-gray-800/80',
    border: 'border-t border-gray-200/50 dark:border-gray-700/50',
    padding: 'p-4',
  },
};

// Card design tokens
export const cardStyles = {
  base: {
    background: 'bg-white dark:bg-gray-800',
    border: 'border border-gray-200 dark:border-gray-700',
    shadow: 'shadow-md hover:shadow-lg',
    rounded: 'rounded-xl',
    transition: 'transition-all duration-200',
  },
  
  header: {
    background: 'bg-gray-50 dark:bg-gray-800/80',
    border: 'border-b border-gray-200 dark:border-gray-700',
    padding: 'p-4',
  },
  
  content: {
    padding: 'p-5',
  },
  
  footer: {
    background: 'bg-gray-50 dark:bg-gray-800/80',
    border: 'border-t border-gray-200 dark:border-gray-700',
    padding: 'p-4',
  },
};

// Button variants
export const buttonStyles = {
  primary: 'bg-primary hover:bg-primary-dark text-white',
  secondary: 'bg-secondary hover:bg-secondary-dark text-white',
  outline: 'bg-transparent border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700',
  ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
  link: 'bg-transparent underline-offset-4 hover:underline text-primary dark:text-primary-light',
  danger: 'bg-error hover:bg-error-dark text-white',
};

// Form element styles
export const formStyles = {
  input: {
    base: 'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    focus: 'focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary-light/50 focus:border-primary dark:focus:border-primary-light',
  },
  
  label: {
    base: 'text-sm font-medium text-gray-700 dark:text-gray-300',
  },
  
  select: {
    base: 'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    focus: 'focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary-light/50 focus:border-primary dark:focus:border-primary-light',
  },
};

// Animation presets
export const animations = {
  fadeIn: 'animate-in fade-in duration-300',
  slideIn: 'animate-in slide-in-from-bottom-5 duration-300',
  scaleIn: 'animate-in zoom-in-95 duration-300',
};

// Z-index layers
export const zLayers = {
  modal: 50,
  dropdown: 40,
  sticky: 30,
  fixed: 20,
  base: 10,
};

// Export a function to combine classes conditionally
export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
} 