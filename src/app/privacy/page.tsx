'use client';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-16">
      <div className="max-w-2xl mx-auto prose prose-invert">
        <h1 className="text-emerald-400">Privacy Policy</h1>
        <p className="text-sm text-slate-400">Effective: March 29, 2026 · Humanity and AI LLC</p>
        <h2 className="text-emerald-300">What We Collect</h2>
        <p>Grove stores your financial data (budget categories, goals, transactions) locally in your browser. When you create an account, we collect your email via Supabase. If you connect a bank account via Plaid, transaction data flows through Plaid's secure API — we display it but do not store raw bank credentials.</p>
        <h2 className="text-emerald-300">How We Use Your Data</h2>
        <p>Your financial data powers the visualizations, budget tracking, and insights within Grove. We do not sell, share, or monetize your financial information. Period.</p>
        <h2 className="text-emerald-300">Third-Party Services</h2>
        <p>Supabase (authentication), Plaid (bank connections — optional), Vercel (hosting). No analytics trackers, no ad networks.</p>
        <h2 className="text-emerald-300">Your Rights</h2>
        <p>Export your data anytime from Settings. Delete your account by emailing david@humanityandai.com.</p>
        <h2 className="text-emerald-300">Contact</h2>
        <p>Humanity and AI LLC · Oklahoma City, OK · david@humanityandai.com</p>
      </div>
    </main>
  );
}
