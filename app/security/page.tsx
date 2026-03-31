export default function SecurityPage() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-3xl">
      <h1 className="text-4xl font-black uppercase text-white mb-8">Security Policy</h1>
      <div className="space-y-6 text-white/70">
        <p>Last Updated: March 30, 2026</p>
        <p>At Detox.Recipes, we prioritize the security of your data and our platform. We employ industry-standard security practices to ensure your information is protected.</p>
        <h2 className="text-2xl font-bold text-white">1. Data Encryption</h2>
        <p>All data transmitted to and from our platform is encrypted using TLS/SSL protocols. We also encrypt sensitive data at rest using industry-standard encryption algorithms.</p>
        <h2 className="text-2xl font-bold text-white">2. Access Control</h2>
        <p>We restrict access to your personal information to authorized personnel only. We use strong authentication and authorization mechanisms to ensure that only you can access your account and data.</p>
        <h2 className="text-2xl font-bold text-white">3. Security Audits</h2>
        <p>We regularly conduct security audits and vulnerability assessments to identify and address potential security risks in our platform.</p>
        <h2 className="text-2xl font-bold text-white">4. Incident Response</h2>
        <p>In the event of a security incident, we have established procedures to detect, contain, and remediate the issue promptly and to notify affected users in accordance with applicable laws.</p>
      </div>
    </div>
  );
}
