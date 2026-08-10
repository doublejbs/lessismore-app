import { FC } from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import { setBagFilmCardContext } from '@/model/bag-film-card/BagFilmCardHandoff';
import { Liquid, LiquidMotion } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

// 웹은 캡처·네이티브 공유 시트가 없어 진입점을 노출하지 않는다(BS-1).
const IS_WEB = Platform.OS === 'web';

// 헤더 필름 카드 아이콘(BS-1) — 이 기능의 유일한 진입점이다.
// 탭하면 대상 배낭을 핸드오프에 넣고 `/bag-film-card`를 연다.
const BagFilmCardButtonView: FC<Props> = ({ bagDetail }) => {
  const router = useRouter();

  const handlePressFilmCard = () => {
    app.getAnalyticsManager()?.logClick('film_card_open');
    setBagFilmCardContext(bagDetail);
    router.push('/bag-film-card');
  };

  if (IS_WEB) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.filmCardButton}
      onPress={handlePressFilmCard}
      activeOpacity={LiquidMotion.pressOpacity}
      // 시각 크기는 아이콘 20pt(목업 §6 유리 캡슐)이고 칸은 헤더가 잡는다.
      // 세로는 여유로 44pt를 채우고(20 + 12 × 2), 가로는 7까지만 넓힌다 —
      // 칸 34 안 아이콘 좌우 여백이 7이고 칸 사이 gap이 2라, 그 이상 주면 이웃 아이콘의
      // 히트 영역과 겹쳐 잘못된 화면이 열린다.
      hitSlop={{ top: 12, bottom: 12, left: 7, right: 7 }}
      accessibilityRole='button'
      accessibilityLabel='필름 카드 만들기'
    >
      <Ionicons name='film-outline' size={20} color={Liquid.ink} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  filmCardButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(BagFilmCardButtonView);
