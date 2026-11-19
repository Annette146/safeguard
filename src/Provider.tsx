import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from './slices/stores/ThemeStore';
import { I18nProvider } from './lib/i18n';
import { AuthProvider } from './auth/AuthProvider';

/** Root context providers (Redux theme store, i18n, and SAFEGUARD auth). */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <I18nProvider>
        <AuthProvider>{children}</AuthProvider>
      </I18nProvider>
    </Provider>
  );
}
