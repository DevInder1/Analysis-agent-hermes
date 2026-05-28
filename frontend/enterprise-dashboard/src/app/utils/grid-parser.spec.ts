import { extractGridFromText } from './grid-parser';

describe('extractGridFromText', () => {
  it('parses fenced json grid block', () => {
    const text = 'Here is the data:\n```json\n{"grid":{"columns":[{"field":"a"}],"rows":[{"a":1}]}}\n```';
    const result = extractGridFromText(text);
    expect(result).not.toBeNull();
    expect(result?.rowData.length).toBe(1);
    expect(result?.columnDefs[0].field).toBe('a');
  });
});
