import { FC, ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import GearThumbnailView, {
  GEAR_THUMBNAIL_SIZE,
} from '@/components/gear/GearThumbnailView';
import Gear from '@/model/gear/Gear';
import { Acg, AcgFontSize, AcgRow } from '@/constants/DesignTokens';
import AcgDisplayText from '@/components/acg/AcgDisplayText';

interface Props {
  gear: Gear;
  children?: ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  // 면·좌우 패딩을 끈다. 검색·탐색처럼 행 바깥에 담기 버튼이 함께 놓이는 목록은 바깥 래퍼가
  // 면을 그려야 버튼까지 한 덩어리로 읽힌다 — 그때 안쪽이 면을 또 그리면 면 안 면이 된다.
  plain?: boolean;
  // 위 행과 가르는 헤어라인. 목록 첫 행에는 그리지 않는다(섹션 제목 밑줄처럼 읽힌다).
  divided?: boolean;
}

// WH-1 창고 목록 행(레퍼런스 목록 문법으로 이식 2026-08-11 — [Home.md] HM-8).
// 사용자가 올린 본인 사진이 있을 때만 좌측에 정사각 썸네일을 두고, 없으면 빈 박스 없이
// 텍스트 우선 행을 쓴다(DataModel §1 2026-07-29 개정).
//
// 구성은 **이름(두 줄까지) + 메타 한 줄**이다. 좌 정체·우 지표 2열이었는데, 값을 우측 컬럼으로
// 빼면 이름이 두 줄인 행에서 숫자가 아래로 밀려 오히려 행끼리 비교가 어긋난다. 메타 맨 앞의
// 무게는 어느 행에서나 같은 자리다.
const GearView: FC<Props> = ({
  gear,
  children,
  onPress,
  plain = false,
  divided = false,
}) => {
  const weight = gear.getWeight();
  const meta = [
    gear.getDisplayCompany(),
    gear.getDisplayColor(),
    gear.hasUsedRate() ? `사용률 ${gear.getUsedRate()}%` : '',
  ].filter(Boolean);

  const content = (
    <View
      style={[
        styles.container,
        plain && styles.plainContainer,
        divided && styles.divided,
      ]}
    >
      <GearThumbnailView imageUrl={gear.getImageUrl()} />

      <View style={styles.rowText}>
        <PretendardText style={styles.name} weight='medium' numberOfLines={2}>
          {gear.getDisplayName()}
        </PretendardText>

        {/* 값을 한 줄에 `·`로 묶는다(레퍼런스). 무게가 없으면 그 조각을 붙이지 않고,
            조각이 하나도 없으면 줄 자체를 렌더하지 않는다 — 빈 줄은 죽은 공백이다.
            숫자만 중첩 Text로 콘덴스드다. */}
        {weight || meta.length > 0 ? (
          <PretendardText style={styles.meta} numberOfLines={1}>
            {weight ? (
              <AcgDisplayText style={styles.metaNumber}>
                {`${weight}g`}
              </AcgDisplayText>
            ) : null}
            {meta.map((part, index) =>
              index === 0 && !weight ? part : ` · ${part}`
            )}
          </PretendardText>
        ) : null}
      </View>

      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.touchable}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  /**
   * 면 없이 지면에 놓이고 행 사이 헤어라인으로만 갈린다(HM-8). `minHeight`는 썸네일 높이와
   * 토큰 값 중 큰 쪽이라, 이미지 있는 행과 없는 행이 섞여도 높이가 들쭉날쭉해지지 않는다.
   */
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AcgRow.paddingVertical,
    gap: 12,
    minHeight: Math.max(
      AcgRow.minHeight,
      GEAR_THUMBNAIL_SIZE + AcgRow.paddingVertical * 2
    ),
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  // 바깥 래퍼가 면을 그리는 목록(검색·탐색)용 — 헤어라인도 그쪽이 맡는다.
  plainContainer: {
    borderTopWidth: 0,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: AcgFontSize.rowTitle,
    lineHeight: 24,
    color: Acg.ink,
  },
  // 메타는 회색이 아니라 잉크다(레퍼런스) — 무게·브랜드·사용률은 장식이 아니라 정보다.
  meta: {
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 20,
    color: Acg.ink,
  },
  metaNumber: {
    fontSize: AcgFontSize.rowSubtitle,
    color: Acg.ink,
  },
});

export default GearView;
