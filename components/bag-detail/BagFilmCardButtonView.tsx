import { FC } from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import { setBagFilmCardContext } from '@/model/bag-film-card/BagFilmCardHandoff';
import { Color } from '@/constants/DesignTokens';

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
      activeOpacity={0.7}
      hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
      accessibilityRole='button'
      accessibilityLabel='필름 카드 만들기'
    >
      <Ionicons name='film-outline' size={24} color={Color.textPrimary} />
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
