필터·카테고리를 좁히는 알약 칩 — 가로 스크롤 행에 나열해 쓴다.

```jsx
<Chip label="전체" selected />
<Chip label="백패킹" dotColor="var(--spot-backpacking)" />
<Chip label="체어" size="sm" />
```

- 1차 필터는 `md`(34px), 세분 필터는 `sm`(28px)로 위계를 나눈다.
- 선택은 언제나 잉크 채움 하나뿐 — 회색 채움 변형을 만들지 않는다.
- `dotColor`는 지도 유형 필터처럼 색이 범례를 겸할 때만.
