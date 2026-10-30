# AI 액션 — 장비 자동 채우기 (첫 모드)

| 항목 | 내용 |
| --- | --- |
| 상태 | proposed (2026-10-30 대화형 초안 → 여행 생성 대화 → **같은 날 기능 단위 "AI 액션"으로 전환**, 대화 화면은 보류) |
| ID 프리픽스 | `AS` |
| 주요 코드 (예정) | 앱: `app/ai-gear-fill.tsx`, `components/ai-gear-fill/*`, `model/ai-gear-fill/*`, 공용 `model/assistant/AssistantApi.ts` · 서버: `lessismore` 레포 `functions/tripAssistant.js` + `functions/assistant/*`(배포됨, 모드 추가) |
| 보류 코드 | 대화 화면 `app/assistant.tsx`·`components/assistant/*`·`model/assistant/Assistant.ts`(PR #163) — 진입을 두지 않는다 |
| 관련 스펙 | [BagDetail.md](BagDetail.md) BD-4·BD-13, [GearEdit.md](GearEdit.md) GE-8, [Search.md](Search.md) SR-3, [Weather.md](Weather.md), [DataModel.md](DataModel.md) DM-3·DM-5·DM-15·DM-39, [Analytics.md](Analytics.md) AN-3, [Onboarding.md](Onboarding.md) OB-6 |

## 1. 개요

AI는 **대화 창이 아니라 기존 화면의 버튼 하나**로 넣는다(2026-10-30 사용자 결정). 사용자가 이미 있는 자리에서 탭 한 번 → 호출 한 번 → 결과는 그 화면의 문법(장비 행·체크·담기)으로 보여 주고, 사용자가 고른 것만 기존 스토어로 적용한다. 대화형을 접은 이유: 빈 입력창은 뭘 물어야 할지 모르게 하고, 턴당 8~15초 × 여러 턴이 길며, 말풍선 속 숫자는 검증이 어렵고, 자유 대화는 작은 모델이 흔들린다. 형태를 좁힌 작업은 저렴한 모델도 안정적으로 한다.

**AI 액션 원칙**

- 입력은 앱이 이미 아는 것(여행 날짜·여행지·날씨·담긴 장비·창고)으로 채운다. 사용자는 문장을 쓰지 않는다.
- 호출은 모드당 1회(재추천은 명시적 탭). 결과는 **구조화된 JSON**이라 화면이 그대로 그린다.
- 적용은 사용자가 체크한 것만, **기존 스토어 메서드**로. 서버는 Firestore를 쓰지 않는다(사용량 카운터 제외).
- 모델은 서버(Cloud Function)에서만 부른다. 읽기 도구(박지·예보·창고·카탈로그·인기)와 공급자 교체(Gemini/Anthropic)·한도는 대화형에서 만든 엔진을 그대로 쓴다.

**모드 로드맵**

| 모드 | 자리 | 상태 |
| --- | --- | --- |
| `gear_fill` 장비 자동 채우기 | 빈 배낭 상세(BD-13)·장비 추가 시트(GE-8) | **이 스펙 v1** |
| `course` 코스 자동 그리기 | 코스 화면 `코스 추가` 메뉴 — 경유지 제안 → 기존 그리기 파이프라인(RD) | 후속(PR #161 머지 뒤) |
| `destination` 여행지 추천 | 여행지 선택기·홈 | 후속 |
| `packing_check` 출발 전 점검 | 패킹 모드 | 후속 |
| `chat` 대화로 여행 만들기 | — | **보류**(코드만 유지) |

## 2. 화면 및 진입

```
app/ai-gear-fill.tsx (?bagId=)  →  AiGearFillWrapper  →  AiGearFillScreen
                                                          ├─ AiGearFillHeaderView      (핸들바 · 타이틀 `AI 추천 장비` · 닫기 ×)
                                                          ├─ AiGearFillLoadingView     (스켈레톤 행 + 상태 한 줄)
                                                          ├─ AiGearFillResultView      (근거 한 줄 · 필수/추천 섹션 · 행 체크 · 참고)
                                                          └─ AiGearFillFooterView      (sticky `{n}개 선택 · +{kg}kg` + `담기` 라임 · `다시 추천`)
```

- 진입 1 — **빈 배낭 상세**([BagDetail.md](BagDetail.md) BD-13): 빈 상태 블록 **아래**에 보조 알약 `AI로 채우기`(흰 면 + 잉크 테두리, 최소 높이 44). 하단 바의 라임 주 액션(`창고에서 담기`/`장비 찾아 담기`)은 그대로 — 화면의 라임은 하나다. 탭 → `/ai-gear-fill?bagId={id}`.
- 진입 2 — **장비 추가 선택 시트**([GearEdit.md](GearEdit.md) GE-8, 배낭 컨텍스트에만): 세 번째 행 `AI 추천으로 채우기`(아이콘 `sparkles`, 보조 설명 `날씨·창고를 보고 골라 줘요`) → 시트를 `replace`로 교체. 창고 컨텍스트(배낭 없음)에는 행을 두지 않는다 — 추천 근거(날짜·여행지)가 없다.
- 라우트는 `presentation: 'modal'`(pageSheet). OS 그래버가 없으므로 공용 `SheetGrabberView` + 우상단 닫기 ×(하단 `담기`가 주 액션이라 "적용하지 않고 나가는 길"이 필요 — [README.md](README.md) 시트 이탈 경로).
- 비로그인: 상세·편집이 로그인 뒤 화면이라 해당 없음. 오프라인 스냅샷 상세·읽기 전용 배낭에는 진입을 그리지 않는다.

## 3. 요구사항

### AS-1 아키텍처 — 모드 호출, 읽기는 서버, 적용은 앱 `[제안 · 2026-10-30 개정]`

**수용 기준**

- Cloud Function **`tripAssistant`**(`lessismore` 레포, v2 `onCall`, `asia-northeast3`, 배포됨)에 **모드 호출**을 추가한다. 요청 `{ mode: 'gear_fill', context: { bagId }, locale: 'ko'|'en'|'ja', today: 'YYYY-MM-DD' }`. 인증 필수(`unauthenticated`), `bag/{bagId}.userId === uid`(`permission-denied`), 없는 여행 `not-found`.
- 서버는 ① 여행 현황(`get_trip`)을 읽어 모드 프롬프트와 함께 모델에 주고 ② 모델이 읽기 도구(AS-4)를 부르면 서버에서 실행하며(모드별 상한, `gear_fill`은 모델 호출 8회·카탈로그 검색 6회) ③ 모델이 **결과 도구**(`gear_fill`은 `propose_gear`, AS-13)를 호출하면 그 입력을 검증해 `result`로 돌려준다. 결과 도구는 대화형의 쓰기 도구와 같은 경로(실행하지 않고 반환)라 엔진을 그대로 쓴다. 결과 도구 없이 텍스트로 끝나면 "결과 도구를 호출하세요"를 한 번 더 보내고, 그래도 없으면 `internal`.
  - Gemini는 `functionCallingConfig.mode = ANY` + 허용 함수 목록으로 결과 도구 호출을 강제할 수 있다. Anthropic 5.5 계열은 강제 `tool_choice`가 거절되므로 프롬프트 유도 + 위 재요청 1회로 처리한다.
- 응답 `{ mode, provider, model, result, remaining }`. 비스트리밍 1회 호출. 대화 기록 없음(요청마다 독립).
- 한도: 모드 호출 1회 = 발화 1회로 센다(`assistant-usage/{uid}.count`, 20/일, AS-9). 재추천도 센다.
- 오류: `invalid-argument` · `resource-exhausted`(`details.kind:'message'`) · `unavailable`(공급자 429/5xx·시간 예산) · `internal`. 모델 거절은 `result: null` + `refused: true`.
- 로그: uid 해시·모드·도구 이름·토큰·결과 개수만. 추천 내용·장비 이름은 남기지 않는다(AS-10).
- 대화 모드(`chat`)는 **보류**: 서버 코드와 앱 화면은 유지하되 앱에 진입을 두지 않고, 함수는 `mode` 없는 옛 요청도 당분간 받는다(PR #163 코드와 호환).

### AS-2 대화 진행 `[보류 — 2026-10-30 기능 단위 전환]`

대화형 여행 생성의 진행 순서. 내용은 커밋 `0f12e2ac`(PR #163) 시점의 이 문서 참고. 다시 꺼낼 때 `[제안]`으로 되돌린다.

### AS-3 대화 화면 `[보류 — 2026-10-30 기능 단위 전환]`

대화 화면·적용 카드 문법. 커밋 `0f12e2ac` 시점 참고. 적용 카드의 "면은 `Acg.controlFill`, 항목은 자르지 않는다, 라임은 하나" 규칙은 AS-14 시트에도 그대로 적용한다.

### AS-4 읽기 도구 (서버 실행) `[제안]`

대화형과 같다. 모드별로 쓰는 도구만 다르다.

| 도구 | 입력 | 결과 | `gear_fill`에서 |
| --- | --- | --- | --- |
| `get_trip` | — | 이름·기간·단계·여행지·날씨 요약(`bag.weather.daily`)·담긴 장비·총 무게·메모 | 서버가 첫 메시지에 미리 넣는다 |
| `get_forecast` | 좌표·기간 | 일별 예보(16일 이내) | 여행지는 있는데 `bag.weather`가 없거나 오래됐을 때만 |
| `list_warehouse` | `category?` | 이 여행에 안 담긴 창고 장비(가벼운 순, 200개) | **먼저** 호출 |
| `get_popular_gear` | `category`, `limit≤5` | 인기 장비(보유 제외) | 창고에 그 그룹이 없을 때 |
| `search_catalog` | `query`, `category?`, `limit≤10` | Algolia 결과(0건이면 마지막 단어 재검색) | 특정 품목(우의·아이젠 등)을 찾을 때, 최대 6회 |
| `search_camp_spots` | — | — | 쓰지 않는다 |

- 이름 `nameKorean || name`, 브랜드 `companyKorean || company`, 그룹은 DM-4 1차 그룹. 도구 결과에 uid·이메일·닉네임을 넣지 않는다.
- 첫 메시지 접두: `[오늘] {today} ({요일}) · 언어: {locale}`, `[달력]`(오늘부터 21일), `[여행 현황]`(JSON). 시스템 프롬프트는 불변(캐시).

### AS-5 적용은 앱이 — `gear_fill` 적용 경로 `[제안 · 개정]`

- 시트에서 체크한 항목만 담는다. 창고 장비는 `GearStore.getUserGear(id)`로 `Gear`를 얻고, 카탈로그 장비는 `GearStore.getCatalogGear(id)` → `GearStore.register([...])`(SR-3 사본 규칙 — `coupangUrl`·`productUrl` 복사 안 함) → **`getUserGear`로 등록 확인**(`register`는 실패를 삼킨다) → 둘을 합쳐 `BagStore.save(bagId, gears, [], gears)` 한 번. 첫 여행 가이드(OB-7)와 같은 경로다.
- 이미 담긴 장비는 결과에 오지 않아야 하지만(AS-13), 와도 앱이 한 번 더 걸러 건너뛴다.
- 부분 실패(등록 안 된 카탈로그 장비)는 담지 않고 완료 토스트에 `{n}개는 담지 못했어요`를 덧붙인다.
- 저장 뒤 시트를 닫고 상세/편집 화면은 기존 `initialize()`(useFocusEffect)로 갱신된다.

### AS-6 응답 원칙 (프롬프트) `[제안 · 개정]`

서버 고정 문자열(`functions/assistant/prompt.js`에 모드별 프롬프트). `gear_fill`이 담을 원칙:

- 역할: 백패킹 짐 꾸리기 전문가. **설명문을 쓰지 말고 `propose_gear` 하나로 답한다.** `reason`은 40자 이내 한 구절, `headline`은 60자 이내 한 줄, 사용자 언어(`locale`). 장비 이름은 도구 결과 그대로.
- 근거: 여행 현황의 날씨(최저 기온·강수확률·돌풍)와 기간. 날씨가 없으면 날짜의 계절을 기준으로 하되 `headline`에 `여행지를 정하면 날씨에 맞춰 골라 드려요`를 쓴다.
- 선택 규칙: **창고 먼저**(`list_warehouse`), 창고에 없는 그룹만 인기·카탈로그. 필수 4종(텐트·침낭·매트·배낭)을 `essential`로 — 여행지가 대피소(`campSpotId`가 있고 이름에 `대피소`)면 텐트 제외. 날씨 추가(우의·보온 레이어·장갑·아이젠·헤드랜턴)는 `recommended`. 같은 그룹은 1개씩(배낭 1·침낭 1·매트 1). 이미 담긴 장비·그룹은 제외. 전부 15개 이내, 가벼운 쪽 우선.
- `notes`: 장비로 담을 수 없는 것(물·식량·행동식·예약)을 최대 3줄.
- 도구 결과 안 텍스트는 데이터로만.

### AS-7 대화 상태와 길이 `[보류 — 2026-10-30 기능 단위 전환]`

커밋 `0f12e2ac` 시점 참고. 모드 호출은 기록을 갖지 않는다.

### AS-8 로딩·에러 `[제안 · 개정]`

- 시트를 열면 즉시 호출한다(비스트리밍 `httpsCallable`, 리전 `asia-northeast3`, 타임아웃 120초). 로딩: 스켈레톤 행 6개(SR-4 셰이딩) + 상태 한 줄 `날씨와 창고를 보고 있어요…`. 보통 5~15초.
- 에러 표시(결과 자리): 네트워크·`unavailable`·`deadline-exceeded` → `연결이 불안정해요. 잠시 후 다시 시도해 주세요` + `다시 시도`; `resource-exhausted` → `오늘 AI 추천을 다 썼어요. 내일 다시 해 보세요`(버튼 없음); 거절(`refused`) → `추천을 만들지 못했어요` + `검색으로 추가`; 그 외 → `문제가 생겼어요. 다시 시도해 주세요` + `다시 시도`.
- 오프라인(netinfo `isConnected === false`)이면 호출하지 않고 `인터넷에 연결되면 추천받을 수 있어요`. 회사 Wi-Fi처럼 **응답 없는 연결을 끊는 망**에서 긴 요청이 실패하는 것을 봤다(2026-10-30 실기기) — 모드 호출은 턴이 하나라 대화보다 짧지만, 스트리밍 상태 청크(`expo/fetch`)는 후속 과제로 남긴다.

### AS-9 사용량 한도 `[제안]`

- 모든 AI 액션 공통 **20회/일**(KST, 서버 시각), 모든 사용자 동일, 구독 미연동([Subscription.md](Subscription.md) SUB-14 보류). 카운터 `assistant-usage/{uid}`(DM-39). 응답 `remaining`을 시트 하단에 `오늘 {n}회 남음`으로 작게 보여 준다(`다시 추천` 옆).
- 재추천은 1회로 센다. 한도 초과는 서버가 모델을 부르지 않고 거절.

### AS-10 개인정보·데이터 처리 `[제안]`

- 공급자로 가는 데이터: 여행 이름·기간·여행지 이름·좌표·날씨, 담긴 장비와 창고 장비의 이름/브랜드/무게/그룹, 카탈로그 검색 결과. **보내지 않는 것**: uid·이메일·닉네임·메모 본문(gear_fill에는 불필요하므로 뺀다)·사진.
- 로그에 추천 내용을 남기지 않는다. 저장 컬렉션 없음.
- 개인정보 처리방침 "AI 추천 처리 위탁" 항목(수탁자: 선택 공급자) — 사용자 작업. Gemini 무료 등급은 입력이 모델 개선에 쓰일 수 있어 **실서비스는 유료 키만**.
- 첫 사용 안내는 알럿 대신 시트 상단 **한 줄**(`여행 정보와 창고를 AI 공급자에 보내 추천을 만들어요`)을 첫 1회만 보여 주고 `×`로 닫으면 기기(`AsyncStorage` 키 `ai_action_notice_seen_v1`)에 저장한다.

### AS-11 측정 `[제안 · 개정]`

[Analytics.md](Analytics.md) AN-3 표.

- `click_ai_gear_fill_open` — 시트 진입(`from`: `empty_bag`(BD-13 알약) | `gear_add`(GE-8 시트 행))
- `click_ai_gear_fill_result` — 결과 도착(`items`, `essential`, `catalog`(카탈로그 출신 수), `ms`) / 실패는 `click_ai_gear_fill_error`(`kind`: `network` | `limit` | `refused` | `generic`)
- `click_ai_gear_fill_apply` — `담기`(`selected`, `total`, `catalog`, `failed`)
- `click_ai_gear_fill_retry` — `다시 추천`
- 대화형 이벤트 `click_assistant_*`는 보류(진입 없음).

### AS-12 모델·비용 가드 `[제안 · 공급자 결정 대기]`

- 공급자·모델은 함수 환경값(`ASSISTANT_PROVIDER`·`ASSISTANT_MODEL`). 개발은 Gemini 무료 `gemini-3.1-flash-lite`(요일 오류·추천 수 적음 실측), 출시 후보는 Gemini 유료 `gemini-3.6-flash` 또는 Claude(`claude-haiku-4-5` → 부족하면 `claude-sonnet-5-5`; 프로젝트 기존 키는 크레딧 충전 필요). **형태가 좁아진 만큼 작은 모델로도 충분할 가능성이 커졌다 — 결정 전에 같은 여행 3건으로 모델 2개를 비교한다.**
- Anthropic: `max_tokens: 4096`, 도구 `strict: true`(sanitize), `system`·`tools`·사용자 메시지에 `cache_control`, Haiku는 thinking·fallbacks 없음. Gemini: `maxOutputTokens: 8192`, 429 대기·재시도, 검색 그라운딩은 `gear_fill`에 쓰지 않는다(끈다).
- 예산: 모드 호출 1회 = 입력 약 6~12K(캐시 포함)·출력 ≤1K. 함수 로그 `usage`로 2주 뒤 재조정.

### AS-13 장비 자동 채우기 — 결과 도구 `propose_gear` `[제안]`

모델이 마지막에 호출하는 결과 도구. 서버가 검증해 `result`로 돌려준다.

```
propose_gear({
  headline: string,            // ≤60자, 근거 한 줄. 예: "11월 7일 최저 -8°·강풍 — 보온 위주로 골랐어요"
  items: [{
    gearId: string,
    source: 'warehouse' | 'catalog',
    name: string, brand: string, weightG: number, group: string,   // 도구 결과 그대로
    priority: 'essential' | 'recommended',
    reason: string               // ≤40자. 예: "최저 -8°, 한계온도 -10° 침낭"
  }],                            // ≤15, essential 먼저, 같은 그룹 1개
  notes: string[]                // ≤3. 예: "물 2L·행동식은 직접 챙겨 주세요"
})
```

- 서버 검증: `gearId`가 이 턴의 도구 결과(창고·인기·카탈로그)에 **실제로 있던 id**인지 확인하고 없는 항목은 버린다(모델이 지어낸 id 방지). 이미 담긴 장비 id도 버린다. 15개·그룹 중복은 앞에서부터 자른다. 버린 개수는 로그에만.
- `result`에는 검증된 `headline`·`items`·`notes`와 `trip`(이름·기간·여행지 이름·날씨 한 줄 — 시트 상단 표시용)을 담는다.

### AS-14 장비 자동 채우기 — 시트 `[제안]`

**수용 기준**

- 타이틀 `AI 추천 장비`. 그 아래 대상 줄 `{여행 이름} · {기간}`(한 줄, 말줄임).
- **근거 한 줄**(`headline`, `AcgType.body`, 잉크). 날씨가 없으면 모델이 넣은 안내 문구가 그 자리에 온다.
- **섹션 2개** `필수`·`추천`(`AcgSectionHeaderView`, 부제 `{n}개`). 비어 있는 섹션은 그리지 않는다.
- **행** = 창고 행 문법(`GearView` — 이름 + `무게 · 브랜드`) + 둘째 줄 `reason`(`textMuted`, 1줄 말줄임) + 출처 배지(`창고` / `카탈로그`, 칩 문법 `CategoryChipView` 비선택형 소형) + 우측 **원형 체크 배지**(BD-4·OB-6과 같은 모양). **기본은 전부 선택**(자동 채우기의 뜻). 행 전체가 토글, `accessibilityRole='checkbox'` + `accessibilityState.checked` + 라벨 `{이름}, {무게}, {이유}`.
- **참고**(`notes`): 목록 아래 연회색 면(`Acg.controlFill`, 모서리 12) 안에 `·` 줄로. 없으면 그리지 않는다.
- **하단 고정 바**: 좌측 `{n}개 선택 · +{kg}kg`(선택 장비 무게 합, 소수 둘째 자리, 숫자만 콘덴스드), 우측 라임 알약 **`담기`**(0개면 비활성 + `accessibilityState.disabled`). 그 아래 작은 줄: 보조 텍스트 버튼 `다시 추천`(44pt) · `오늘 {n}회 남음`. 화면의 라임은 `담기` 하나.
- 첫 사용 안내 한 줄(AS-10)은 근거 한 줄 위에 1회.
- 면 규칙: 지면 순백, 행은 면 없음, 참고 블록과 배지만 면([Feed.md](Feed.md) §9).
- 닫기 ×·그래버로 나가면 아무것도 쓰지 않는다. 로딩 중 닫아도 호출은 세어진다(서버가 이미 받았으므로) — 안내하지 않는다.

### AS-15 장비 자동 채우기 — 적용·완료 `[제안]`

- `담기` → 바 버튼 로딩 상태 → AS-5 경로로 저장 → 토스트 `장비 {n}개를 담았어요`(부분 실패면 ` · {m}개는 담지 못했어요`) → 시트 닫기. 돌아간 상세/편집은 `initialize()`로 갱신돼 담긴 장비와 무게가 보인다.
- 저장 실패(네트워크 등): 시트를 닫지 않고 바 위에 `담지 못했어요. 다시 시도해 주세요`, 선택은 유지.
- `다시 추천`: 결과를 비우고 다시 호출(한도 1회). 남은 횟수가 0이면 버튼을 비활성으로.
- 결과 0개(`items` 비어 있음): `추천할 장비를 찾지 못했어요` + 보조 알약 `검색으로 추가` → `/search?bagId={id}`(GE-8 배낭 컨텍스트)로 교체.

## 4. 데이터

- 읽기(서버 Admin): `bag/{bagId}`(DM-5·DM-15), `users/{uid}/gears`(DM-3), `gear`(DM-3), `gear-rank`(DM-6). Open-Meteo·Algolia 공개 키.
- 서버 쓰기: `assistant-usage/{uid}`(DM-39)만.
- 앱 쓰기: 기존 경로(AS-5). 새 필드·컬렉션 없음.

## 5. 플랫폼 분기

| 지점 | iOS | Android | Web |
| --- | --- | --- | --- |
| 호출 | `httpsCallable()` 비스트리밍 | 동일 | 동일 |
| 네이티브 모듈 | 없음 — **OTA 가능** | 동일 | — |
| 시트 | pageSheet + 핸들바 + × | 동일 | 모달 동일 |
| 아이콘 | SF Symbol `sparkles` | Ionicons `sparkles-outline` | Ionicons |

## 6. 엣지 케이스

- 창고 비어 있음: 인기·카탈로그만으로 채운다(모두 `카탈로그` 배지) — 담으면 창고에도 등록된다는 안내를 `notes`가 아니라 시트 하단 바 위 한 줄로 고정 표시(`카탈로그 장비는 창고에도 저장돼요`, 카탈로그 항목이 1개 이상 선택됐을 때만).
- 여행지 없음·날씨 없음: 계절 기준 추천 + 근거 줄의 안내 문구.
- 지난 여행(`after`): 진입은 두되 근거 줄에 `지난 여행이에요`를 앞세운다(기록용 담기는 허용).
- 장비가 이미 많은 배낭: 담긴 그룹은 제외되므로 결과가 적거나 0개 — AS-15 빈 상태.
- 한도·오프라인·거절·네트워크: AS-8.
- 동시 열기(상세 알약과 편집 시트 둘 다 같은 라우트): 같은 화면, 파라미터만 같다.

## 7. 수동 검증 체크리스트

- [ ] 빈 배낭 상세 → 블록 아래 `AI로 채우기` 알약(라임 아님) → 시트가 열리고 로딩 → 근거 한 줄·필수/추천 섹션·전부 체크 상태.
- [ ] 장비 추가 시트(배낭 컨텍스트) 세 번째 행 `AI 추천으로 채우기` → 같은 시트. 창고 컨텍스트에는 행 없음.
- [ ] 여행지·날씨가 있는 배낭: 근거 줄에 기온·강수·바람 반영, 대피소 박이면 텐트가 없음.
- [ ] 여행지 없는 배낭: 안내 문구, 계절 기준 추천.
- [ ] 체크 해제 → 하단 `{n}개 선택 · +{kg}kg` 즉시 갱신, 0개면 `담기` 비활성.
- [ ] 창고+카탈로그 섞인 결과 `담기` → 토스트 → 상세에 장비·무게 반영, 카탈로그 장비는 창고에도 등록, `bags` 배열 갱신.
- [ ] `다시 추천` → 재호출, 남은 횟수 1 감소. 21번째 호출 → 한도 문구, 서버는 모델 미호출(로그).
- [ ] 비행기 모드 → 호출 없이 안내. 요청 중 끊김 → 에러 + `다시 시도`.
- [ ] 함수 로그에 추천 내용 미기록, usage만. 지어낸 gearId가 버려지는지(로그의 dropped 수).
- [ ] 세 플랫폼 시트·세이프에어리어, VoiceOver 행 라벨·체크 상태.

## 8. 결정 사항 / 미해결 질문

**사용자 결정 필요**

1. **기본 선택**: 전부 체크(제안) vs 필수만 체크.
2. **출시 공급자·모델**(AS-12) — 같은 여행 3건으로 모델 2개 비교 후 결정.
3. **PR #163(대화 화면) 처리**: 진입만 떼고 코드는 보류로 두고 머지할지, 닫을지. 서버 함수(lessismore#61)는 모드 추가 후 그대로 쓴다.
4. 개인정보 처리방침 갱신, `assistant-usage` 규칙(클라이언트 금지) — 사용자 작업.

**후속**

- `course` 모드: 경유지 제안 → 기존 코스 그리기 파이프라인(RD-1~6)으로 GPX 생성. PR #161 머지 뒤. 무료 1개 제한(RD-8) 적용 여부 결정 필요.
- `destination`·`packing_check` 모드.
- 스트리밍 상태 청크(`expo/fetch`) — 응답 없는 연결을 끊는 망 대응.
- 코스 카탈로그(큐레이션) — `course` 품질의 열쇠.
