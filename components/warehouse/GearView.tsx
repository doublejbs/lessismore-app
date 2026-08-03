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
import { Acg, AcgShadow } from '@/constants/DesignTokens';
import AcgDisplayText from '@/components/acg/AcgDisplayText';

interface Props {
  gear: Gear;
  children?: ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  // 종이 면을 끈다. 검색·탐색처럼 행 바깥에 담기 버튼이 함께 놓이는 목록은 바깥 래퍼가
  // 면을 그려야 버튼까지 한 카드로 읽힌다 — 그때 안쪽이 면을 또 그리면 카드 안 카드가 된다.
  plain?: boolean;
}

// 행 상하 여백. minHeight가 border-box 기준이라 썸네일 높이를 보장하려면 이 값을 더해야 한다.
const ROW_VERTICAL_PADDING = 14;

// WH-1 창고 목록 행. 사용자가 올린 본인 사진이 있을 때만 좌측에 정사각 썸네일을 두고,
// 없으면 빈 박스 없이 텍스트 우선 행 레이아웃을 그대로 쓴다(DataModel §1 2026-07-29 개정).
// 행은 **좌 정체(브랜드·이름·색상) · 우 지표** 2열로 나눈다. 지표 컬럼은 사용률 배지가 위, 무게가 아래
// (보조 지표가 위·앵커가 아래인 메트릭 문법) — 무게가 행마다 같은 자리에 오므로 세로 스캔으로 비교할 수
// 있다. 정체 텍스트는 말줄임해 지표 컬럼을 침범하지 않는다.
const GearView: FC<Props> = ({ gear, children, onPress, plain = false }) => {
  const weight = gear.getWeight();
  const hasUsedRate = gear.hasUsedRate();
  const hasMetrics = !!weight || hasUsedRate;

  const content = (
    <View style={[styles.container, plain && styles.plainContainer]}>
      <GearThumbnailView imageUrl={gear.getImageUrl()} />

      <View style={styles.identityColumn}>
        {/* 값이 없으면 줄 자체를 렌더하지 않는다(WH-1) — 빈 텍스트를 두면 행에 죽은
            공백이 생겨 이름이 아래로 밀려 보인다. 색상 줄과 같은 규칙. */}
        {gear.getDisplayCompany() ? (
          <PretendardText
            style={styles.companyText}
            weight='bold'
            numberOfLines={1}
          >
            {gear.getDisplayCompany()}
          </PretendardText>
        ) : null}

        <PretendardText style={styles.nameText} weight='bold' numberOfLines={2}>
          {gear.getDisplayName()}
        </PretendardText>

        {gear.getDisplayColor() ? (
          <PretendardText
            style={styles.colorText}
            weight='regular'
            numberOfLines={1}
          >
            {gear.getDisplayColor()}
          </PretendardText>
        ) : null}
      </View>

      {hasMetrics ? (
        <View style={styles.metricsColumn}>
          {hasUsedRate && (
            <View style={styles.usedRateBadge}>
              <PretendardText style={styles.usedRateText} weight='regular'>
                사용률 {gear.getUsedRate()}%
              </PretendardText>
            </View>
          )}

          {/* 숫자라 콘덴스드를 쓴다 — 행의 시각 앵커(ACG). */}
          {weight ? (
            <AcgDisplayText style={styles.weightText}>
              {`${weight}g`}
            </AcgDisplayText>
          ) : null}
        </View>
      ) : null}

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
  // WH-1: minHeight를 썸네일 높이에 맞춰 **모든 행에** 걸어, 같은 목록에 이미지 있는 행과 없는 행이
  // 섞여도 행 높이가 들쭉날쭉해지지 않게 한다. 정체 컬럼의 최소 높이(19+6+19)와 같은 값이라
  // 이미지 없는 행의 겉모습은 그대로다. gap 12는 썸네일이 없으면 아예 적용되지 않으므로
  // (렌더 자체를 건너뛴다) 좌측에 빈 여백도 남지 않는다.
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ROW_VERTICAL_PADDING,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: GEAR_THUMBNAIL_SIZE + ROW_VERTICAL_PADDING * 2,
    // ACG: 구분선 대신 지면 위 각진 종이 면. 홈·배낭 목록과 같은 행 문법이라
    // 줄 수가 다른 행(1~3줄)이 섞여도 면 경계가 구분을 맡는다.
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.paper,
  },
  plainContainer: {
    backgroundColor: 'transparent',
    boxShadow: 'none',
    paddingHorizontal: 0,
  },
  // 좌 정체 컬럼 — 브랜드·이름·색상. flex:1이라 썸네일이 붙으면 정체 컬럼만 좁아지고
  // 우측 지표 컬럼은 오른쪽 끝에 그대로 붙어 있다(= 무게의 세로 정렬 유지).
  identityColumn: {
    flex: 1,
    gap: 6,
    overflow: 'hidden',
  },
  // 우 지표 컬럼 — 사용률 배지(위) + 무게(아래). 우측 정렬로 행마다 무게가 같은 자리에 온다.
  metricsColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  // WH-1: 브랜드는 제품 식별의 첫 축이라 이름(nameText)과 동일한 타이포로 표시한다.
  companyText: {
    fontSize: 15,
    lineHeight: 19,
    color: Acg.ink,
  },
  usedRateBadge: {
    borderRadius: 0,
    backgroundColor: Acg.bg,
    paddingVertical: 2,
    paddingHorizontal: 5,
  },
  usedRateText: {
    color: Acg.textSecondary,
    fontSize: 11,
  },
  nameText: {
    fontSize: 15,
    lineHeight: 19,
    color: Acg.ink,
  },
  colorText: {
    fontSize: 13,
    color: Acg.textSecondary,
  },
  weightText: {
    fontSize: 16,
    lineHeight: 20,
    color: Acg.ink,
    textAlign: 'right',
  },
});

export default GearView;
