import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgLayout,
  AcgRadius,
  AcgShadow,
  AcgType,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupPoint from '@/model/group/GroupPoint';
import {
  getGroupPointAuthorLabel,
  getGroupPointDateText,
  getGroupPointTypeColor,
  getGroupPointTypeLabel,
} from '@/model/group-point/GroupPointLabels';

interface Props {
  point: GroupPoint;
  memberIds: readonly string[];
  // 수정·삭제 권한(작성자 또는 방장)이 있을 때만 액션을 그린다(GRP-4).
  canEdit: boolean;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * 선택한 포인트의 정보 카드 (GRP-9).
 * 지도 마커를 탭하면 뜨고, 작성자 닉네임·등록 시각과 (권한이 있으면) 수정·삭제를 담는다.
 */
const GroupPointCalloutView: FC<Props> = ({
  point,
  memberIds,
  canEdit,
  disabled,
  onEdit,
  onDelete,
  onClose,
}) => {
  const l10n = app.getL10n();
  const separator = l10n.t('group.detail.metaSeparator');
  const description = point.getDescription();
  const meta = [
    getGroupPointTypeLabel(point.getType()),
    getGroupPointAuthorLabel(
      point.getAuthorId(),
      point.getAuthorName(),
      memberIds
    ),
    getGroupPointDateText(point.getCreatedAt()),
  ].join(separator);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View
          style={[
            styles.dot,
            { backgroundColor: getGroupPointTypeColor(point.getType()) },
          ]}
        />
        <PretendardText weight='medium' style={styles.title} numberOfLines={2}>
          {point.getTitle()}
        </PretendardText>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('group.point.close')}
        >
          <Ionicons name='close' size={20} color={Acg.ink} />
        </TouchableOpacity>
      </View>
      <PretendardText style={styles.meta} numberOfLines={1}>
        {meta}
      </PretendardText>
      {description ? (
        <PretendardText style={styles.description} numberOfLines={3}>
          {description}
        </PretendardText>
      ) : null}
      {canEdit ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.action}
            onPress={onEdit}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('group.point.edit')}
          >
            <PretendardText style={styles.actionLabel}>
              {l10n.t('group.point.edit')}
            </PretendardText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.action}
            onPress={onDelete}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('group.point.delete')}
          >
            <PretendardText style={styles.actionLabel}>
              {l10n.t('group.point.delete')}
            </PretendardText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // 지도 위에 떠 있는 카드라 그림자를 둔다(HM-8 — 그림자는 지도 위 요소와 플로팅 알약에만).
  card: {
    backgroundColor: Acg.paper,
    borderRadius: AcgRadius.thumb,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
    boxShadow: AcgShadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: -8,
    marginVertical: -12,
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

export default observer(GroupPointCalloutView);
