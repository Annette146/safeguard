import { PageTitle, Card } from '../components/ui';
import { useEmergencyNumbers } from '../components/Layout';

export function Help() {
  const nums = useEmergencyNumbers();
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card><h2 className="font-semibold text-lg mb-2">{title}</h2><div className="space-y-2 text-slate-800">{children}</div></Card>
  );
  return (
    <div className="max-w-3xl space-y-4">
      <PageTitle sub="Plain-language answers about what SAFEGUARD does with your information.">Help, privacy & terms</PageTitle>
      <Section title="What SAFEGUARD is (and isn't)">
        <p>SAFEGUARD is an independent incident-reporting and evidence platform used by participating institutions. It is <strong>not</strong> the National Police Service, it is not a government service, and it does not replace emergency numbers. If you are in immediate danger, call {nums.join(' or ')}.</p>
        <p>We can't guarantee that evidence submitted here will be accepted in court. Admissibility is decided by the courts under the Evidence Act.</p>
      </Section>
      <Section title="Anonymous reporting">
        <p>Anonymous reports don't ask for your name, phone or email, and we don't link them to an account. We don't log your IP address against anonymous reports.</p>
        <p><strong>Limits:</strong> your description, photos and videos (faces, locations, file metadata such as GPS tags) may still identify you. Network providers may hold their own records. Keep your tracking code private — anyone with it can read the report's status and messages.</p>
      </Section>
      <Section title="Who can see your report">
        <ul className="list-disc ml-5 space-y-1">
          <li>Other members of the public: <strong>never</strong>.</li>
          <li>A supervising officer reviews new reports and assigns them.</li>
          <li>Only officers and investigators <strong>assigned to your case</strong> can see the details and open evidence. They must record a reason each time they view your identity or evidence, and this is logged.</li>
          <li>System administrators manage accounts but cannot open reports or evidence.</li>
        </ul>
      </Section>
      <Section title="How evidence is protected">
        <p>Each file is stored exactly as uploaded, encrypted (AES-256-GCM) with its own key. A SHA-256 fingerprint is recorded in a tamper-evident ledger, so any later change to the file can be detected. Every view, download, verification and transfer is recorded in a chain-of-custody log.</p>
      </Section>
      <Section title="Emergency SOS">
        <p>SOS sends an alert with your location (if you allow it) to responder dashboards. The screen shows each step honestly: <em>received by SAFEGUARD → delivered to responders → acknowledged → help dispatched</em>. "Help dispatched" appears only after a responder confirms it. Your camera and microphone are never switched on by SOS.</p>
        <p>If the internet is down, the alert is saved on your device and sent when you reconnect — but you should call {nums[0]} directly, which works without data.</p>
      </Section>
      <Section title="Your rights (Data Protection Act, 2019)">
        <p>You can ask to access or correct personal data we hold about you, and object to processing. Some data in active investigations, and evidence and custody records, must be kept for legal reasons. In those cases deletion follows a documented legal process instead of happening immediately. You can complain to the Office of the Data Protection Commissioner (ODPC).</p>
        <p>Location data from SOS alerts is kept only as long as the retention policy of the responding institution allows.</p>
      </Section>
      <Section title="Terms of use">
        <p>Don't submit knowingly false reports. Don't upload content you don't have the right to share, except as evidence of an offence. Misuse of the SOS feature may be investigated. AI features, when enabled, only make suggestions and never decide guilt or identify suspects.</p>
      </Section>
    </div>
  );
}
