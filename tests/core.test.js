'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTSV, classifyCell, formatAverage, tally } = require('./load-core');

const plain = (v) => JSON.parse(JSON.stringify(v)); // vm 영역의 값을 일반 값으로
// 결과에서 표에 보이는 열만 뽑는다.
const table = (text) => plain(tally(text).questions).map((q) => [q.name, q.valid, q.average, q.blank, q.excluded]);

test('classifyCell: 앞뒤 공백을 지운 1~5만 유효', () => {
  for (const v of ['1', '2', '3', '4', '5', ' 3 ', '\t5', '4 ', '　2　']) {
    assert.equal(classifyCell(v).kind, 'valid', JSON.stringify(v));
  }
  assert.equal(classifyCell(' 4 ').value, 4);
});

test('classifyCell: 비었거나 공백만이면 빈 응답', () => {
  for (const v of ['', ' ', '   ', '\t', '　', undefined, null]) {
    assert.equal(classifyCell(v).kind, 'blank', JSON.stringify(v));
  }
});

test('classifyCell: 그 밖의 값은 제외', () => {
  for (const v of ['0', '6', '-1', '+3', '3.0', '3.5', '03', '1 2', '１', '삼', 'N/A', '3점', '"3"']) {
    assert.equal(classifyCell(v).kind, 'excluded', JSON.stringify(v));
  }
});

test('formatAverage: 소수 셋째 자리에서 반올림해 둘째 자리까지', () => {
  assert.equal(formatAverage(0, 0), '-');
  assert.equal(formatAverage(3, 1), '3.00');
  assert.equal(formatAverage(10, 4), '2.50');
  assert.equal(formatAverage(10, 3), '3.33'); // 3.333…
  assert.equal(formatAverage(11, 3), '3.67'); // 3.666…
  assert.equal(formatAverage(5, 3), '1.67');
  assert.equal(formatAverage(1, 8), '0.13'); // 0.125 → 올림 (정수 연산 확인용, 유효 범위 밖 값)
  assert.equal(formatAverage(107, 40), '2.68'); // 2.675 → 2.68 (toFixed는 2.67을 냄)
  assert.equal(formatAverage(161, 200), '0.81'); // 0.805 → 0.81
  assert.equal(formatAverage(5 * 1000000, 1000000), '5.00');
});

test('parseTSV: 줄바꿈 종류와 끝의 빈 줄', () => {
  assert.deepEqual(plain(parseTSV('a\tb\r\n1\t2\r\n')), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(plain(parseTSV('a\tb\n1\t2')), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(plain(parseTSV('a\tb\r1\t2\r')), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(plain(parseTSV('a\n\n1\n\n\n')), [['a'], [''], ['1']]);
  assert.deepEqual(plain(parseTSV('')), []);
  assert.deepEqual(plain(parseTSV('\n\n')), []);
  assert.deepEqual(plain(parseTSV('a\t\t')), [['a', '', '']]);
});

test('parseTSV: 엑셀식 따옴표 칸', () => {
  assert.deepEqual(plain(parseTSV('"줄\n바꿈"\t"탭\t포함"\t"따옴표 ""x"""\n1\t2\t3')), [
    ['줄\n바꿈', '탭\t포함', '따옴표 "x"'],
    ['1', '2', '3'],
  ]);
  // 따옴표 칸이 아닌 경우는 글자 그대로
  assert.deepEqual(plain(parseTSV('"3"점\t"열림\n1\t2')), [['"3"점', '"열림'], ['1', '2']]);
});

test('tally: 기본 예시', () => {
  const text = [
    '응답번호\t만족도\t추천 의향',
    '1\t5\t4',
    '2\t3\t',
    '3\t 4 \t모름',
    '4\t6\t2',
  ].join('\r\n') + '\r\n';
  assert.deepEqual(table(text), [
    ['만족도', 3, '4.00', 0, 1],
    ['추천 의향', 2, '3.00', 1, 1],
  ]);
  assert.equal(tally(text).responseCount, 4);
});

test('tally: 첫 열(응답번호)은 집계하지 않는다', () => {
  const result = tally('번호\tQ1\n3\t1\n4\t2\n');
  assert.equal(result.questions.length, 1);
  assert.equal(result.questions[0].name, 'Q1');
  assert.equal(result.questions[0].average, '1.50');
});

test('tally: 칸이 모자란 줄은 모자란 칸을 빈 응답으로', () => {
  const text = 'no\tQ1\tQ2\tQ3\n1\t5\n2\n3\t4\t4\t4\n';
  assert.deepEqual(table(text), [
    ['Q1', 2, '4.50', 1, 0],
    ['Q2', 1, '4.00', 2, 0],
    ['Q3', 1, '4.00', 2, 0],
  ]);
});

test('tally: 중간의 빈 줄은 모든 문항이 빈 응답인 줄', () => {
  assert.deepEqual(table('no\tQ1\tQ2\n1\t1\t2\n\n2\t3\t4\n'), [
    ['Q1', 2, '2.00', 1, 0],
    ['Q2', 2, '3.00', 1, 0],
  ]);
});

test('tally: 머리글보다 많은 칸은 무시', () => {
  assert.deepEqual(table('no\tQ1\n1\t2\t9\t9\n'), [['Q1', 1, '2.00', 0, 0]]);
});

test('tally: 유효가 0이면 평균은 "-"', () => {
  assert.deepEqual(table('no\tQ1\tQ2\n1\t\tx\n2\t \t0\n'), [
    ['Q1', 0, '-', 2, 0],
    ['Q2', 0, '-', 0, 2],
  ]);
});

test('tally: 머리글만 있거나 문항이 없거나 비어 있음', () => {
  assert.deepEqual(table('no\tQ1\tQ2\n'), [['Q1', 0, '-', 0, 0], ['Q2', 0, '-', 0, 0]]);
  assert.equal(tally('no\tQ1\n').responseCount, 0);
  assert.equal(tally('응답번호\n1\n2\n').questions.length, 0);
  assert.equal(tally('').questions.length, 0);
  assert.equal(tally('   \n').questions.length, 0);
});

test('tally: 유효 + 빈 응답 + 제외 = 응답 줄 수', () => {
  const lines = ['id\tA\tB\tC'];
  const pool = ['1', '2', '3', '4', '5', '', ' ', '0', '6', 'x', '3.5'];
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let r = 0; r < 500; r += 1) {
    const cells = [String(r + 1)];
    const width = Math.floor(rnd() * 5); // 0~4 칸: 모자라거나 남는 줄 포함
    for (let c = 0; c < width; c += 1) cells.push(pool[Math.floor(rnd() * pool.length)]);
    lines.push(cells.join('\t'));
  }
  const result = tally(lines.join('\n'));
  assert.equal(result.responseCount, 500);
  for (const q of result.questions) assert.equal(q.valid + q.blank + q.excluded, 500);
});
