import { FC } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgLayout,
  AcgType,
  Radius,
  Spacing,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';
import RouteDraw from '@/model/route-draw/RouteDraw';
import { formatRouteDistance } from '@/model/route/RouteFormat';

interface Props {
  routeDraw: RouteDraw;
  onCancel: () => void;
  // 바 높이를 화면에 알린다 — 출처 ⓘ·`내 위치`를 바 위로 올린다.
  onLayout: (event: LayoutChangeEvent) => void;
}

// 알약 버튼 높이·좌우 패딩(HIG 44pt 이상).
const PILL_MIN_HEIGHT = 44;
const PILL_PADDING_H = 18;
const ICON_BUTTON_SIZE = 44;
const ACTION_GAP = 8;

/**
 * 그리기 모드 하단 바 (RD-2) — 바텀 시트 자리. 순백 면 + 위 헤어라인 + 세이프에어리어.
 *
 * 왼쪽은 메타 한 줄 `{n}점 · {거리}`(숫자 조각만 콘덴스드 — HM-8 메타 줄), 오른쪽은 `되돌리기`(아이콘) · `취소`(흰 알약) ·
 * **`저장`**(라임 알약 — 이 모드의 주 액션 하나, 서로 다른 점 2개부터). 상승은 저장 때 계산하므로 적지 않는다.
 */
const RouteDrawBarView: FC<Props> = ({ routeDraw, onCancel, onLayout }) => {
  const l10n = app.getL10n();
  const insets = useSafeAreaInsets();
  const count = routeDraw.getPointCount();
  const distance = formatRouteDistance(routeDraw.getDistance());
  const canUndo = routeDraw.canUndo();
  const canSave = routeDraw.canSave();
  const saving = routeDraw.isSaving();

  return (
    <View
      style={[styles.bar, { paddingBottom: insets.bottom + Spacing.item }]}
      onLayout={onLayout}
    >
      <View
        style={styles.meta}
        accessible
        accessibilityRole='text'
        accessibilityLabel={l10n.t('routeDraw.metaLabel', { count, distance })}
      >
        {/* 숫자를 맨 앞에 두고 숫자 조각만 콘덴스드로 갈아 끼운다(HM-8). */}
        <PretendardText style={styles.metaText} numberOfLines={1}>
          <AcgDisplayText style={styles.metaNumber}>
            {String(count)}
          </AcgDisplayText>
          {l10n.t('routeDraw.pointUnit')}
          {l10n.t('common.metaSeparator')}
          <AcgDisplayText style={styles.metaNumber}>{distance}</AcgDisplayText>
        </PretendardText>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.iconButton, !canUndo && styles.disabled]}
          onPress={() => routeDraw.undo()}
          disabled={!canUndo}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('routeDraw.undo')}
          accessibilityHint={l10n.t('routeDraw.undoHint')}
          accessibilityState={{ disabled: !canUndo }}
        >
          <Ionicons name='arrow-undo-outline' size={22} color={Acg.ink} />
        </TouchableOpacity>
        {/* 취소는 되돌아가기다 — 면을 채우지 않고 주 액션과 무게를 가른다(조준 모드와 같다). */}
        <TouchableOpacity
          style={[styles.cancelButton, saving && styles.disabled]}
          onPress={onCancel}
          disabled={saving}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('common.cancel')}
          accessibilityState={{ disabled: saving }}
        >
          <PretendardText style={styles.controlLabel}>
            {l10n.t('common.cancel')}
          </PretendardText>
        </TouchableOpacity>
        {/* 이 모드의 주 액션 하나 — 시트·`포인트 추가`가 걷힌 동안 라임은 여기에만 쓴다(HM-8). */}
        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.disabled]}
          onPress={() => routeDraw.requestSave()}
          disabled={!canSave}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('routeDraw.save')}
          // 막혀 있으면 이유를 함께 읽는다 — 눌리지 않는 버튼만 두면 왜 안 되는지 모른다(HIG).
          {...(canSave
            ? {}
            : { accessibilityHint: l10n.t('routeDraw.saveHint') })}
          accessibilityState={{ disabled: !canSave, busy: saving }}
        >
          <PretendardText weight='semibold' style={styles.controlLabel}>
            {l10n.t(saving ? 'routeDraw.saving' : 'routeDraw.save')}
          </PretendardText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ACTION_GAP,
    paddingTop: Spacing.item,
    paddingHorizontal: AcgLayout.screenPadding,
    backgroundColor: Acg.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Acg.hairline,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  metaText: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  metaNumber: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ACTION_GAP,
  },
  iconButton: {
    width: ICON_BUTTON_SIZE,
    height: ICON_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    minHeight: PILL_MIN_HEIGHT,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PILL_PADDING_H,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: Acg.paper,
    borderWidth: 1,
    borderColor: Acg.hairline,
  },
  saveButton: {
    minHeight: PILL_MIN_HEIGHT,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PILL_PADDING_H,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: Acg.lime,
  },
  disabled: {
    opacity: 0.5,
  },
  controlLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(RouteDrawBarView);
