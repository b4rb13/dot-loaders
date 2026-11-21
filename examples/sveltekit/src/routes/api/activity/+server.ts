import { json } from '@sveltejs/kit';

// A slow API, so the placeholders show for a moment.
export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return json([
    'Northwind paid $4,200',
    'Acme Labs opened an invoice',
    'Globex is two weeks overdue',
  ]);
}
