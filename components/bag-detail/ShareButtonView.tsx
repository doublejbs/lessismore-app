import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import { setBagShareContext } from '@/model/bag-detail/BagShareHandoff';
import { Liquid, LiquidMotion } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

// 헤더 공유 아이콘(BD-1). 탭하면 배낭 공유 formSheet(/bag-share)를 연다.
const ShareButtonView: FC<Props> = ({ bagDetail }) => {
  const router = useRouter();

  const handleShareButtonPress = () => {
    app.getAnalyticsManager()?.logClick('bag_share');
    setBagShareContext(bagDetail);
    router.push('/bag-share');
  };

  return (
    <TouchableOpacity
      style={styles.shareButton}
      onPress={handleShareButtonPress}
      activeOpacity={LiquidMotion.pressOpacity}
      // 시각 크기는 아이콘 20pt(목업 §6 유리 캡슐)이고 칸은 헤더가 잡는다.
      // 세로는 여유로 44pt를 채우고(20 + 12 × 2), 가로는 7까지만 넓힌다 —
      // 칸 34 안 아이콘 좌우 여백이 7이고 칸 사이 gap이 2라, 그 이상 주면 이웃 아이콘의
      // 히트 영역과 겹쳐 잘못된 화면이 열린다.
      hitSlop={{ top: 12, bottom: 12, left: 7, right: 7 }}
      accessibilityRole='button'
      accessibilityLabel='공유'
    >
      <Ionicons name='share-outline' size={20} color={Liquid.ink} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  shareButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(ShareButtonView);
