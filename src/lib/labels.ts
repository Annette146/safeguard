export const CATEGORY_LABELS: Record<string, { label: string; hint: string }> = {
  theft: { label: 'Theft', hint: 'Something was stolen without force' },
  robbery: { label: 'Robbery', hint: 'Theft with force or threats' },
  assault: { label: 'Assault', hint: 'Someone was physically attacked' },
  sexual_harassment: { label: 'Sexual harassment', hint: 'Unwanted sexual comments, touching or advances' },
  gender_based_violence: { label: 'Gender-based violence', hint: 'Violence targeting someone because of their gender' },
  domestic_violence: { label: 'Domestic violence', hint: 'Abuse by a partner or family member' },
  road_accident: { label: 'Road accident', hint: 'A crash involving vehicles, bikes or pedestrians' },
  missing_person: { label: 'Missing person', hint: 'Someone cannot be found or contacted' },
  fire: { label: 'Fire outbreak', hint: 'A building, vehicle or bush fire' },
  cybercrime: { label: 'Cybercrime', hint: 'Online fraud, phishing, hacking or harassment' },
  suspicious_activity: { label: 'Suspicious activity', hint: 'Something that looks wrong or unsafe' },
  public_disturbance: { label: 'Public disturbance', hint: 'Fights, riots or dangerous crowds' },
  other_emergency: { label: 'Other', hint: 'Anything else you need to report' },
};
export const catLabel = (c: string) => CATEGORY_LABELS[c]?.label ?? c;

export const SEVERITY: Record<string, { label: string; cls: string; hint: string }> = {
  low: { label: 'Low', cls: 'bg-slate-100 text-slate-800', hint: 'No one is hurt and there is no ongoing danger' },
  medium: { label: 'Medium', cls: 'bg-amber-100 text-amber-900', hint: 'Property loss or a threat, but no injuries' },
  high: { label: 'High', cls: 'bg-orange-100 text-orange-900', hint: 'Someone was hurt or is at risk' },
  critical: { label: 'Critical', cls: 'bg-red-100 text-red-900', hint: 'Life is in danger right now' },
};

export const STATUS: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'Submitted', cls: 'bg-slate-100 text-slate-800' },
  under_review: { label: 'Under review', cls: 'bg-sky-100 text-sky-900' },
  assigned: { label: 'Assigned', cls: 'bg-indigo-100 text-indigo-900' },
  investigating: { label: 'Investigating', cls: 'bg-violet-100 text-violet-900' },
  awaiting_info: { label: 'Needs your input', cls: 'bg-amber-100 text-amber-900' },
  escalated: { label: 'Escalated', cls: 'bg-orange-100 text-orange-900' },
  resolved: { label: 'Resolved', cls: 'bg-emerald-100 text-emerald-900' },
  closed: { label: 'Closed', cls: 'bg-slate-200 text-slate-700' },
};

export const SOS_STATUS: Record<string, { label: string; detail: string }> = {
  initiated: { label: 'Preparing alert', detail: 'Getting your location…' },
  queued: { label: 'Waiting for connection', detail: 'Your alert is saved on this device and will be sent automatically as soon as you are online.' },
  sent: { label: 'Alert received by SAFEGUARD', detail: 'The alert is on our system. Waiting for a responder dashboard to receive it.' },
  delivered: { label: 'Delivered to responders', detail: 'Your alert is showing on a responder dashboard. Waiting for a responder to acknowledge it.' },
  acknowledged: { label: 'A responder is handling your alert', detail: 'A responder has seen your alert. You will be told here if help is dispatched.' },
  dispatched: { label: 'Help has been dispatched', detail: 'A responder confirmed that help has been sent.' },
  cancelled: { label: 'Alert cancelled', detail: 'You cancelled this alert.' },
  resolved: { label: 'Resolved', detail: 'Responders marked this emergency resolved.' },
};

export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
