장비 상세의 사용 기록, 내 정보의 요약처럼 수치를 나란히 보여줄 때.

```jsx
<div style={{display:'flex', gap:10}}>
  <StatTile value={9} label="사용" tone="accent" />
  <StatTile value={2} label="사용 안함" />
  <StatTile value={11} label="여행" />
</div>
```

한 줄에 최대 3개. 4개가 필요하면 2×2 격자로 내린다.
