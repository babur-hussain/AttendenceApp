/**
 * Theme Hook
 * 
 * Custom hook for accessing and switching themes.
 * Provides theme-aware values and utilities.
 */

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme } from './light';
import { darkTheme } from './dark';

type ThemeMode = 'light' | 'dark' | 'system';
type Theme = typeof lightTheme | typeof darkTheme;

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = '@ks_attendance_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
        setThemeModeState(saved as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    await setThemeMode(nextMode);
  };

  // Determine effective theme
  const effectiveScheme =
    themeMode === 'system' ? systemColorScheme || 'light' : themeMode;
  const isDark = effectiveScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  if (isLoading) {
    return null; // Or a splash screen
  }

  const value: ThemeContextValue = {
    theme,
    themeMode,
    isDark,
    setThemeMode,
    toggleTheme,
  };

  return (
    React.createElement(ThemeContext.Provider, { value }, children)
  );
}

/**
 * Hook to access current theme
 * 
 * @example
 * const { theme, isDark, toggleTheme } = useTheme();
 * 
 * <View style={{ backgroundColor: theme.colors.background.primary }}>
 *   <Text style={{ color: theme.colors.text.primary }}>Hello</Text>
 * </View>
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

/**
 * Hook to get theme-aware color values
 * 
 * @example
 * const colors = useThemeColors();
 * <View style={{ backgroundColor: colors.background.primary }} />
 */
export function useThemeColors() {
  const { theme } = useTheme();
  return theme.colors;
}

/**
 * Hook to get spacing values
 * 
 * @example
 * const spacing = useSpacing();
 * <View style={{ padding: spacing[4] }} />
 */
export function useSpacing() {
  const { theme } = useTheme();
  return theme.spacing;
}

/**
 * Hook to get typography values
 * 
 * @example
 * const typography = useTypography();
 * <Text style={{ fontSize: typography.fontSize.lg }} />
 */
export function useTypography() {
  const { theme } = useTheme();
  return theme.typography;
}

/**
 * Hook to get shadow presets
 * 
 * @example
 * const shadows = useShadows();
 * <View style={{ ...shadows.md }} />
 */
export function useShadows() {
  const { theme } = useTheme();
  return theme.shadows;
}

/**
 * Utility to create theme-aware styles
 * 
 * @example
 * const createStyles = makeStyles((theme) => ({
 *   container: {
 *     backgroundColor: theme.colors.background.primary,
 *     padding: theme.spacing[4],
 *   }
 * }));
 * 
 * // In component:
 * const styles = createStyles(theme);
 */
export function makeStyles<T>(
  stylesFn: (theme: Theme) => T
): (theme: Theme) => T {
  return stylesFn;
}
