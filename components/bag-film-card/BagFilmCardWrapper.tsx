import { FC, useEffect, useState } from 'react';
import { Platform } from 'react-native';
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

// LG-1: iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼 이중 인셋을 막는다.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

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
    <Layout
      paddingHorizontal={0}
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
      toastBottom={140}
    >
      <BagFilmCardView filmCard={filmCard} />
    </Layout>
  );
};

export default observer(BagFilmCardWrapper);
