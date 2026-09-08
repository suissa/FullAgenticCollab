import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test('semantic vectors are valid JSON and declare expected outcomes', () => {
  const root = 'test-vectors/semantic';
  const files = readdirSync(root).filter(name => name.endsWith('.json'));
  assert.equal(files.length, 7);
  for (const file of files) {
    const vector = JSON.parse(readFileSync(join(root, file), 'utf8')) as Record<string, unknown>;
    assert.equal(typeof vector.id, 'string');
    assert.ok(vector.status === 'valid' || vector.status === 'invalid');
  }
});
