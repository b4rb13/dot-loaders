// A slow API, so the placeholders show for a moment.
export default defineEventHandler(async () => {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return [
    { name: 'Ana Kovač', role: 'Design lead' },
    { name: 'Malik Osei', role: 'Engineering' },
    { name: 'Lena Brandt', role: 'Support' },
  ];
});
