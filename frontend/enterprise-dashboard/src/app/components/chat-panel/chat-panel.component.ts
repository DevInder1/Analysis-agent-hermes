import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { HermesChatService } from '../../services/hermes-chat.service';

@Component({
  selector: 'app-chat-panel',
  imports: [FormsModule],
  template: `
    <section class="chat-panel">
      <header class="chat-header">
        <h2>Enterprise Assistant</h2>
        @if (chat.toolStatus(); as status) {
          <span class="tool-status">{{ status }}</span>
        }
        @if (chat.isStreaming()) {
          <button type="button" class="btn-secondary" (click)="chat.cancel()">Stop</button>
        }
      </header>

      <div class="messages" role="log" aria-live="polite">
        @for (msg of chat.chatHistory(); track msg.id) {
          <article [class]="'bubble ' + msg.role" [class.streaming]="msg.streaming">
            <span class="role">{{ msg.role }}</span>
            <pre class="content">{{ msg.content || (msg.streaming ? '…' : '') }}</pre>
          </article>
        }
      </div>

      @if (chat.error(); as err) {
        <p class="error">{{ err }}</p>
      }

      <div class="prompts">
        @for (p of suggestedPrompts; track p) {
          <button type="button" class="chip" (click)="usePrompt(p)" [disabled]="chat.isStreaming()">
            {{ p }}
          </button>
        }
      </div>

      <form class="composer" (ngSubmit)="submit()">
        <textarea
          [(ngModel)]="draft"
          name="draft"
          rows="2"
          placeholder="e.g. Show me the top 10 project budgets"
          [disabled]="chat.isStreaming()"
        ></textarea>
        <button type="submit" [disabled]="chat.isStreaming() || !draft.trim()">Send</button>
      </form>
    </section>
  `,
  styles: `
    .chat-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      border-right: 1px solid #e2e8f0;
      padding-right: 1rem;
    }
    .chat-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
    h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      flex: 1;
    }
    .tool-status {
      font-size: 0.75rem;
      color: #6366f1;
    }
    .messages {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.25rem 0;
      min-height: 200px;
    }
    .bubble {
      border-radius: 8px;
      padding: 0.6rem 0.75rem;
      max-width: 95%;
    }
    .bubble.user {
      align-self: flex-end;
      background: #e0e7ff;
    }
    .bubble.assistant {
      align-self: flex-start;
      background: #f1f5f9;
    }
    .bubble.streaming {
      opacity: 0.9;
    }
    .role {
      display: block;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 0.25rem;
    }
    .content {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: inherit;
      font-size: 0.9rem;
    }
    .composer {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    textarea {
      flex: 1;
      resize: vertical;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.5rem;
      font: inherit;
    }
    button {
      align-self: flex-end;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      background: #4f46e5;
      color: white;
      cursor: pointer;
      font-weight: 500;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: #94a3b8;
      font-size: 0.8rem;
      padding: 0.35rem 0.6rem;
    }
    .error {
      color: #b91c1c;
      font-size: 0.85rem;
      margin: 0.25rem 0 0;
    }
    .prompts {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-bottom: 0.5rem;
    }
    .chip {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid #c7d2fe;
      border-radius: 999px;
      background: #eef2ff;
      color: #3730a3;
      cursor: pointer;
    }
    .chip:disabled {
      opacity: 0.5;
    }
  `,
})
export class ChatPanelComponent {
  protected readonly chat = inject(HermesChatService);
  protected draft = '';

  readonly suggestedPrompts = [
    'Show budget status for all projects',
    'Which projects have travel budget alerts?',
    'Search HR policies for annual leave',
    'Read travel guidelines for per diem',
    'List pending appraisals',
    'Get appraisal status for employee E004',
    'Check dependency vulnerabilities',
  ];

  usePrompt(text: string): void {
    void this.chat.sendMessage(text);
  }

  submit(): void {
    const text = this.draft;
    this.draft = '';
    void this.chat.sendMessage(text);
  }
}
