import { FC, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
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

// 상세는 바텀 시트로 뜬다(CS-2) — 시트 상단엔 상태바가 없어 top 인셋을 빼야
// 헤더 위에 빈 띠가 생기지 않는다. 하단은 홈 인디케이터 회피가 필요해 남긴다.
const SHEET_EDGES = ['bottom'] as const;

// 시트 높이를 화면 비율로 직접 지정한다(CS-2/CS-3).
// react-native-screens는 formSheet에서 콘텐츠 래퍼에 bottom을 걸지 않아(시트 높이 변경 시
// 깜빡임 방지) React 레이아웃 높이가 무제한이 된다 — 그러면 flex:1이 뷰포트를 못 잡아
// ScrollView가 콘텐츠 높이만큼 늘어나고 스크롤이 아예 죽는다. 높이를 명시하면 경계가 생겨
// 스크롤·하단 고정 CTA·토스트가 모두 정상 동작한다. 그래서 detent는 fitToContents로 두고
// (= 시트가 이 높이에 맞춰짐) 높이는 여기서 정한다.
// 헤더·제목·탭 바·고정 CTA를 빼고도 탭 콘텐츠가 충분히 남으면서 뒤 지도도 남는 값(CS-3).
const SHEET_HEIGHT_RATIO = 0.75;

const CampSiteDetailWrapper: FC = () => {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
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

  const sheetStyle = { height: windowHeight * SHEET_HEIGHT_RATIO };

  if (initialized) {
    return (
      <View style={sheetStyle}>
        {/* 토스트를 하단 '배낭 여행지로 설정' CTA 위에 띄운다(버튼과 좌우 끝선·폭이
            동일해 검정끼리도 어긋나 보이지 않는다). 버튼 높이(약 84) + 여유만큼 올린다(CS-5). */}
        <Layout paddingHorizontal={0} toastBottom={96} edges={SHEET_EDGES}>
          <CampSiteDetailView
            campSiteDetail={campSiteDetail}
            onMoveToSpot={sheetParams ? handleMoveToSpot : undefined}
          />
        </Layout>
      </View>
    );
  } else {
    // 박지 데이터를 불러오는 동안 빈 화면 대신 로딩 인디케이터를 표시한다(CS-3).
    // 로딩에도 같은 높이를 줘야 로드 완료 시 시트 높이가 튀지 않는다.
    return (
      <View style={sheetStyle}>
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(CampSiteDetailWrapper);
