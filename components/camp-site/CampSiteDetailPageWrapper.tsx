import { FC, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Edge } from 'react-native-safe-area-context';
import { AcgLayout, Color } from '@/constants/DesignTokens';
import CampSiteDetail from '@/model/camp-site/CampSiteDetail';
import CampSiteDetailDispatcher from '@/model/camp-site/CampSiteDetailDispatcher';
import CampSiteDetailPresentation from '@/model/camp-site/CampSiteDetailPresentation';
import CampSiteDetailView from './CampSiteDetailView';
import Layout from '../Layout';
import app from '@/model/app/App';

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 커스텀 back 행을 그린다.
const IS_IOS = Platform.OS === 'ios';
// iOS는 네이티브 투명 헤더가 상단을 덮고 스크롤 뷰가 자동 인셋을 받으므로
// top 세이프에어리어를 빼 이중 인셋을 막는다.
const PAGE_EDGES: readonly Edge[] = IS_IOS
  ? ['left', 'right', 'bottom']
  : ['top', 'left', 'right', 'bottom'];

// 박지 상세 **페이지**(DST-8, 2026-08-13 사용자 결정) — 배낭 상세 > 여행지의 `박지 상세 보기`
// 전용 진입이다. 지도 탭·여행지 선택기(DST-3)는 그대로 formSheet 라우트(`/camp-site/{id}`,
// CampSiteDetailWrapper)를 쓰고, 이 화면만 일반 푸시다. 허브 뒤에는 되돌릴 지도가 없어
// 시트로 덮을 이유가 없고, 뒤로가기·스와이프 back이 자연스럽다.
// 화면 본체는 시트와 **같은 CampSiteDetailView**이며 presentation만 갈린다(CS-3).
const CampSiteDetailPageWrapper: FC = () => {
  const router = useRouter();
  const [campSiteDetail] = useState(() =>
    CampSiteDetail.new(router, CampSiteDetailDispatcher.new())
  );
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const initialized = campSiteDetail.isInitialized();
  const l10n = app.getL10n();

  useEffect(() => {
    void campSiteDetail.initialize(id);
  }, [id, campSiteDetail]);

  // 페이지는 스택 위에 얹혀 있어 close()가 곧 router.back()이다(딥링크 콜드스타트 폴백 포함).
  const handlePressBack = () => {
    campSiteDetail.close();
  };

  return (
    <Layout paddingHorizontal={0} edges={PAGE_EDGES}>
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back·scroll edge effect는 시스템에 위임.
          박지명은 본문 상단의 큰 제목이 맡으므로 내비 타이틀은 비워 둔다(배낭 상세와 같은 처리). */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handlePressBack}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('common.back')}
          >
            <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
          </TouchableOpacity>
        </View>
      )}
      {initialized ? (
        // 위치로 이동(onMoveToSpot)·시트 핸드오프는 넘기지 않는다 — 되돌릴 지도가 없다(DST-8).
        // 이미 이 배낭의 여행지라 `배낭 여행지로 설정` CTA도 숨긴다.
        <CampSiteDetailView
          campSiteDetail={campSiteDetail}
          presentation={CampSiteDetailPresentation.Page}
          showSetBag={false}
        />
      ) : (
        // 박지 데이터를 불러오는 동안 빈 화면 대신 로딩 인디케이터를 표시한다(CS-3).
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Color.textPrimary} />
        </View>
      )}
    </Layout>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AcgLayout.screenPadding,
    minHeight: 52,
  },
  headerButton: {
    width: 44,
    minHeight: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(CampSiteDetailPageWrapper);
