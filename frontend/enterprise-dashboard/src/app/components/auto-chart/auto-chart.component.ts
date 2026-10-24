import { Component, computed, input, linkedSignal, signal } from '@angular/core';

import type { GridState } from '../../models/grid-data';
import { buildChartModel, chartBars, type ChartBar } from '../../utils/chart-data';
import { formatCompact, formatNumber } from '../../utils/number-format';

const TOP_N = 10;
const TIP_HALF_WIDTH = 90;

interface Tip {
  bar: ChartBar;
  x: number;
  y: number;
}

@Component({
  selector: 'app-auto-chart',
  template: `
    @if (model(); as m) {
      <section class="chart">
        <div class="views" role="tablist" aria-label="Chart view">
          @for (v of m.views; track v.key) {
            <button
              type="button"
              role="tab"
              class="chip"
              [class.active]="v.key === selectedKey()"
              [attr.aria-selected]="v.key === selectedKey()"
              (click)="pickedKey.set(v.key)"
            >
              {{ v.label }}
            </button>
          }
        </div>

        @if (view(); as v) {
          <header>
            <h3>{{ v.title }}</h3>
            @if (hasAlerts()) {
              <div class="legend">
                <span class="key"><span class="swatch"></span>Within limit</span>
                <span class="key"><span class="swatch alert"></span>⚠ {{ m.alertLabel }}</span>
              </div>
            }
          </header>

          <div class="bars" role="list" (pointerleave)="tip.set(null)">
            @for (bar of visibleBars(); track $index) {
              <div
                class="row"
                role="listitem"
                tabindex="0"
                [class.hovered]="tip()?.bar === bar"
                [attr.aria-label]="bar.label + ': ' + full(bar.value) + (bar.alert ? ' (alert)' : '')"
                (pointermove)="showTip(bar, $event)"
                (focus)="showTip(bar, $event)"
                (blur)="tip.set(null)"
              >
                <span class="label">
                  @if (bar.alert) {
                    <span class="alert-icon" aria-hidden="true">⚠</span>
                  }
                  {{ bar.label }}
                </span>
                <span class="track">
                  <span class="fill" [class.alert]="bar.alert" [style.width.%]="widthOf(bar)"></span>
                </span>
                <span class="value">{{ short(bar.value) }}</span>
              </div>
            }

            @if (tip(); as t) {
              <div class="tooltip" [style.left.px]="t.x" [style.top.px]="t.y" aria-hidden="true">
                <strong>{{ full(t.bar.value) }}</strong>
                <span>{{ t.bar.label }}</span>
                @if (t.bar.alert) {
                  <span class="tip-alert">⚠ {{ m.alertLabel }}</span>
                }
              </div>
            }
          </div>

          @if (bars().length > topN) {
            <button type="button" class="more" (click)="showAll.set(!showAll())">
              {{ showAll() ? 'Show top ' + topN : 'Show all ' + bars().length }}
            </button>
          }
        }
      </section>
    }
  `,
  styles: `
    .chart {
      margin-bottom: 1rem;
      color: #0f172a;
    }
    .views {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-bottom: 0.75rem;
    }
    .chip {
      font-size: 0.75rem;
      padding: 0.25rem 0.6rem;
      border: 1px solid #c7d2fe;
      border-radius: 999px;
      background: #eef2ff;
      color: #3730a3;
      cursor: pointer;
    }
    .chip.active {
      background: #4f46e5;
      border-color: #4f46e5;
      color: white;
    }
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    h3 {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .legend {
      display: flex;
      gap: 0.75rem;
      font-size: 0.75rem;
      color: #475569;
    }
    .key {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .swatch {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      background: #6366f1;
    }
    .swatch.alert {
      background: #ec835a;
    }
    .bars {
      position: relative;
      display: flex;
      flex-direction: column;
    }
    .row {
      display: grid;
      grid-template-columns: minmax(80px, 38%) 1fr 56px;
      align-items: center;
      gap: 0.5rem;
      height: 24px;
      font-size: 0.8rem;
      border-radius: 4px;
      outline: none;
    }
    .row:focus-visible {
      box-shadow: 0 0 0 2px #a5b4fc;
    }
    .label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .alert-icon {
      color: #c2410c;
      margin-right: 0.15rem;
    }
    .track {
      height: 100%;
      display: flex;
      align-items: center;
      border-left: 1px solid #cbd5e1;
    }
    .fill {
      display: block;
      height: 14px;
      min-width: 2px;
      background: #6366f1;
      border-radius: 0 4px 4px 0;
      transition: filter 0.12s;
    }
    .fill.alert {
      background: #ec835a;
    }
    .row.hovered .fill {
      filter: brightness(1.12) saturate(1.1);
    }
    .value {
      color: #475569;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }
    .tooltip {
      position: absolute;
      transform: translate(-50%, calc(-100% - 6px));
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      max-width: 220px;
      padding: 0.4rem 0.55rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
      font-size: 0.75rem;
      color: #475569;
      pointer-events: none;
      z-index: 2;
    }
    .tooltip strong {
      font-size: 0.85rem;
      color: #0f172a;
    }
    .tip-alert {
      color: #9a3412;
    }
    .more {
      margin-top: 0.4rem;
      padding: 0;
      border: none;
      background: none;
      color: #4f46e5;
      font-size: 0.75rem;
      cursor: pointer;
    }
  `,
})
export class AutoChartComponent {
  readonly grid = input.required<GridState>();

  protected readonly topN = TOP_N;
  protected readonly model = computed(() => buildChartModel(this.grid()));

  protected readonly pickedKey = signal<string | null>(null);

  protected readonly selectedKey = computed(() => {
    const m = this.model();
    const picked = this.pickedKey();
    return m && picked && m.views.some((v) => v.key === picked) ? picked : (m?.defaultKey ?? '');
  });

  protected readonly showAll = linkedSignal({ source: this.selectedKey, computation: () => false });
  protected readonly tip = signal<Tip | null>(null);

  protected readonly view = computed(
    () => this.model()?.views.find((v) => v.key === this.selectedKey()) ?? null,
  );

  protected readonly bars = computed(() => {
    const m = this.model();
    const v = this.view();
    return m && v ? chartBars(this.grid(), m, v) : [];
  });

  protected readonly visibleBars = computed(() =>
    this.showAll() ? this.bars() : this.bars().slice(0, TOP_N),
  );

  protected readonly hasAlerts = computed(() => this.visibleBars().some((b) => b.alert));

  private readonly max = computed(() => Math.max(0, ...this.bars().map((b) => b.value)));

  protected widthOf(bar: ChartBar): number {
    const max = this.max();
    return max > 0 ? (Math.max(0, bar.value) / max) * 100 : 0;
  }

  protected short(value: number): string {
    return formatCompact(value, this.view()?.percent);
  }

  protected full(value: number): string {
    return formatNumber(value, this.view()?.percent);
  }

  protected showTip(bar: ChartBar, event: Event): void {
    const row = event.currentTarget as HTMLElement;
    const container = row.parentElement?.getBoundingClientRect();
    if (!container) return;
    const rowBox = row.getBoundingClientRect();
    const pointerX =
      event instanceof PointerEvent ? event.clientX - container.left : rowBox.width / 2;
    const x = Math.min(
      Math.max(pointerX, TIP_HALF_WIDTH),
      Math.max(TIP_HALF_WIDTH, container.width - TIP_HALF_WIDTH),
    );
    this.tip.set({ bar, x, y: rowBox.top - container.top });
  }
}
