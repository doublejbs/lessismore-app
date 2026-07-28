// 외부 후기 관련성 판정(공용) — 규칙의 단일 소스는 CampSite CS-3 `관련성 필터` 항목이다.
// 네이버·유튜브 검색은 부분 매칭으로 무엇이든 돌려주므로 응답을 그대로 표시하면 무관 콘텐츠가 섞인다
// (캐시 100건 실측: 유튜브 체감 무관 43.7%, 블로그 6.7%). 제목에 대상 토큰이 하나도 없는 항목은 버린다.
// 박지 상세(CS-3)와 장비 상세(GD-6)가 함께 쓴다 — 어떤 값을 필수 토큰으로 삼을지는 호출측이 정한다.

// 1자 토큰은 아무 제목에나 걸려 필터가 무력해지므로 판정에서 뺀다.
const MIN_TOKEN_LENGTH = 2;

// 사이즈·성별처럼 여러 장비에 공통으로 붙는 토큰. 이것만 맞아도 통과시키면
// 제품이 다른 결과가 그대로 올라온다 — 필수 토큰에서 제외한다(GD-6).
// 정규화를 거친 형태로 담아 두고 정규화된 토큰과 비교한다.
// 1자 항목(`s`·`남` 등)은 위 길이 규칙이 이미 걸러내지만, 규칙이 바뀌어도 남도록 함께 적어 둔다.
const GENERAL_TOKENS = new Set([
  'mens',
  'womens',
  '남',
  '여',
  '공용',
  's',
  'm',
  'l',
  'xl',
  '스몰',
  '미디움',
  '미디엄',
  '라지',
  '엑스라지',
  '투엑스라지',
  '단품',
  '세트',
]);

// 표기 차이로 같은 대상이 탈락하는 것을 막기 위해 양쪽을 같은 형태로 만든다
// (`AMG-TITANIUM`/`amg titanium`, `X.Mid`/`xmid`, `헬리녹스·체어원`).
// 아포스트로피(ASCII `'`·타이포그래픽 `’`)까지 지우는 이유: 카탈로그의 `men's`·`women's`가
// 일반 토큰 `mens`·`womens`와 같은 형태가 되어야 한다. 남겨 두면 성별 표기가 필수 토큰으로
// 새어 나가 아무 제목에나 걸리고 필터가 무력해진다(카탈로그 실측 `men's` 7.6%·`women's` 6.7%).
const normalizeToken = (value: string): string => {
  return value.toLowerCase().replace(/[\s\-_·.'’]/g, '');
};

// 제품명·박지명처럼 여러 낱말로 이뤄진 값에서 필수 토큰을 뽑는다.
// 낱말 단위로 쪼개는 이유는 제목이 이름 전체를 그대로 적지 않기 때문이다(`제로그램 엘찰텐 2.5p` → `엘찰텐`).
export const buildRequiredTokens = (sources: string[]): string[] => {
  const tokens = new Set<string>();

  for (const source of sources) {
    // 타입은 string이지만 Firestore 문서를 캐스팅으로 받는 경로가 있어 런타임 undefined가 올 수 있다.
    if (!source) {
      continue;
    }

    for (const word of source.split(/\s+/)) {
      const token = normalizeToken(word);

      if (token.length < MIN_TOKEN_LENGTH) {
        continue;
      }

      if (GENERAL_TOKENS.has(token)) {
        continue;
      }

      tokens.add(token);
    }
  }

  return Array.from(tokens);
};

// 브랜드는 낱말로 쪼개지 않고 문자열 전체를 한 토큰으로 쓴다 — 쪼개면 `노스` 같은 조각이
// 무관한 제목에 걸린다. 제품명 토큰이 전부 일반 토큰이라 비었을 때의 폴백 용도다(GD-6).
export const buildBrandTokens = (sources: string[]): string[] => {
  const tokens = new Set<string>();

  for (const source of sources) {
    // 타입은 string이지만 Firestore 문서를 캐스팅으로 받는 경로가 있어 런타임 undefined가 올 수 있다.
    if (!source) {
      continue;
    }

    const token = normalizeToken(source);

    if (token.length < MIN_TOKEN_LENGTH) {
      continue;
    }

    tokens.add(token);
  }

  return Array.from(tokens);
};

// 항목 제목에 필수 토큰이 하나라도 들어 있는지 본다. 요약·설명은 보지 않는다 —
// 실제 후기는 제목에 대상을 적고, 설명까지 보면 `식용유 1티스푼` 같은 계량 표현에 걸려
// 무관 영상이 통과한다(CS-3).
export const matchesRequiredTokens = (
  title: string,
  requiredTokens: string[]
): boolean => {
  // 필수 토큰이 없으면 판정 근거가 없다 — 필터를 걸면 전량 탈락하므로 통과시킨다.
  if (requiredTokens.length === 0) {
    return true;
  }

  const normalizedTitle = normalizeToken(title);

  // 토큰에 정규화를 한 번 더 거는 이유: normalizeToken은 멱등이라 이미 정규화된 값이면 비용·결과가 같고,
  // 호출측이 정규화되지 않은 값을 넘겨도 판정이 어긋나지 않는다(암묵적 사전조건 제거).
  return requiredTokens.some(token =>
    normalizedTitle.includes(normalizeToken(token))
  );
};

// 검색어에 넣을 이름을 만든다 — 사이즈·성별이 붙으면 검색이 과하게 좁아져 후보 자체가 사라진다
// (라이브 실측: `몽벨 montbell 버사자켓 남 미디엄`은 유튜브 0건, 사이즈·성별을 뺀 검색어는 25건).
// 낱말을 버릴지 판정할 때만 정규화를 쓰고 출력은 원문 낱말·순서를 그대로 둔다 — 검색어는 사람이
// 읽는 문구여야 하고 정규화한 형태(`몽벨버사자켓`)로는 검색이 되지 않는다.
// 길이 규칙(MIN_TOKEN_LENGTH)은 적용하지 않는다 — 모델 번호처럼 1자인 낱말(`에어로라이트 2`의 `2`)이
// 빠지면 `2`와 `3`이 구분되지 않아 다른 모델의 후기가 섞인다. 길이 규칙은 필수 토큰 판정 전용이다(GD-6).
export const buildSearchPhrase = (name: string): string => {
  // 타입은 string이지만 Firestore 문서를 캐스팅으로 받는 경로가 있어 런타임 undefined가 올 수 있다.
  if (!name) {
    return '';
  }

  const words = name
    .split(/\s+/)
    .filter(word => Boolean(word) && !GENERAL_TOKENS.has(normalizeToken(word)));

  // 낱말이 전부 일반 토큰이면 검색어에 제조사만 남아 아무 결과도 찾지 못한다 — 원문을 그대로 쓴다.
  if (words.length === 0) {
    return name;
  }

  return words.join(' ');
};
