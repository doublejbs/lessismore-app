import { FC, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Color } from '@/constants/DesignTokens';
import CampSiteDetail from '@/model/camp-site/CampSiteDetail';
import CampSiteDetailDispatcher from '@/model/camp-site/CampSiteDetailDispatcher';
import CampSiteDetailView from './CampSiteDetailView';

interface Props {
  // 표시할 박지 id. null이면 오버레이를 닫는다(DST-3).
  spotId: string | null;
  onClose: () => void;
}

// 박지 상세 오버레이(DST-3). 선택기가 풀스크린 네이티브 모달이라 /camp-site/{id}
// 라우트를 push하면 모달 뒤에 가려진다 — 라우트 대신 pageSheet 모달로 선택기 위에
// 겹쳐 띄우고, 닫으면 선택 상태를 유지한 선택기로 돌아온다. pageSheet은 평범한 RN
// 모달이라 상세의 [헤더·탭·CTA]가 일반 flex:1로 배치돼 formSheet 라우트용
// detent 처리(app/_layout.tsx의 contentStyle bottom:0)가 필요 없다.
const CampSiteDetailOverlayView: FC<Props> = observer(({ spotId, onClose }) => {
  const router = useRouter();
  // 모델은 1회 생성하고(후기 작성·공유 배낭 push용 Router가 필요), 열릴 때마다
  // 해당 박지로 재초기화한다.
  const [campSiteDetail] = useState(() =>
    CampSiteDetail.new(router, CampSiteDetailDispatcher.new())
  );

  // 로드 실패 Alert의 '확인'이 router.back으로 선택기의 부모를 pop하지 않도록,
  // 이 컨텍스트에서는 close 경로를 오버레이 닫기로 바꾼다(DST-3).
  useEffect(() => {
    campSiteDetail.setCloseHandler(onClose);
  }, [campSiteDetail, onClose]);

  useEffect(() => {
    if (spotId != null) {
      void campSiteDetail.initialize(spotId);
    }
  }, [spotId, campSiteDetail]);

  const initialized = campSiteDetail.isInitialized();

  return (
    <Modal
      visible={spotId != null}
      presentationStyle='pageSheet'
      animationType='slide'
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['bottom']}>
          {initialized ? (
            // 위치로 이동(onMoveToSpot)은 넘기지 않는다 — 이 컨텍스트엔 되돌릴 지도가 없다(DST-3).
            <CampSiteDetailView
              campSiteDetail={campSiteDetail}
              onClose={onClose}
            />
          ) : (
            // 박지 데이터를 불러오는 동안 빈 화면 대신 로딩 인디케이터를 표시한다(CS-3).
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Color.textPrimary} />
            </View>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CampSiteDetailOverlayView;
