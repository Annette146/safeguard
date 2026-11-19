import { createContext, useContext, useState, type ReactNode } from 'react';

const en = {
  tagline: 'Report incidents safely. Get help fast.',
  welcome: 'Welcome to SAFEGUARD',
  welcomeBody: 'Report what happened, share evidence securely and follow up with investigators. You can stay anonymous.',
  sos: 'SOS – REQUEST EMERGENCY HELP',
  sosShort: 'SOS',
  report: 'Report an incident',
  reportAnon: 'Report anonymously',
  myReports: 'My reports',
  track: 'Track a report',
  map: 'Map',
  callEmergency: 'Call emergency services',
  help: 'Help & privacy',
  signIn: 'Sign in',
  signOut: 'Sign out',
  register: 'Create account',
  notifications: 'Notifications',
  profile: 'Profile & safety settings',
  next: 'Next', back: 'Back', submit: 'Submit report',
  disclaimer: 'SAFEGUARD is an independent reporting platform. It is not the police and does not replace emergency services. In immediate danger, call',
};
const sw: typeof en = {
  tagline: 'Ripoti matukio kwa usalama. Pata msaada haraka.',
  welcome: 'Karibu SAFEGUARD',
  welcomeBody: 'Ripoti kilichotokea, tuma ushahidi kwa usalama na wasiliana na wapelelezi. Unaweza kubaki bila kujulikana.',
  sos: 'SOS – OMBA MSAADA WA DHARURA',
  sosShort: 'SOS',
  report: 'Ripoti tukio',
  reportAnon: 'Ripoti bila kujitambulisha',
  myReports: 'Ripoti zangu',
  track: 'Fuatilia ripoti',
  map: 'Ramani',
  callEmergency: 'Piga simu ya dharura',
  help: 'Msaada na faragha',
  signIn: 'Ingia',
  signOut: 'Toka',
  register: 'Fungua akaunti',
  notifications: 'Arifa',
  profile: 'Wasifu na mipangilio ya usalama',
  next: 'Endelea', back: 'Rudi', submit: 'Tuma ripoti',
  disclaimer: 'SAFEGUARD ni jukwaa huru la kuripoti. Si polisi na haichukui nafasi ya huduma za dharura. Ukiwa hatarini sasa hivi, piga',
};
export type Lang = 'en' | 'sw';
const dict = { en, sw };

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof en) => string }>(null!);
export const useI18n = () => useContext(Ctx);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem('sg_lang') as Lang) || 'en'; } catch { return 'en'; }
  });
  const setLang = (l: Lang) => {
    setLangState(l);
    document.documentElement.lang = l;
    try { localStorage.setItem('sg_lang', l); } catch { /* ignore */ }
  };
  return <Ctx.Provider value={{ lang, setLang, t: (k) => dict[lang][k] }}>{children}</Ctx.Provider>;
}
