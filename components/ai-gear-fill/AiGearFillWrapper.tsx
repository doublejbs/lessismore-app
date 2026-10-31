import { FC, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import AiGearFill from '@/model/ai-gear-fill/AiGearFill';
import AiGearFillScreen from './AiGearFillScreen';

/**
 * AI 장비 자동 채우기 래퍼(AS-14). 도메인 객체를 1회 만든다.
 * 진입점(상세·편집)이 로그인 뒤 화면이라 보통은 해당 없지만, 딥링크 등으로 비로그인 상태에서
 * 열리면 닫고 기존 로그인 모달을 띄운다.
 */
const AiGearFillWrapper: FC = () => {
  const router = useRouter();
  const { bagId } = useLocalSearchParams<{ bagId?: string }>();
  const isLoggedIn = app.getFirebase().isLoggedIn();
  const [aiGearFill] = useState(() => AiGearFill.from(router, bagId ?? ''));

  useEffect(() => {
    if (isLoggedIn && bagId) {
      return;
    }

    // 딥링크로 처음 열면 돌아갈 화면이 없다 — 그때는 탭 루트로 보낸다.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }

    if (!isLoggedIn) {
      app.getLogInAlertManager()?.show();
    }
  }, [bagId, isLoggedIn, router]);

  if (!isLoggedIn || !bagId) {
    return null;
  }

  return <AiGearFillScreen aiGearFill={aiGearFill} />;
};

export default observer(AiGearFillWrapper);
