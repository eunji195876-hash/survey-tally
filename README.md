# survey-tally

엑셀에서 머리글 줄까지 복사해 붙여넣으면 문항별 결과 표(문항 / 유효 응답 / 평균 / 빈 응답 / 제외)를 보여 주는 설문 집계기입니다.

- `index.html` 한 파일로 동작합니다. 브라우저로 열거나 GitHub Pages로 배포하면 됩니다.
- 외부 라이브러리·외부 글꼴·분석 도구를 쓰지 않으며, 붙여넣은 데이터는 브라우저 밖으로 보내거나 저장하지 않습니다(CSP로 외부 요청 차단).
- 집계 규칙과 구조는 [docs/PLAN.md](docs/PLAN.md)에 있습니다.

## 시험

Node.js 18 이상, 설치할 의존성은 없습니다.

```bash
node --test
```

- `tests/core.test.js`: `index.html` 안의 계산 로직(`<script id="tally-core">`)을 꺼내 시험
- `tests/static.test.js`: 외부 자원·네트워크·저장 API를 쓰지 않는지, `.nojekyll`이 있는지 검사
