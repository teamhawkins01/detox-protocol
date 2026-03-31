export default function ApiDocsPage() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-3xl">
      <h1 className="text-4xl font-black uppercase text-white mb-8">API Documentation</h1>
      <div className="space-y-6 text-white/70">
        <p>Last Updated: March 30, 2026</p>
        <p>Welcome to the Detox.Recipes API documentation. Our API allows developers to integrate with our platform and access our protocol data.</p>
        <h2 className="text-2xl font-bold text-white">1. API Access</h2>
        <p>To access our API, you must obtain an API key. Please contact us to request access.</p>
        <h2 className="text-2xl font-bold text-white">2. Rate Limits</h2>
        <p>We enforce rate limits to ensure fair usage of our API. Please refer to your API documentation for details on your rate limits.</p>
        <h2 className="text-2xl font-bold text-white">3. API Usage</h2>
        <p>You agree to use our API in accordance with our Terms of Service. Any misuse of our API may result in the suspension or termination of your access.</p>
        <h2 className="text-2xl font-bold text-white">4. Support</h2>
        <p>If you have any questions or need assistance with our API, please contact our support team.</p>
      </div>
    </div>
  );
}
