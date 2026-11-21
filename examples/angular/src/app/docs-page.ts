import { Component } from '@angular/core';
import { ActivityFeed } from './docs/activity-feed';
import { AssistantReply } from './docs/assistant-reply';
import { InvoiceTable } from './docs/invoice-table';
import { MemberCard } from './docs/member-card';
import { RevenueChart } from './docs/revenue-chart';
import { RevenueTotal } from './docs/revenue-total';

/** The docs site's Angular examples (src/app/docs), as the docs show them. */
@Component({
  selector: 'app-docs-page',
  imports: [
    ActivityFeed,
    AssistantReply,
    InvoiceTable,
    MemberCard,
    RevenueChart,
    RevenueTotal,
  ],
  template: `
    <h1>Docs examples</h1>
    <app-member-card id="ada" />
    <app-revenue-total month="2026-11" />
    <app-revenue-chart [year]="2026" />
    <app-invoice-table />
    <app-assistant-reply question="When is the Globex invoice due?" />
    <app-activity-feed />
  `,
})
export class DocsPage {}
