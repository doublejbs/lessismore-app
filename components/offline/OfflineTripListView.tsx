import { FC } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRow, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { formatOfflineBytes } from '@/model/offline/OfflineFormat';
import OfflineManifest, {
  OfflineManifestEntry,
} from '@/model/offline/OfflineManifest';
import OfflineTripStore from '@/model/offline/OfflineTripStore';
import OfflineBannerView from './OfflineBannerView';

interface Props {
  offlineTripStore: OfflineTripStore;
  bottomInset: number;
}

const formatPeriod = (entry: OfflineManifestEntry): string => {
  const l10n = app.getL10n();
  const format = l10n.t('bag.dateShortFormat');
  const start = dayjs(entry.startDate);
  const end = dayjs(entry.endDate);

  if (!start.isValid()) {
    return '';
  }

  if (!end.isValid() || start.isSame(end, 'day')) {
    return start.format(format);
  }

  return `${start.format(format)}${l10n.t('bag.dateRangeSeparator')}${end.format(format)}`;
};

/**
 * 여행 탭 오프라인 목록 (OF-4 · OF-7). 매니페스트의 저장된 여행만 그린다 — 스냅샷 파일을 열지 않는다.
 * 행 = 이름 + 메타 한 줄(`10.10~10.12 · 저장됨 · 1.8MB`, HM-8 — 배지 없음). 구독이 끝났으면 배너가
 * 구독 유도로 바뀌고 목록을 비운다(저장본은 지우지 않는다).
 */
const OfflineTripListView: FC<Props> = ({ offlineTripStore, bottomInset }) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const locked = !offlineTripStore.isEntitled();
  const entries = locked ? [] : offlineTripStore.getEntries();
  const separator = l10n.t('common.metaSeparator');

  const handlePressEntry = (entry: OfflineManifestEntry) => {
    // 옛 스키마 저장본은 그릴 수 없다 — 온라인에서 열면 갱신된다(OF-1).
    if (OfflineManifest.needsUpgrade(entry)) {
      app.getToastManager()?.showSimple(l10n.t('offline.tile.needsUpgrade'));

      return;
    }

    router.push(`/bag/${entry.bagId}`);
  };

  return (
    <View style={styles.container}>
      <OfflineBannerView locked={locked} />
      {!locked && entries.length === 0 ? (
        <View style={styles.empty}>
          <PretendardText style={styles.emptyText}>
            {l10n.t('offline.list.empty')}
          </PretendardText>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: bottomInset }}
          showsVerticalScrollIndicator={false}
        >
          {entries.map((entry, index) => {
            const status = OfflineManifest.needsUpgrade(entry)
              ? l10n.t('offline.tile.needsUpgrade')
              : l10n.t('offline.list.meta', {
                  size: formatOfflineBytes(entry.bytes),
                });
            const meta = [formatPeriod(entry), status]
              .filter(part => part.length > 0)
              .join(separator);

            return (
              <TouchableOpacity
                key={entry.bagId}
                style={[styles.row, index > 0 && styles.divided]}
                onPress={() => handlePressEntry(entry)}
                activeOpacity={0.7}
                accessibilityRole='button'
                accessibilityLabel={`${entry.name}, ${meta}`}
              >
                <View style={styles.rowText}>
                  <PretendardText
                    style={styles.rowTitle}
                    weight='medium'
                    numberOfLines={2}
                  >
                    {entry.name}
                  </PretendardText>
                  <PretendardText style={styles.rowMeta} numberOfLines={1}>
                    {meta}
                  </PretendardText>
                </View>
                <Ionicons
                  name='chevron-forward'
                  size={18}
                  color={Acg.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: AcgLayout.section,
  },
  list: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyText: {
    ...AcgType.body,
    color: Acg.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
  },
  // 첫 행에는 헤어라인을 두지 않는다(제목 밑줄로 읽힌다 — HM-8).
  divided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Acg.hairline,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  rowMeta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
});

export default observer(OfflineTripListView);
