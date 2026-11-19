import { createSlice } from '@reduxjs/toolkit';

export interface ThemeState {
  theme: 'light' | 'dark';
}

const getInitialTheme = (): ThemeState => {
  if (typeof window !== 'undefined') {
    try {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'dark' || storedTheme === 'light') {
        return { theme: storedTheme };
      }
      if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        return { theme: 'dark' };
      }
    } catch {
      /* storage blocked */
    }
  }
  return { theme: 'light' };
};

const initialState: ThemeState = getInitialTheme();

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('theme', state.theme);
        } catch {
          /* storage blocked */
        }
      }
    },
  },
});

export const { toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
