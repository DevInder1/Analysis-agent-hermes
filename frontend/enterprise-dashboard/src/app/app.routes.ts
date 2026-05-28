import { Routes } from '@angular/router';

import { ShellComponent } from './layout/shell.component';
import { AnalyticsPageComponent } from './pages/analytics-page/analytics-page.component';
import { AppraisalsPageComponent } from './pages/appraisals-page/appraisals-page.component';
import { ChatPageComponent } from './pages/chat-page/chat-page.component';
import { VulnerabilitiesPageComponent } from './pages/vulnerabilities-page/vulnerabilities-page.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', component: ChatPageComponent },
      { path: 'vulnerabilities', component: VulnerabilitiesPageComponent },
      { path: 'analytics', component: AnalyticsPageComponent },
      { path: 'appraisals', component: AppraisalsPageComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
