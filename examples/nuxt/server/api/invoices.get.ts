// A slow API, so the placeholders show for a moment.
export default defineEventHandler(async () => {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return [
    { customer: 'Northwind', amount: '$4,200', status: 'Paid', due: 'Nov 2' },
    { customer: 'Globex', amount: '$1,150', status: 'Due', due: 'Nov 14' },
    { customer: 'Initech', amount: '$860', status: 'Paid', due: 'Nov 20' },
    {
      customer: 'Umbrella',
      amount: '$2,975',
      status: 'Overdue',
      due: 'Oct 28',
    },
  ];
});
