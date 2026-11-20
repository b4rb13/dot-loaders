// A Server Component. The client components below render on the server too,
// so their placeholders are in the first HTML, before any JavaScript runs.
import { RevenueTotal } from './revenue-total';
import { TeamList } from './team-list';

export default function TeamPage() {
  return (
    <>
      <h1>Team</h1>
      <RevenueTotal />
      <TeamList />
    </>
  );
}
