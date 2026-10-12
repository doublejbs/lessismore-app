import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg } from '@/constants/DesignTokens';

// 메타 10pt(MAP-3 — HIG 11pt 권장과 어긋나는 점은 Map.md §8에서 디자인 리뷰로 결정한다).
const NOTE_FONT_SIZE = 10;
const NOTE_LINE_HEIGHT = 13;
const NOTE_PADDING_H = 4;
const NOTE_PADDING_V = 1;
// 흰 반투명 바탕 — 지도 위 가독성(캡션 바탕과 같은 면).
const NOTE_BACKGROUND = Acg.heroCardFill;

/**
 * 정적 지도 썸네일의 출처 표기 (MAP-3) — `© OpenStreetMap`. 기기에서 렌더한 PNG에는 attribution이 박히지
 * 않으므로 밴드 우하단에 얹는다(ODbL: 지도가 보이는 곳에 출처가 보여야 한다). 부모가 `position: relative`
 * 상자이면 그 우하단에 붙는다. 상표·고유명이라 번역하지 않는다.
 */
const MapAttributionNoteView: FC = () => {
  return (
    <View style={styles.container} pointerEvents='none'>
      <PretendardText style={styles.text} numberOfLines={1}>
        © OpenStreetMap
      </PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    paddingHorizontal: NOTE_PADDING_H,
    paddingVertical: NOTE_PADDING_V,
    backgroundColor: NOTE_BACKGROUND,
  },
  text: {
    fontSize: NOTE_FONT_SIZE,
    lineHeight: NOTE_LINE_HEIGHT,
    color: Acg.textMuted,
  },
});

export default MapAttributionNoteView;
