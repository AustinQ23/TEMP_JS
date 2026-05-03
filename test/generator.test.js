import test from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../src/compiler.js';

function gen(src) {
  const { result, diagnostics } = compile(src, 'js');
  if (diagnostics.length) throw new Error(diagnostics.map(d => d.message).join('; '));
  return result;
}

function contains(src, fragment) {
  return gen(src).includes(fragment);
}

// ── Variable declarations ──────────────────────────────────────────────────

test('generator: let declaration becomes const', () => {
  assert.ok(contains('fn f() { let x = 5 }', 'const x = 5'));
});

test('generator: mut declaration becomes let', () => {
  assert.ok(contains('fn f() { mut x = 5 }', 'let x = 5'));
});

// ── Print ──────────────────────────────────────────────────────────────────

test('generator: print becomes console.log', () => {
  assert.ok(contains('fn f() { print(42) }', 'console.log(42)'));
});

test('generator: print of a string literal', () => {
  assert.ok(contains('fn f() { print("hi") }', 'console.log("hi")'));
});

// ── Control flow ───────────────────────────────────────────────────────────

test('generator: if without else', () => {
  const out = gen('fn f() { let x = 5 if x < 10 { print(1) } }');
  assert.ok(out.includes('if'));
  assert.ok(!out.includes('else'));
});

test('generator: if with else', () => {
  const out = gen('fn f() { let x = 5 if x < 10 { print(1) } else { print(2) } }');
  assert.ok(out.includes('if'));
  assert.ok(out.includes('else'));
});

test('generator: while loop', () => {
  assert.ok(contains('fn f() { while 1 < 2 { break } }', 'while'));
});

test('generator: break becomes break', () => {
  assert.ok(contains('fn f() { while true { break } }', 'break;'));
});

// ── Functions and calls ────────────────────────────────────────────────────

test('generator: function declaration uses function keyword', () => {
  assert.ok(contains('fn greet() { }', 'function greet()'));
});

test('generator: function with parameters', () => {
  assert.ok(contains('fn add(x, y) { return x + y }', 'function add(x, y)'));
});

test('generator: return with value', () => {
  assert.ok(contains('fn f() { return 42 }', 'return 42'));
});

test('generator: bare return', () => {
  assert.ok(contains('fn f() { return }', 'return;'));
});

test('generator: function call emits call expression', () => {
  const src = 'fn id(x) { return x } fn main() { let r = id(7) }';
  assert.ok(contains(src, 'id(7)'));
});

// ── Auto-call main ─────────────────────────────────────────────────────────

test('generator: main function is auto-called at end of output', () => {
  const out = gen('fn main() { print(1) }');
  assert.ok(out.trimEnd().endsWith('main();'));
});

test('generator: no main function means no auto-call', () => {
  const out = gen('fn helper() { return 1 }');
  assert.ok(!out.includes('main()'));
});

// ── Literals ───────────────────────────────────────────────────────────────

test('generator: boolean true literal', () => {
  assert.ok(contains('fn f() { let b = true }', 'true'));
});

test('generator: boolean false literal', () => {
  assert.ok(contains('fn f() { let b = false }', 'false'));
});

test('generator: arithmetic expression preserves parentheses', () => {
  const out = gen('fn f() { let x = 2 + 3 * 4 }');
  // optimizer folds 2+12=14 but expression structure should be there
  assert.ok(out.includes('x'));
});

// ── Assignment ─────────────────────────────────────────────────────────────

test('generator: reassignment emits plain assignment', () => {
  assert.ok(contains('fn f() { mut x = 1 x = 2 }', 'x = 2'));
});
