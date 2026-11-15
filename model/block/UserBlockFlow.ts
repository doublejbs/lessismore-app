import app from '@/model/app/App';
import { BlockUserInput } from '@/model/store/BlockedUserStore';

export interface UserBlockRequest extends BlockUserInput {
  // 차단 저장 성공 뒤 부른다 — 게시글 상세에서 작성자를 차단했으면 상세를 닫는다(CM-17).
  onBlocked?: () => void;
}

/**
 * `{닉네임} 차단` 메뉴를 둘 수 있는 작성자인가(CM-17). 내 콘텐츠와 빈 `authorId`(탈퇴자·운영 표식 없음)에는
 * 두지 않는다. 비로그인이면 내 uid가 비어 있어 남의 콘텐츠로 보이고, 누르면 로그인 모달로 간다.
 */
export const canBlockAuthor = (authorId: string | undefined) => {
  if (!authorId) {
    return false;
  }

  return authorId !== app.getFirebase().getUserId();
};

export const getBlockMenuText = (name: string) => {
  const l10n = app.getL10n();

  return l10n.t('moderation.block.menu', {
    name: name || l10n.t('moderation.block.unknownUser'),
  });
};

/**
 * 차단 흐름(CM-17): 로그인 확인 → 확인 알럿 → 저장 → 토스트 `차단했어요`.
 * 저장이 끝나면 차단 목록(메모리)이 바뀌어 UGC 목록이 바로 다시 그려진다.
 */
export const confirmUserBlock = (request: UserBlockRequest) => {
  const l10n = app.getL10n();

  // 메뉴 탭 자체를 센다 — 로그인 모달로 빠지는 탭도 포함한다(AN-3).
  app.getAnalyticsManager()?.logClick('block_user', { surface: request.surface });

  if (!app.getFirebase().isLoggedIn()) {
    app.getLogInAlertManager()?.show();

    return;
  }

  const store = app.getBlockedUserStore();

  if (!store || !canBlockAuthor(request.uid)) {
    return;
  }

  const { onBlocked, ...input } = request;
  const name = request.name || l10n.t('moderation.block.unknownUser');
  // 확인 버튼 연타·알럿 재사용으로 저장·`onBlocked`(화면 닫기)가 두 번 돌지 않게 한 번만 받는다.
  let handled = false;

  app.getAlertManager()?.show({
    message: l10n.t('moderation.block.confirmTitle', { name }),
    description: l10n.t('moderation.block.confirmMessage'),
    confirmText: l10n.t('moderation.block.confirm'),
    cancelText: l10n.t('common.cancel'),
    destructive: true,
    onConfirm: async () => {
      if (handled) {
        return;
      }

      handled = true;

      try {
        await store.block(input);
        app.getToastManager()?.show({ message: l10n.t('moderation.block.done') });
        onBlocked?.();
      } catch {
        handled = false;
        app.getToastManager()?.show({ message: l10n.t('moderation.block.failed') });
      }
    },
  });
};
