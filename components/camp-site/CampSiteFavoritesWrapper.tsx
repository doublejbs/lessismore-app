import { FC, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import {
  isCampSiteFavoritesSheetOpen,
  markCampSiteFavoritesSheetClosed,
  markCampSiteFavoritesSheetOpened,
  takeCampSiteFavoritesSheet,
} from '@/model/camp-site/CampSiteFavoritesHandoff';
import CampSiteFavoritesListView from './CampSiteFavoritesListView';
import Layout from '../Layout';

// 즐겨찾기 리스트 시트(CS-9)는 박지 상세 시트(CS-3)와 동일하게 바텀 시트(formSheet 라우트)로 뜬다.
// 시트 상단엔 상태바가 없고, 콘텐츠는 app/_layout.tsx contentStyle의 bottom: 0 덕에 시트 높이를
// 그대로 채운다(그 주석 참고). 그래서 세이프에어리어를 적용하지 않는다.
const SHEET_EDGES = [] as const;

// 지도 탭 ★ 칩에서 넘어온 즐겨찾기 리스트를 formSheet 라우트로 렌더한다(CS-9).
// 기본 40%로 떠서 핸들바로 20%/100% 높이 조절이 가능하다.
const CampSiteFavoritesWrapper: FC = () => {
  const router = useRouter();
  // 지도에서 넘어온 시트 파라미터(콜백). 마운트 시 1회 소비한다.
  const [sheetParams] = useState(() => takeCampSiteFavoritesSheet());

  // 시트가 완전히 닫힐 때(마지막 인스턴스 unmount)에만 onClose(필터 해제)를 호출한다.
  // 20% 축소용 router.replace는 새 시트를 먼저 마운트하므로 그 도중엔 openCount가 0이 되지 않는다.
  useEffect(() => {
    markCampSiteFavoritesSheetOpened();

    return () => {
      markCampSiteFavoritesSheetClosed();

      if (!isCampSiteFavoritesSheetOpen()) {
        sheetParams?.onClose();
      }
    };
  }, [sheetParams]);

  // observer라 getSpots()를 렌더에서 호출해 즐겨찾기 로드 진행에 반응한다.
  const spots = sheetParams ? sheetParams.getSpots() : [];

  const handleOpenDetail = (spot: CampSpot) => {
    sheetParams?.onOpenDetail(spot);
  };

  // 닫기 버튼(CS-9) — 시트를 닫아 지도로 돌아간다(unmount 시 필터 해제).
  const handleClose = () => {
    router.back();
  };

  return (
    <View style={styles.sheet}>
      <Layout paddingHorizontal={0} edges={SHEET_EDGES}>
        <CampSiteFavoritesListView
          spots={spots}
          onOpenDetail={handleOpenDetail}
          onClose={handleClose}
        />
      </Layout>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
});

export default observer(CampSiteFavoritesWrapper);
