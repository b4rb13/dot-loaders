import { join } from 'node:path';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// A slow API, so the placeholders show for a moment.
const slow =
  <T>(body: T) =>
  async (_: unknown, res: express.Response) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    res.json(body);
  };
app.get(
  '/api/team',
  slow([
    { name: 'Ana Kovač', role: 'Design lead' },
    { name: 'Malik Osei', role: 'Engineering' },
    { name: 'Lena Brandt', role: 'Support' },
  ]),
);
app.get(
  '/api/revenue',
  slow({
    total: 48120,
    series: [32, 41, 38, 52, 49, 61, 58, 66, 72, 69, 81, 88],
  }),
);
app.get(
  '/api/invoices',
  slow([
    { customer: 'Northwind', amount: '$4,200', status: 'Paid' },
    { customer: 'Globex', amount: '$1,150', status: 'Due' },
    { customer: 'Initech', amount: '$860', status: 'Paid' },
    { customer: 'Umbrella', amount: '$2,975', status: 'Overdue' },
  ]),
);

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

const { PORT, pm_id } = process.env;
if (isMainModule(import.meta.url) || pm_id) {
  const port = Number(PORT || 4363);
  app.listen(port, '127.0.0.1', (error) => {
    if (error) throw error;
    console.log(`Listening on http://127.0.0.1:${port}`);
  });
}

/** Used by the Angular CLI's dev server and during the build. */
export const reqHandler = createNodeRequestHandler(app);
