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
import MapPoint from '@/model/point/MapPoint';
import { getPointTypeColor } from '@/model/point/PointLabels';

interface Props {
  point: MapPoint;
  /**
   * 메타 한 줄 — 화면이 조립한다. 그룹 지도는 `유형 · 작성자 · 등록일`(GRP-9), 배낭 코스 화면은
   * `유형 · 등록일`(작성자 없음)에 연결 그룹 포인트면 출처를 더한다(BD-14).
   */
  meta: string;
  // 수정·삭제 권한이 있을 때만 액션을 그린다(그룹: 작성자 또는 방장 GRP-4, 배낭: 내 포인트 BD-14).
  canEdit: boolean;
  // 선택된 코스 위 위치 — `코스 12.3km 지점 · 고도 1,234m`. 코스에서 500m 밖이면 `null`이다(GRP-8).
  routeMeta: string | null;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * 선택한 포인트의 정보 카드 (GRP-9 · BD-14). 그룹 지도와 배낭 코스 화면이 함께 쓴다.
 * 지도 마커를 탭하면 뜨고, 메타 줄(유형·작성자·등록 시각 등)과 (권한이 있으면) 수정·삭제를 담는다.
 */
const PointCalloutView: FC<Props> = ({
  point,
  meta,
  canEdit,
  routeMeta,
  disabled,
  onEdit,
  onDelete,
  onClose,
}) => {
  const l10n = app.getL10n();
  const description = point.getDescription();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View
          style={[
            styles.dot,
            { backgroundColor: getPointTypeColor(point.getType()) },
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
      {routeMeta ? (
        <PretendardText style={styles.meta} numberOfLines={1}>
          {routeMeta}
        </PretendardText>
      ) : null}
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

export default observer(PointCalloutView);
