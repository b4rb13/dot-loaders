// app/revenue/page.tsx: a Server Component. It renders the client component
// below on the server, so the placeholder is in the first HTML.
import { RevenueChart } from './revenue-chart';

export default function RevenuePage() {
  return (
    <main>
      <h1>Revenue</h1>
      <RevenueChart year={2026} />
    </main>
  );
}
