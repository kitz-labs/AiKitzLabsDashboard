import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContentPreview, createUnifiedDiff, inferCodingCategory } from './coding';

test('inferCodingCategory detects markdown docs', () => {
  assert.equal(inferCodingCategory('architecture-notes.md'), 'docs');
});

test('inferCodingCategory detects flows and code files', () => {
  assert.equal(inferCodingCategory('agent-flow.yaml'), 'flows');
  assert.equal(inferCodingCategory('workspace.tsx'), 'core');
});

test('buildContentPreview normalizes whitespace and truncates', () => {
  const preview = buildContentPreview(`Hello\n\nworld   from   AI Kitz Labs ${'x'.repeat(800)}`);
  assert.equal(preview.startsWith('Hello world from AI Kitz Labs'), true);
  assert.equal(preview.length <= 700, true);
});

test('createUnifiedDiff marks removed and added lines', () => {
  const diff = createUnifiedDiff('src/app/example.ts', 'const a = 1;\nconst b = 2;', 'const a = 1;\nconst b = 3;\nconst c = 4;');
  assert.equal(diff.includes('--- a/src/app/example.ts'), true);
  assert.equal(diff.includes('+++ b/src/app/example.ts'), true);
  assert.equal(diff.includes('-const b = 2;'), true);
  assert.equal(diff.includes('+const b = 3;'), true);
  assert.equal(diff.includes('+const c = 4;'), true);
});
