import { json } from '@sveltejs/kit';

// A slow API, so the placeholders show for a moment.
export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return json([
    { customer: 'Northwind', amount: '$4,200', status: 'Paid', due: 'Nov 2' },
    { customer: 'Globex', amount: '$1,150', status: 'Due', due: 'Nov 14' },
    { customer: 'Initech', amount: '$860', status: 'Paid', due: 'Nov 20' },
    {
      customer: 'Umbrella',
      amount: '$2,975',
      status: 'Overdue',
      due: 'Oct 28',
    },
  ]);
}
