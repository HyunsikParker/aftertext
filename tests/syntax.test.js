import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('all source files can be parsed without syntax errors', () => {
  const files = [
    'src/ui.js',
    'src/core.js',
    'src/validate.js',
    'src/sample.js',
    'src/reading.js',
    'sw.js'
  ];
  
  for (const file of files) {
    try {
      execFileSync('node', ['--check', file], { encoding: 'utf8' });
    } catch (error) {
      assert.fail(`${file} failed to parse: ${error.message}`);
    }
  }
});
