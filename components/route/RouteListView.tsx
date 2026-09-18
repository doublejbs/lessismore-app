import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRow, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

export interface RouteRowAction {
  // 버튼 라벨이자 접근성 라벨이다. 행마다 다른 문구를 주면 VoiceOver가 대상을 구분하지 못한다.
  label: string;
  onPress: () => void;
}

export interface RouteRow {
  id: string;
  title: string;
  // 메타 한 줄. 값을 ` · `로 이어 붙이고 **숫자를 맨 앞**에 둔다(HM-8).
  meta: string;
  // 행 탭. 없으면 행이 눌리지 않는다(읽기 전용 목록).
  onSelect?: (() => void) | undefined;
  actions?: readonly RouteRowAction[] | undefined;
}

interface Props {
  rows: readonly RouteRow[];
  disabled?: boolean | undefined;
}

/**
 * 코스 목록 행 (GRP-8, BD-11). 그룹 코스 목록과 배낭 코스 목록이 **같은 행**을 쓴다.
 *
 * 행 문법은 HM-8 그대로다 — 이름 16 medium + 메타 14 잉크 한 줄이고, 거리·고도 상승·출처는
 * 배지가 아니라 메타 줄의 조각이다. 면 없이 헤어라인으로만 가르는 목록에서 배지는 유일한
 * 예외 면이 되고, 값 하나 때문에 행마다 작은 사각형이 생긴다.
 *
 * 이 컴포넌트는 모델을 모른다 — 그룹 코스와 배낭 코스, 그리고 배낭 화면에 섞여 들어오는
 * 연결 그룹의 읽기 전용 코스(BD-11)를 한 목록에 담을 수 있어야 하기 때문이다.
 */
const RouteListView: FC<Props> = ({ rows, disabled }) => {
  const separator = app.getL10n().t('common.metaSeparator');

  const renderRow = (row: RouteRow, index: number) => {
    const body = (
      <View style={styles.rowBody}>
        <PretendardText weight='medium' style={styles.title} numberOfLines={2}>
          {row.title}
        </PretendardText>
        <PretendardText style={styles.meta} numberOfLines={1}>
          {row.meta}
        </PretendardText>
      </View>
    );

    return (
      <View key={row.id} style={[styles.row, index > 0 && styles.rowDivided]}>
        {row.onSelect ? (
          <TouchableOpacity
            style={styles.rowTouchable}
            onPress={row.onSelect}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={`${row.title}${separator}${row.meta}`}
          >
            {body}
            <Ionicons
              name='chevron-forward'
              size={16}
              color={Acg.textSecondary}
            />
          </TouchableOpacity>
        ) : (
          body
        )}
        {row.actions && row.actions.length > 0 ? (
          <View style={styles.actions}>
            {row.actions.map(action => (
              <TouchableOpacity
                key={action.label}
                style={styles.action}
                onPress={action.onPress}
                disabled={disabled}
                accessibilityRole='button'
                accessibilityLabel={`${row.title}${separator}${action.label}`}
                accessibilityState={{ disabled: !!disabled }}
              >
                <PretendardText style={styles.actionLabel}>
                  {action.label}
                </PretendardText>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return <View>{rows.map(renderRow)}</View>;
};

const styles = StyleSheet.create({
  row: {
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    justifyContent: 'center',
    gap: 2,
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  rowTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  actions: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  action: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  actionLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default RouteListView;
