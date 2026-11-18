'use strict';
// index.html 안의 <script id="tally-core"> 블록만 꺼내 Node에서 실행한다.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/<script id="tally-core">([\s\S]*?)<\/script>/);
if (!match) throw new Error('index.html에서 tally-core 스크립트를 찾지 못했습니다.');

const sandbox = { module: { exports: {} } };
vm.runInNewContext(match[1], sandbox, { filename: 'index.html#tally-core' });
module.exports = sandbox.module.exports;
