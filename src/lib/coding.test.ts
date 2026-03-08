import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContentPreview, inferCodingCategory } from './coding';

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
