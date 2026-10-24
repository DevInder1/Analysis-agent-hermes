import { extractGridFromText } from './grid-parser';

describe('extractGridFromText', () => {
  it('parses fenced json grid block', () => {
    const text = 'Here is the data:\n```json\n{"grid":{"columns":[{"field":"a"}],"rows":[{"a":1}]}}\n```';
    const result = extractGridFromText(text);
    expect(result).not.toBeNull();
    expect(result?.rowData.length).toBe(1);
    expect(result?.columnDefs[0].field).toBe('a');
  });

  it('parses a markdown table from an agent reply', () => {
    const text = [
      'I found 2 pending appraisals.',
      '',
      '| Employee | Department | Budget | Travel % | Alert |',
      '| :--- | :--- | ---: | ---: | --- |',
      '| E037 | Customer Success | $1,250,000 | 8.5% | true |',
      '| **E030** | Operations | 980000 | 2 | false |',
      '',
      'Let me know if you need more.',
    ].join('\n');
    const result = extractGridFromText(text);
    expect(result?.columnDefs.map((c) => c.field)).toEqual([
      'employee',
      'department',
      'budget',
      'travel_%',
      'alert',
    ]);
    expect(result?.columnDefs[3].headerName).toBe('Travel %');
    expect(result?.rowData).toEqual([
      { employee: 'E037', department: 'Customer Success', budget: 1250000, 'travel_%': 8.5, alert: true },
      { employee: 'E030', department: 'Operations', budget: 980000, 'travel_%': 2, alert: false },
    ]);
  });

  it('merges consecutive markdown tables that share a header', () => {
    const text = [
      'Pending self-assessments:',
      '| Employee | Status |',
      '| --- | --- |',
      '| E030 | pending_self |',
      '',
      'Pending manager reviews:',
      '| Employee | Status |',
      '| --- | --- |',
      '| E037 | pending_manager |',
      '| E027 | pending_manager |',
    ].join('\n');
    const result = extractGridFromText(text);
    expect(result?.rowData.map((r) => r['status'])).toEqual([
      'pending_self',
      'pending_manager',
      'pending_manager',
    ]);
  });

  it('returns null for plain text', () => {
    expect(extractGridFromText('No table here | just a pipe')).toBeNull();
  });
});
