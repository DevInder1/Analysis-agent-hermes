import { Injectable, signal } from '@angular/core';

import { environment } from '../../environments/environment';
import type { ChatMessage } from '../models/chat-message';
import type { GridState } from '../models/grid-data';
import { getCompanyQueryIntent, tryLocalCompanyQuery } from './local-query-handler';
import { extractGridFromText } from '../utils/grid-parser';
import { mergeToolGrids, readResponseEvent, type HermesStreamEvent } from '../utils/hermes-stream';

function formatHermesError(e: unknown): string {
  if (e instanceof TypeError && /fetch|network/i.test(e.message)) {
    return (
      'Cannot reach Hermes API. Start: bash scripts/start-hermes-gateway.sh ' +
      '(then restart ng serve so the /hermes-api proxy is active).'
    );
  }
  return e instanceof Error ? e.message : 'Request failed';
}

@Injectable({ providedIn: 'root' })
export class HermesChatService {
  readonly chatHistory = signal<ChatMessage[]>([]);
  readonly tableData = signal<GridState | null>(null);
  readonly toolStatus = signal<string | null>(null);
  readonly isStreaming = signal(false);
  readonly error = signal<string | null>(null);

  private abortController: AbortController | null = null;

  async sendMessage(userText: string): Promise<void> {
    const trimmed = userText.trim();
    if (!trimmed || this.isStreaming()) return;

    this.error.set(null);
    this.toolStatus.set(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    };
    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
    };

    this.chatHistory.update((h) => [...h, userMsg, assistantMsg]);
    this.isStreaming.set(true);
    this.abortController = new AbortController();

    const messages = this.chatHistory()
      .filter((m) => m.id !== assistantId && !m.streaming)
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const intent = getCompanyQueryIntent(trimmed);
      if (intent) {
        const local = await tryLocalCompanyQuery(trimmed);
        if (!local) {
          throw new Error(
            'Company store returned no rows. Run: bash scripts/reset-mock-data.sh',
          );
        }
        this.tableData.set(local.grid);
        this.patchAssistant(assistantId, local.summary, false);
        return;
      }
      await this.streamResponse(messages, assistantId);
    } catch (e) {
      const msg = formatHermesError(e);
      this.error.set(msg);
      this.patchAssistant(assistantId, `Error: ${msg}`, false);
    } finally {
      this.isStreaming.set(false);
      this.toolStatus.set(null);
      this.abortController = null;
    }
  }

  cancel(): void {
    this.abortController?.abort();
    this.isStreaming.set(false);
  }

  /** Load project budget table without calling Hermes (for empty-state button). */
  async loadBudgetTable(): Promise<void> {
    await this.sendMessage('Show budget status for all projects');
  }

  private async streamResponse(
    messages: { role: string; content: string }[],
    assistantId: string,
  ): Promise<void> {
    const url = `${environment.hermesApiUrl}/v1/responses`;
    // Omit X-Hermes-Session-Id: Hermes CORS allowlist blocks it on cross-origin
    // requests. Full message history is sent each turn instead.
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (environment.hermesApiKey) {
      headers['Authorization'] = `Bearer ${environment.hermesApiKey}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: environment.hermesModel,
        instructions:
          'You are the enterprise knowledge worker. Always use MCP tools for factual answers — never guess. ' +
          'business-data: projects, employees, vulnerabilities. ' +
          'company-knowledge: query_budget_status (budget/travel alerts), search_hr_policies, read_travel_guidelines, appraisal tools. ' +
          'For travel budget alerts use query_budget_status with over_budget_travel_only=true. ' +
          'The dashboard shows tool results as a table and chart automatically, so summarize the key findings ' +
          'in a few sentences instead of repeating every row.',
        input: messages,
        stream: true,
        store: false,
      }),
      signal: this.abortController?.signal,
    });

    if (!res.ok) {
      throw new Error(`Hermes API ${res.status}: ${await res.text()}`);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let toolGrid: GridState | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        let event: HermesStreamEvent;
        try {
          event = readResponseEvent(JSON.parse(line.slice(6)));
        } catch {
          continue;
        }

        switch (event.kind) {
          case 'text':
            fullText += event.delta;
            this.patchAssistant(assistantId, fullText, true);
            break;
          case 'tool_start':
            this.toolStatus.set(`Running ${event.label}…`);
            break;
          case 'tool_result':
            this.toolStatus.set(null);
            if (event.grid) {
              toolGrid = mergeToolGrids(toolGrid, event.grid);
              this.tableData.set(toolGrid);
            }
            break;
          case 'failed':
            throw new Error(event.message);
        }
      }
    }

    this.patchAssistant(assistantId, fullText, false);
    if (!toolGrid) {
      const grid = extractGridFromText(fullText);
      if (grid) {
        this.tableData.set(grid);
      }
    }
  }

  private patchAssistant(id: string, content: string, streaming: boolean): void {
    this.chatHistory.update((history) =>
      history.map((m) => (m.id === id ? { ...m, content, streaming } : m)),
    );
  }
}
