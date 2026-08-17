import { FC, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import Layout from '@/components/Layout';
import BagFilmCardView from '@/components/bag-film-card/BagFilmCardView';
import app from '@/model/app/App';
import BagFilmCard from '@/model/bag-film-card/BagFilmCard';
import {
  clearBagFilmCardContext,
  getBagFilmCardContext,
} from '@/model/bag-film-card/BagFilmCardHandoff';

/**
 * 세이프에어리어 패딩을 Layout에 맡기지 않는다(BS-10).
 *
 * 카드 프리뷰가 화면을 가장자리까지 꽉 채워야 하고, 떠 있는 컨트롤만 인셋 안쪽에 놓이면
 * 된다 — 인셋 처리는 오버레이가 `useSafeAreaInsets()`로 직접 한다.
 */
const NO_EDGES = [] as const;

// 하단에 떠 있는 CTA·칩 묶음(약 190pt) 위로 토스트를 올려 컨트롤을 가리지 않게 한다.
const TOAST_BOTTOM = 200;

const BagFilmCardWrapper: FC = () => {
  const router = useRouter();
  // 핸드오프는 화면이 살아있는 동안 고정이어야 하므로 첫 렌더에 1회만 읽어 도메인 객체를 만든다.
  const [filmCard] = useState(() => {
    const bagDetail = getBagFilmCardContext();

    return bagDetail
      ? BagFilmCard.from(bagDetail, app.getToastManager()!)
      : null;
  });

  // 컨텍스트 없이 열리면(딥링크 등) 조용히 닫는다. 화면을 떠날 때 핸드오프를 정리한다.
  useEffect(() => {
    if (!filmCard) {
      router.back();
    }

    return () => {
      clearBagFilmCardContext();
    };
  }, [filmCard, router]);

  if (!filmCard) {
    return null;
  }

  return (
    <Layout paddingHorizontal={0} edges={NO_EDGES} toastBottom={TOAST_BOTTOM}>
      <BagFilmCardView filmCard={filmCard} />
    </Layout>
  );
};

export default observer(BagFilmCardWrapper);
