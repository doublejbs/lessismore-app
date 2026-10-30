import { FC, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import Assistant from '@/model/assistant/Assistant';
import AssistantApi from '@/model/assistant/AssistantApi';
import AssistantActionApplier from '@/model/assistant/AssistantActionApplier';
import AssistantScreen from './AssistantScreen';

// 시트가 다 올라온 뒤 안내 알럿을 띄운다 — 모달 표시 중에 다른 모달을 올리면 iOS가 무시한다.
const INTRO_DELAY_MS = 500;

/**
 * 도우미 화면 래퍼(AS-3). 대화 도메인 객체를 1회 만들고, 첫 진입이면 안내(AS-10)를 띄운다.
 * 도우미는 로그인 뒤에만 열린다(§2) — 진입점이 로그인을 먼저 처리하지만, 딥링크 등으로 비로그인 상태에서
 * 열리면 닫고 기존 로그인 모달을 띄운다.
 */
const AssistantWrapper: FC = () => {
  const router = useRouter();
  const isLoggedIn = app.getFirebase().isLoggedIn();
  const [assistant] = useState(() =>
    Assistant.from(
      AssistantApi.new(),
      AssistantActionApplier.new(),
      app.getNetworkStatus()
    )
  );

  useEffect(() => {
    if (isLoggedIn) {
      return;
    }

    // 딥링크로 처음 열면 돌아갈 화면이 없다 — 그때는 탭 루트로 보낸다.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }

    app.getLogInAlertManager()?.show();
  }, [isLoggedIn, router]);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;

    const showIntro = async () => {
      if (!(await assistant.shouldShowIntro()) || !mounted) {
        return;
      }

      timer = setTimeout(() => {
        const l10n = app.getL10n();

        app.getAlertManager()?.show({
          message: l10n.t('assistant.intro.message', {
            provider: l10n.t('assistant.intro.provider.default'),
          }),
          confirmText: l10n.t('assistant.intro.start'),
          cancelText: l10n.t('assistant.intro.later'),
          onConfirm: async () => {
            await assistant.markIntroSeen();
          },
        });
      }, INTRO_DELAY_MS);
    };

    void showIntro();

    return () => {
      mounted = false;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [assistant, isLoggedIn]);

  if (!isLoggedIn) {
    return null;
  }

  return <AssistantScreen assistant={assistant} />;
};

export default AssistantWrapper;
