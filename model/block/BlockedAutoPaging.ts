import { reaction } from 'mobx';
import { BLOCKED_AUTO_PAGE_LIMIT } from './BlockLimits';

interface Params {
  // 받은 항목은 있는데 차단 필터로 보이는 항목이 0이고, 다음 페이지가 있으며, 읽는 중이 아니다.
  shouldLoad: () => boolean;
  // 보이는 항목이 하나라도 있거나 받은 항목이 비었다 — 연쇄 횟수를 다시 센다.
  shouldReset: () => boolean;
  load: () => void;
}

/**
 * CM-17: 보이는 목록이 차단 필터로 통째로 비면 다음 페이지를 이어 받는다 — 페이지를 받은 직후뿐 아니라
 * 차단 목록이 늦게 읽혔을 때, 세션 중 차단했을 때, 조용한 새로고침 뒤에도 같은 조건이면 돈다.
 * 빈 상태 한 번에 `BLOCKED_AUTO_PAGE_LIMIT`번까지만 받는다. 돌려주는 함수로 멈춘다.
 */
export const watchBlockedEmptyList = ({ shouldLoad, shouldReset, load }: Params) => {
  let autoPages = 0;

  return reaction(shouldLoad, value => {
    if (!value) {
      if (shouldReset()) {
        autoPages = 0;
      }

      return;
    }

    if (autoPages >= BLOCKED_AUTO_PAGE_LIMIT) {
      return;
    }

    autoPages += 1;
    load();
  }, { fireImmediately: true });
};
