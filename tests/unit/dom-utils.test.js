import { test } from 'node:test';
import assert from 'node:assert/strict';
import { html, raw, escapeHtml } from '../../src/utils/dom-utils.js';

test('html`` meng-escape nilai pengguna (anti XSS)', () => {
  const evil = '<img src=x onerror="alert(1)">';
  const out = html`<h3>${evil}</h3>`.toString();
  assert.ok(!out.includes('<img'));
  assert.ok(out.includes('&lt;img'));
  assert.ok(out.includes('&quot;'));
});

test('html`` menyisipkan html`` lain & array tanpa escape ganda', () => {
  const item = (text) => html`<li>${text}</li>`;
  const out = html`<ul>${['a&b', 'c'].map(item)}</ul>`.toString();
  assert.equal(out, '<ul><li>a&amp;b</li><li>c</li></ul>');
});

test('nilai null/false/undefined menjadi string kosong, angka 0 tetap tampil', () => {
  assert.equal(html`${null}|${false}|${undefined}|${0}`.toString(), '||'.concat('|0'));
});

test('raw() dipercaya apa adanya, escapeHtml menangani tanda kutip', () => {
  assert.equal(html`${raw('<b>x</b>')}`.toString(), '<b>x</b>');
  assert.equal(escapeHtml(`"'<>&`), '&quot;&#39;&lt;&gt;&amp;');
});
