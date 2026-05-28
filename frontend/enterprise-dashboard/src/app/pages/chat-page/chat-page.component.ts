import { Component, inject } from '@angular/core';

import { ChatPanelComponent } from '../../components/chat-panel/chat-panel.component';
import { DataGridComponent } from '../../components/data-grid/data-grid.component';
import { HermesChatService } from '../../services/hermes-chat.service';

@Component({
  selector: 'app-chat-page',
  imports: [ChatPanelComponent, DataGridComponent],
  template: `
    <div class="page split">
      <app-chat-panel class="chat-col" />
      <app-data-grid class="grid-col" [grid]="chat.tableData()" />
    </div>
  `,
  styles: `
    .page {
      padding: 1rem 1.25rem;
      height: 100vh;
      box-sizing: border-box;
    }
    .split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      height: 100%;
    }
    .chat-col,
    .grid-col {
      min-height: 0;
      overflow: hidden;
    }
    @media (max-width: 900px) {
      .split {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr;
      }
    }
  `,
})
export class ChatPageComponent {
  protected readonly chat = inject(HermesChatService);
}
