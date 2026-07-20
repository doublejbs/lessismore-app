import { FC, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Color } from '@/constants/DesignTokens';
import CampSiteDetail from '@/model/camp-site/CampSiteDetail';
import CampSiteDetailDispatcher from '@/model/camp-site/CampSiteDetailDispatcher';
import {
  markCampSiteDetailSheetClosed,
  markCampSiteDetailSheetOpened,
  takeCampSiteDetailSheet,
} from '@/model/camp-site/CampSiteDetailSheetHandoff';
import CampSiteDetailView from './CampSiteDetailView';
import Layout from '../Layout';

// 상세는 바텀 시트로 뜬다(CS-2) — 시트 상단엔 상태바가 없고 하단은 시트가 이미
// 홈 인디케이터 위로 떠 있어, 세이프에어리어를 더하면 여백만 커진다.
// 시트 높이 자체는 네이티브가 detent로 정하고, 콘텐츠는 app/_layout.tsx의
// contentStyle에 건 bottom: 0 덕에 그 높이를 그대로 채운다(그 주석 참고).
const SHEET_EDGES = [] as const;

const CampSiteDetailWrapper: FC = () => {
  const router = useRouter();
  const [campSiteDetail] = useState(() =>
    CampSiteDetail.new(router, CampSiteDetailDispatcher.new())
  );
  // 지도에서 넘어온 시트 파라미터는 마운트 시 1회 소비하고 상태로 들고 있는다 —
  // 리렌더에 다시 소비되지 않게 lazy 초기화로 읽는다. 지도를 거치지 않은 진입
  // (공유 딥링크)에는 핸드오프가 없어 null이다(CS-2 위치로 이동 버튼 미노출).
  const [sheetParams] = useState(() => takeCampSiteDetailSheet());
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const initialized = campSiteDetail.isInitialized();

  useEffect(() => {
    campSiteDetail.initialize(id);
  }, [id, campSiteDetail]);

  // 시트가 닫히면(스와이프·닫기) 지도의 마커 선택을 해제한다.
  // 열림 카운트는 지도가 "기존 시트 닫고 새로 열기"를 판단하는 데 쓴다(CS-2).
  useEffect(() => {
    markCampSiteDetailSheetOpened();

    return () => {
      markCampSiteDetailSheetClosed();
      sheetParams?.onClose();
    };
  }, [sheetParams]);

  // 시트는 열어 둔 채 지도 카메라만 그 박지로 되돌린다(뒤 지도가 조작 가능한 undimmed 시트).
  const handleMoveToSpot = () => {
    const spot = campSiteDetail.getSpot();

    if (!spot) {
      return;
    }

    sheetParams?.onMoveToSpot(spot);
  };

  // 여행지 선택기(DST-3) 위에 겹쳐 뜬 상세는 배낭 리스트를 열지 않고 이 박지를 현재 배낭
  // 여행지로 바로 설정한다. 핸드오프에 onSetBag이 없는 진입(지도 탭·공유 딥링크)에는 아래에서
  // undefined를 넘겨 CampSiteDetailView가 기존대로 배낭 선택 시트(CS-5)를 연다.
  // CTA가 저장 완료까지 로딩을 표시할 수 있게 Promise를 그대로 돌려준다(DST-3).
  const handleSetBag = async () => {
    const spot = campSiteDetail.getSpot();

    if (!spot) {
      return;
    }

    await sheetParams?.onSetBag?.(spot);
  };

  if (initialized) {
    return (
      <View style={styles.sheet}>
        {/* 토스트를 하단 '배낭 여행지로 설정' CTA 위에 띄운다(버튼과 좌우 끝선·폭이
            동일해 검정끼리도 어긋나 보이지 않는다). 버튼 높이(약 84) + 여유만큼 올린다(CS-5). */}
        <Layout paddingHorizontal={0} toastBottom={96} edges={SHEET_EDGES}>
          <CampSiteDetailView
            campSiteDetail={campSiteDetail}
            onMoveToSpot={sheetParams ? handleMoveToSpot : undefined}
            onSetBag={sheetParams?.onSetBag ? handleSetBag : undefined}
          />
        </Layout>
      </View>
    );
  } else {
    // 박지 데이터를 불러오는 동안 빈 화면 대신 로딩 인디케이터를 표시한다(CS-3).
    return (
      <View style={styles.sheet}>
        <Layout paddingHorizontal={0} edges={SHEET_EDGES}>
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Color.textPrimary} />
          </View>
        </Layout>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(CampSiteDetailWrapper);
