'use strict';
// index.html이 외부 자원·네트워크·저장 기능을 쓰지 않는지 정적으로 검사한다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');

test('.nojekyll이 저장소 맨 위에 빈 파일로 있다', () => {
  const stat = fs.statSync(path.join(root, '.nojekyll'));
  assert.ok(stat.isFile());
  assert.equal(stat.size, 0);
});

test('외부 자원(스크립트·스타일·글꼴·이미지)을 불러오지 않는다', () => {
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/i);
  assert.doesNotMatch(html, /<link\b/i);
  assert.doesNotMatch(html, /<(img|iframe|object|embed|audio|video|source)\b/i);
  assert.doesNotMatch(html, /@import|@font-face|url\s*\(/i);
  assert.doesNotMatch(html, /(https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/i, '외부 주소가 들어 있으면 안 된다');
});

test('네트워크·저장 API를 쓰지 않는다', () => {
  const banned = [
    'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon', 'RTCPeerConnection',
    'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'caches', 'serviceWorker',
    'postMessage', 'window.open', 'eval', 'Function(', 'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write',
  ];
  for (const word of banned) assert.ok(!scripts.includes(word), `스크립트에 ${word}이(가) 있으면 안 된다`);
  assert.doesNotMatch(html, /<form\b/i);
});

test('CSP가 모든 외부 요청을 막는다', () => {
  const m = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(m, 'CSP 메타 태그가 있어야 한다');
  const csp = m[1];
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /form-action 'none'/);
  assert.doesNotMatch(csp, /connect-src|https?:|\*/);
});
