'use client';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-16">
      <div className="max-w-2xl mx-auto prose prose-invert">
        <h1 className="text-emerald-400">Terms of Service</h1>
        <p className="text-sm text-slate-400">Effective: March 29, 2026 · Humanity and AI LLC</p>
        <h2 className="text-emerald-300">The Service</h2>
        <p>Grove is a financial wellness app that helps you visualize and manage your money through budgets, goals, and spending insights. It is not a bank, financial advisor, or tax service.</p>
        <h2 className="text-emerald-300">Not Financial Advice</h2>
        <p>Grove provides tools for personal financial awareness. Nothing in this app constitutes financial, investment, or tax advice. Consult a qualified professional for financial decisions.</p>
        <h2 className="text-emerald-300">Bank Connections</h2>
        <p>If you connect a bank account, data flows through Plaid's secure API. Grove displays your transactions but does not store bank credentials. You can disconnect at any time.</p>
        <h2 className="text-emerald-300">Your Data</h2>
        <p>You own your financial data. Export it anytime. We never sell or share it. See our Privacy Policy for details.</p>
        <h2 className="text-emerald-300">Contact</h2>
        <p>Questions? david@humanityandai.com · Humanity and AI LLC · Oklahoma City, OK</p>
      </div>
    </main>
  );
}
