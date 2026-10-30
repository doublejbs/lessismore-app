import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import { Acg, AcgRow, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import AiGearFill from '@/model/ai-gear-fill/AiGearFill';
import AiGearFillItem from '@/model/ai-gear-fill/AiGearFillItem';

interface Props {
  aiGearFill: AiGearFill;
  item: AiGearFillItem;
  divided: boolean;
}

const BADGE_SIZE = 28;

/**
 * 추천 장비 행(AS-14) — 창고 행 문법(WH-1 `GearView`: 이름 + `무게 · 브랜드`)에 출처(`창고`/`카탈로그`)를
 * 메타 마지막 조각(회색)으로 붙이고, 둘째 줄 이유(1줄 말줄임) + 우측 원형 체크 배지(BD-4·OB-6과 같은 모양).
 * 행 안에 배지·칩을 두지 않는다(HM-8).
 * 추천 장비는 아직 `Gear`가 아니라(카탈로그 장비는 담을 때 등록한다) `GearView`를 그대로 쓰지 않고
 * 같은 값으로 그린다. 행 전체가 토글이다.
 */
const AiGearFillRowView: FC<Props> = ({ aiGearFill, item, divided }) => {
  const l10n = app.getL10n();
  const checked = aiGearFill.isSelected(item);
  const weightG = item.getWeightG();
  const weightLabel = weightG > 0 ? `${weightG}g` : '';
  const brand = item.getBrand();
  const reason = item.getReason();
  const separator = l10n.t('common.metaSeparator');
  const sourceLabel = item.isCatalog()
    ? l10n.t('aiGearFill.sourceCatalog')
    : l10n.t('aiGearFill.sourceWarehouse');
  const accessibilityLabel = weightLabel
    ? l10n.t('aiGearFill.rowAccessibility', {
        name: item.getName(),
        weight: weightLabel,
        reason,
      })
    : l10n.t('aiGearFill.rowAccessibilityNoWeight', {
        name: item.getName(),
        reason,
      });

  const handlePress = () => {
    aiGearFill.toggle(item);
  };

  return (
    <TouchableOpacity
      style={[styles.container, divided && styles.divided]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole='checkbox'
      accessibilityState={{ checked }}
      accessibilityLabel={`${accessibilityLabel}, ${sourceLabel}`}
    >
      <View style={styles.text}>
        <PretendardText style={styles.name} weight='medium' numberOfLines={2}>
          {item.getName()}
        </PretendardText>
        <PretendardText style={styles.meta} numberOfLines={1}>
          {weightLabel ? (
            <AcgDisplayText style={styles.meta}>{weightLabel}</AcgDisplayText>
          ) : null}
          {weightLabel && brand ? separator : null}
          {brand}
          {weightLabel || brand ? separator : null}
          <PretendardText style={styles.source}>{sourceLabel}</PretendardText>
        </PretendardText>
        {reason ? (
          <PretendardText style={styles.reason} numberOfLines={1}>
            {reason}
          </PretendardText>
        ) : null}
      </View>
      <View style={[styles.badge, checked && styles.badgeChecked]}>
        {checked ? (
          <Ionicons name='checkmark' size={16} color={Acg.paper} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // 면 없이 지면에 놓이고 행 사이 헤어라인으로만 갈린다(HM-8, 창고 행과 같은 값).
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: AcgRow.paddingVertical,
    minHeight: AcgRow.minHeight,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  source: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
  reason: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  // OB-6·BD-4 체크 배지와 같은 값.
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Acg.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeChecked: {
    backgroundColor: Acg.ink,
    borderColor: Acg.ink,
  },
});

export default observer(AiGearFillRowView);
