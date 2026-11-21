import { revenue } from '../../../app/docs/data';

// A slow API, so the placeholders show for a moment.
export default defineEventHandler(async () => {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return revenue;
});
