import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';

/**
 * 화면의 주인공 콘텐츠(게시글·원 리뷰) 작성자가 차단되면 화면을 닫는다(CM-17).
 *
 * 어느 자리에서 차단했든(메뉴·댓글 행·다른 화면) 차단 목록이 observable이라 여기서 다시 계산된다 —
 * 호출하는 컴포넌트가 `observer`여야 한다. `keepOpen`이면(원 리뷰에 남의 답글이 남은 경우) 닫지 않는다.
 * 한 번만 닫고, 돌아갈 화면이 없으면 `fallbackPath`로 바꾼다.
 */
const useCloseWhenAuthorBlocked = (
  authorId: string | undefined,
  fallbackPath: string,
  keepOpen = false
) => {
  const router = useRouter();
  const closedRef = useRef(false);
  const isAuthorBlocked =
    !keepOpen && (app.getBlockedUserStore()?.isBlocked(authorId) ?? false);

  useEffect(() => {
    if (!isAuthorBlocked || closedRef.current) {
      return;
    }

    closedRef.current = true;

    if (router.canGoBack()) {
      router.back();

      return;
    }

    router.replace(fallbackPath as never);
  }, [isAuthorBlocked, fallbackPath, router]);
};

export default useCloseWhenAuthorBlocked;
