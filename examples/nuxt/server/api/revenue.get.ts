// A slow API, so the placeholders show for a moment.
export default defineEventHandler(async () => {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return {
    total: 48120,
    series: [32, 41, 38, 52, 49, 61, 58, 66, 72, 69, 81, 88],
  };
});
