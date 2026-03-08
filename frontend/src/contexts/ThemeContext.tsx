import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_VARS: Record<string, string> = {
  '--color-bg': '#000000',
  '--color-surface': '#0A0A0A',
  '--color-surface-hover': '#111111',
  '--color-border': '#1A1A1A',
  '--color-border-subtle': '#141414',
  '--color-text': '#FFFFFF',
  '--color-text-secondary': '#808080',
  '--color-text-muted': '#4A4A4A',
};

const LIGHT_VARS: Record<string, string> = {
  '--color-bg': '#F5F5F5',
  '--color-surface': '#FFFFFF',
  '--color-surface-hover': '#F0F0F0',
  '--color-border': '#E0E0E0',
  '--color-border-subtle': '#EBEBEB',
  '--color-text': '#111111',
  '--color-text-secondary': '#555555',
  '--color-text-muted': '#999999',
};

function applyTheme(theme: Theme) {
  const vars = theme === 'dark' ? DARK_VARS : LIGHT_VARS;
  const root = document.documentElement;
  for (const [key, val] of Object.entries(vars)) {
    root.style.setProperty(key, val);
  }
  // Body bg
  document.body.style.backgroundColor = vars['--color-bg'];
  document.body.style.color = vars['--color-text'];
  // Set data attribute for components that need conditional styling
  root.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('caa_theme') as Theme | null;
    return saved || 'dark';
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('caa_theme', t);
  };

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
