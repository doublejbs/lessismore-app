import type { NetInfo } from './NetInfoModule';

// OF §5: 웹에는 오프라인 저장이 없다 — 연결 상태 SDK를 번들에 싣지 않는다(늘 온라인).
export const loadNetInfo = (): NetInfo | null => {
  return null;
};
