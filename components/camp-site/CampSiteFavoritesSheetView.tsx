import { FC } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Color } from '@/constants/DesignTokens';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import CampSiteFavoritesListView from './CampSiteFavoritesListView';

interface Props {
  visible: boolean;
  // 즐겨찾기한 박지 목록(campSiteMap.getFavoriteSpots()). 로드된 활성 박지와 즐겨찾기 id 조인 결과.
  spots: CampSpot[];
  onClose: () => void;
  // 항목 탭 — 선택기는 이 박지 선택으로 이어진다(CS-9).
  onSelect: (spot: CampSpot) => void;
}

// 즐겨찾기 리스트 시트(CS-9)의 선택기(DST-3)용 pageSheet 래퍼. 선택기는 풀스크린 네이티브 모달이라
// 지도 탭처럼 formSheet 라우트를 겹칠 수 없어(라우트 시트가 뒤로 렌더됨) 기존 Modal 얼개를 유지한다.
// 리스트 UI는 지도 탭 formSheet 라우트와 공유하는 CampSiteFavoritesListView에 위임한다.
const CampSiteFavoritesSheetView: FC<Props> = ({
  visible,
  spots,
  onClose,
  onSelect,
}) => {
  return (
    <Modal
      visible={visible}
      presentationStyle='pageSheet'
      animationType='slide'
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <CampSiteFavoritesListView
            spots={spots}
            onSelect={onSelect}
            onClose={onClose}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
});

export default CampSiteFavoritesSheetView;
