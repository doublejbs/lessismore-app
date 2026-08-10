import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandRankData } from '@/model/search/BrandRankStore';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  brand: BrandRankData;
  onPress: () => void;
  /**
   * 여러 개를 골라 두는 목록(피드 브랜드 필터 시트)이면 true. 우측 표식이 쉐브론(이동)
   * 대신 체크 원(선택)으로 바뀌고 스크린리더 롤도 `checkbox`가 된다 — 같은 알약 문법이라도
   * 다음 화면으로 가는 것과 값을 고르는 것은 다른 약속이다.
   */
  selectable?: boolean;
  selected?: boolean;
  showCount?: boolean;
}

// 체크 원 지름 — 패킹 행(PK-2)·배낭 편집과 같은 값이다.
const CHECK_SIZE = 26;

/**
 * 브랜드 행 (Liquid Depth, 2026-08-11 이식).
 *
 * 브랜드 디렉토리(SR-8)와 피드 브랜드 필터 시트(FD-3)가 공유한다. **행 하나가 곧 카드**이며
 * (탐색 목록 행·패킹과 같은 문법) 좌측은 정체(이름 + `제품 n`), 우측은 표식 하나다.
 * `showCount`가 false면 제품 수를 숨긴다(필터 시트). 보유 수(ownerCount)는 정렬 키로만 쓰고
 * 노출하지 않는다(SR-8).
 */
const BrandRowView: FC<Props> = ({
  brand,
  onPress,
  selectable = false,
  selected = false,
  showCount = true,
}) => {
  const name = brand.companyKorean || brand.company;
  const meta =
    showCount && typeof brand.gearCount === 'number'
      ? `제품 ${brand.gearCount}`
      : '';

  const renderTrailing = () => {
    if (!selectable) {
      // 다음 화면(브랜드 장비 목록)으로 간다는 어포던스.
      return (
        <Ionicons name='chevron-forward' size={20} color={Liquid.inkSubtle} />
      );
    }

    // 잉크 면 + 라임 글리프 — 앱 공통 체크 표식이다(패킹·배낭 편집과 같은 자리).
    if (selected) {
      return (
        <View style={styles.checkFill}>
          <Ionicons name='checkmark' size={16} color={Liquid.lime} />
        </View>
      );
    }

    return <View style={styles.checkOutline} />;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole={selectable ? 'checkbox' : 'button'}
      accessibilityLabel={name}
      {...(selectable ? { accessibilityState: { checked: selected } } : {})}
    >
      <View style={styles.identity}>
        <PretendardText style={styles.name} weight='semibold' numberOfLines={1}>
          {name}
        </PretendardText>
        {meta.length > 0 ? (
          <PretendardText style={styles.meta}>{meta}</PretendardText>
        ) : null}
      </View>
      {renderTrailing()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // 행 하나가 곧 카드다. 패딩(16) + 내용 높이라 HIG 44pt 터치 타깃을 자연히 넘긴다.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: LiquidLayout.cardPad,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
  },
  meta: {
    fontSize: LiquidType.caption.fontSize,
    lineHeight: LiquidType.caption.lineHeight,
    color: Liquid.inkMuted,
  },
  // 빈 체크 원 — 테두리는 잉크 스케일의 가장 옅은 값이다(핸드오프).
  checkOutline: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: CHECK_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Liquid.inkFaint,
  },
  checkFill: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: CHECK_SIZE / 2,
    backgroundColor: Liquid.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BrandRowView;
