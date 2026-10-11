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
  Radius,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';
import RouteEndpointInfo, {
  RouteEndpoint,
} from '@/model/route/RouteEndpointInfo';

interface Props {
  endpointInfo: RouteEndpointInfo;
  endpoint: RouteEndpoint;
  routeName: string;
  onClose: () => void;
}

/**
 * 코스 출발·도착 위치 정보 카드 (GRP-8). 포인트 설명 카드(GRP-9 `PointCalloutView`)와
 * 같은 자리·문법이다 — 지도 아래쪽에 떠 있는 흰 카드, 닫기는 우상단 ×.
 *
 * 동작 둘은 보조 알약이다(라임 없음 — 화면의 주 액션은 따로 있다, HM-8).
 */
const RouteEndpointCalloutView: FC<Props> = ({
  endpointInfo,
  endpoint,
  routeName,
  onClose,
}) => {
  const l10n = app.getL10n();
  const { kind, coordinate } = endpoint;
  const kindLabel = endpointInfo.getKindLabel(kind);
  const isAddressLoading = endpointInfo.isAddressLoading(coordinate);
  const address = endpointInfo.getAddress(coordinate);
  const meta = endpointInfo.getMetaText(coordinate, l10n.language);

  const handleOpenDirections = () => {
    void endpointInfo.openDirections(
      coordinate,
      l10n.t('route.endpoint.destinationName', {
        name: routeName,
        endpoint: kindLabel,
      })
    );
  };

  const handleCopyCoordinate = () => {
    void endpointInfo.copyCoordinate(coordinate);
  };

  const getAddressLine = () => {
    if (isAddressLoading) {
      return l10n.t('route.endpoint.addressLoading');
    }

    return address;
  };

  const addressLine = getAddressLine();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <PretendardText weight='medium' style={styles.title} numberOfLines={1}>
          {kindLabel}
          <PretendardText style={styles.routeName}>
            {` ${routeName}`}
          </PretendardText>
        </PretendardText>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('route.endpoint.close')}
        >
          <Ionicons name='close' size={20} color={Acg.ink} />
        </TouchableOpacity>
      </View>
      {addressLine ? (
        <PretendardText
          style={isAddressLoading ? styles.addressLoading : styles.address}
          numberOfLines={2}
        >
          {addressLine}
        </PretendardText>
      ) : null}
      <PretendardText style={styles.meta} numberOfLines={1}>
        {meta}
      </PretendardText>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.action}
          onPress={handleOpenDirections}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('route.endpoint.directions')}
        >
          <Ionicons name='walk' size={18} color={Acg.ink} />
          <PretendardText weight='semibold' style={styles.actionLabel}>
            {l10n.t('route.endpoint.directions')}
          </PretendardText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.action}
          onPress={handleCopyCoordinate}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('route.endpoint.copyCoordinate')}
        >
          <Ionicons name='copy-outline' size={18} color={Acg.ink} />
          <PretendardText weight='semibold' style={styles.actionLabel}>
            {l10n.t('route.endpoint.copyCoordinate')}
          </PretendardText>
        </TouchableOpacity>
      </View>
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
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
    flex: 1,
  },
  routeName: {
    color: Acg.textMuted,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: -8,
    marginVertical: -12,
  },
  address: {
    ...AcgType.body,
    color: Acg.ink,
  },
  addressLoading: {
    ...AcgType.body,
    color: Acg.textMuted,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: AcgLayout.chipGap,
    marginTop: 8,
  },
  // 카드(흰 면) 안의 보조 알약 — 연회색 채움, 그림자 없음(HM-8 면 문법).
  action: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: Acg.controlFill,
  },
  actionLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(RouteEndpointCalloutView);
