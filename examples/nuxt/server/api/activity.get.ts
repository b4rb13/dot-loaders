// A slow API, so the placeholders show for a moment.
export default defineEventHandler(async () => {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return [
    'Northwind paid $4,200',
    'Acme Labs opened an invoice',
    'Globex is overdue',
  ];
});
