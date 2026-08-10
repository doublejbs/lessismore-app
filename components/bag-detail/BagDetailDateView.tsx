import { FC } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Liquid, LiquidFont, LiquidMotion } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

/**
 * 여행 기간 행(BD-1). 탭하면 배낭 정보 수정 formSheet(`/bag-info-edit`)를 연다.
 *
 * 상황 라벨(`D-6` 등)은 타이틀 블록의 알약이 맡는다(BagDetailNameView) — 기간과 상황을
 * 한 줄에 이어 붙이면 둘 다 보조 정보로 눌려 읽힌다.
 */
const BagDetailDateView: FC<Props> = ({ bagDetail }) => {
  const handleDatePress = () => {
    bagDetail.openInfoEdit();
  };

  return (
    <TouchableOpacity
      style={styles.dateContainer}
      onPress={handleDatePress}
      activeOpacity={LiquidMotion.pressOpacity}
      // 시각 높이는 26이라 세로 여유로 44pt 터치 타깃을 채운다. 위쪽 이름 행과 히트 영역이
      // 겹쳐도 두 행이 같은 시트를 열어 결과가 갈리지 않는다.
      hitSlop={{ top: 9, bottom: 9, left: 0, right: 12 }}
      accessibilityRole='button'
      accessibilityLabel='여행 날짜 수정'
    >
      {/* 기간은 숫자·구분자뿐이라 콘덴스드가 안전하다(한글 글리프 없음). */}
      <PretendardText style={styles.dateText} numberOfLines={2}>
        {bagDetail.getDate()}
      </PretendardText>
      <Ionicons name='pencil' size={12} color={Liquid.inkSubtle} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  dateContainer: {
    alignSelf: 'flex-start',
    // 이름 행과 같은 이유로 폭을 부모로 제한한다(BagDetailNameView 주석 참고).
    maxWidth: '100%',
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
    paddingVertical: 4,
    gap: 6,
  },
  dateText: {
    fontFamily: LiquidFont.condensed,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.84, // .06em
    color: Liquid.inkMuted,
    flexShrink: 1,
  },
});

export default observer(BagDetailDateView);
