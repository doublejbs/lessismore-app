import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRow, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import Group from '@/model/group/Group';
import GroupPoint from '@/model/group/GroupPoint';
import GroupPointList from '@/model/group-point/GroupPointList';
import {
  getGroupPointAuthorLabel,
  getGroupPointDateText,
  getGroupPointTypeColor,
  getGroupPointTypeLabel,
} from '@/model/group-point/GroupPointLabels';

interface Props {
  pointList: GroupPointList;
  group: Group | null;
  userId: string;
  // 행 탭 — 지도에서 해당 포인트로 카메라를 옮긴다(GRP-9). 없으면 행이 눌리지 않는다.
  onSelect?: ((point: GroupPoint) => void) | undefined;
  // 수정·삭제는 작성자 또는 방장에게만 노출한다(GRP-4). 둘 다 없으면 ⋯ 자체를 그리지 않는다.
  onEdit?: ((point: GroupPoint) => void) | undefined;
  onDelete?: ((point: GroupPoint) => void) | undefined;
}

/**
 * 지도 포인트 목록 (GRP-9).
 *
 * 그룹 상세의 포인트 섹션과 웹의 지도 대체 화면이 같은 행 문법을 쓴다 — 이름 16 medium +
 * 메타 14 잉크 한 줄이고, 유형은 배지가 아니라 메타 줄의 조각이다(HM-8). 유형 색은 지도
 * 마커와 같은 값이라 행 앞 도트가 범례를 겸한다.
 */
const GroupPointListView: FC<Props> = ({
  pointList,
  group,
  userId,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const l10n = app.getL10n();
  const separator = l10n.t('group.detail.metaSeparator');
  const memberIds = group?.getMemberIds() ?? [];
  const points = pointList.getVisiblePoints();

  const renderRow = (point: GroupPoint, index: number) => {
    const canEdit = point.canEdit(userId, group);
    const hasMenu = canEdit && (!!onEdit || !!onDelete);
    const meta = [
      getGroupPointTypeLabel(point.getType()),
      getGroupPointAuthorLabel(
        point.getAuthorId(),
        point.getAuthorName(),
        memberIds
      ),
      getGroupPointDateText(point.getCreatedAt()),
    ].join(separator);
    const description = point.getDescription();
    const body = (
      <View style={styles.rowBody}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.dot,
              { backgroundColor: getGroupPointTypeColor(point.getType()) },
            ]}
          />
          <PretendardText
            weight='medium'
            style={styles.title}
            numberOfLines={2}
          >
            {point.getTitle()}
          </PretendardText>
        </View>
        <PretendardText style={styles.meta} numberOfLines={1}>
          {meta}
        </PretendardText>
        {description ? (
          <PretendardText style={styles.description} numberOfLines={2}>
            {description}
          </PretendardText>
        ) : null}
      </View>
    );

    return (
      <View
        key={point.getId()}
        style={[styles.row, index > 0 && styles.rowDivided]}
      >
        <View style={styles.rowInner}>
          {onSelect ? (
            <TouchableOpacity
              style={styles.rowTouchable}
              onPress={() => onSelect(point)}
              activeOpacity={0.7}
              accessibilityRole='button'
              accessibilityLabel={`${point.getTitle()}${separator}${meta}`}
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
        </View>
        {hasMenu ? (
          <View style={styles.actions}>
            {onEdit ? (
              <TouchableOpacity
                style={styles.action}
                onPress={() => onEdit(point)}
                disabled={pointList.isSubmitting()}
                accessibilityRole='button'
                accessibilityLabel={l10n.t('group.point.edit')}
              >
                <PretendardText style={styles.actionLabel}>
                  {l10n.t('group.point.edit')}
                </PretendardText>
              </TouchableOpacity>
            ) : null}
            {onDelete ? (
              <TouchableOpacity
                style={styles.action}
                onPress={() => onDelete(point)}
                disabled={pointList.isSubmitting()}
                accessibilityRole='button'
                accessibilityLabel={l10n.t('group.point.delete')}
              >
                <PretendardText style={styles.actionLabel}>
                  {l10n.t('group.point.delete')}
                </PretendardText>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return <View>{points.map(renderRow)}</View>;
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
  rowInner: {
    justifyContent: 'center',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // 지도 마커와 같은 유형 색 — 행 앞 도트가 범례를 겸한다.
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
    flex: 1,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  description: {
    ...AcgType.body,
    color: Acg.textMuted,
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

export default observer(GroupPointListView);
