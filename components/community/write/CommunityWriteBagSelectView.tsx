import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CampSiteBagSelectSheetView from '@/components/camp-site/CampSiteBagSelectSheetView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType, Radius } from '@/constants/DesignTokens';
import type BagItem from '@/model/bag/BagItem';
import CommunityWrite from '@/model/community-write/CommunityWrite';
import app from '@/model/app/App';
import { formatCommunityWeight } from '@/model/community/CommunityFormat';

interface Props {
  write: CommunityWrite;
}

/**
 * 배낭 후기의 공개 스냅샷을 선택하는 View다(CM-4, CM-9, DM-28).
 * 스냅샷만 작성 모델에 저장하고 개인 장비 사진은 커뮤니티 이미지 경로와 분리한다.
 */
const CommunityWriteBagSelectView = ({ write }: Props) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const [sheetVisible, setSheetVisible] = useState(false);
  const bags = write.getBags();

  useEffect(() => {
    void write.loadBags().catch(() => {
      app.getToastManager()?.show({
        message: l10n.t('community.write.failed'),
      });
    });
  }, [l10n, write]);

  const handleSelect = async (bag: BagItem) => {
    setSheetVisible(false);

    try {
      await write.selectBag(bag);
    } catch {
      app.getToastManager()?.show({
        message: l10n.t('community.write.failed'),
      });
    }
  };

  const snapshot = write.getBagSnapshot();
  const selectedBag = write.getSelectedBag();
  const previewGears = snapshot?.gears.slice(0, 3) ?? [];
  const snapshotDate = [snapshot?.startDate, snapshot?.endDate]
    .filter((date): date is string => Boolean(date))
    .join(' – ');
  const selectedBagLabel = selectedBag
    ? l10n.t('community.write.bag.selected', {
        name: selectedBag.getName(),
        date: selectedBag.getDate(),
        weight: formatCommunityWeight(selectedBag.getWeightGram()),
      })
    : snapshot
      ? l10n.t('community.write.bag.selected', {
          name: snapshot.name,
          date: snapshotDate,
          weight: formatCommunityWeight(snapshot.totalWeight),
        })
      : l10n.t('community.write.bag.placeholder');

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selectRow}
        onPress={() => setSheetVisible(true)}
        disabled={write.getIsSubmitting()}
        accessibilityRole='button'
        accessibilityLabel={l10n.t('community.write.bag.select')}
      >
        <View style={styles.rowText}>
          <PretendardText style={styles.label} weight='semibold'>
            {l10n.t('community.write.bag.select')}
          </PretendardText>
          <PretendardText style={styles.value} numberOfLines={2}>
            {selectedBagLabel}
          </PretendardText>
        </View>
        <Ionicons name='chevron-forward' size={20} color={Acg.ink} />
      </TouchableOpacity>
      {write.isBagsLoaded() && bags.length === 0 && (
        <View style={styles.emptyBox}>
          <PretendardText style={styles.emptyText}>
            {l10n.t('community.write.bag.empty')}
          </PretendardText>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/bag')}
            disabled={write.getIsSubmitting()}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('community.write.bag.createBag')}
          >
            <PretendardText style={styles.createText} weight='semibold'>
              {l10n.t('community.write.bag.createBag')}
            </PretendardText>
          </TouchableOpacity>
        </View>
      )}
      {snapshot && (
        <View style={styles.preview}>
          <PretendardText style={styles.previewTitle} weight='semibold'>
            {l10n.t('community.write.bag.preview')}
          </PretendardText>
          <PretendardText style={styles.previewText}>
            {snapshot.name}
          </PretendardText>
          {snapshot.startDate && snapshot.endDate && (
            <PretendardText style={styles.previewText}>
              {l10n.t('community.write.bag.previewDate', {
                date: `${snapshot.startDate} – ${snapshot.endDate}`,
              })}
            </PretendardText>
          )}
          {snapshot.destinationName && (
            <PretendardText style={styles.previewText}>
              {l10n.t('community.write.bag.previewDestination', {
                name: snapshot.destinationName,
              })}
            </PretendardText>
          )}
          <PretendardText style={styles.previewText}>
            {l10n.t('community.write.bag.previewWeight', {
              weight: formatCommunityWeight(snapshot.totalWeight),
            })}
          </PretendardText>
          <PretendardText style={styles.previewText}>
            {l10n.t('community.write.bag.previewCount', {
              count: snapshot.itemCount,
            })}
          </PretendardText>
          {previewGears.map((gear) => (
            <PretendardText
              key={`${gear.company}-${gear.name}`}
              style={styles.previewGear}
              numberOfLines={1}
            >
              {l10n.t('community.write.bag.previewGear', {
                company: gear.company,
                name: gear.name,
                weight: gear.weight,
              })}
            </PretendardText>
          ))}
        </View>
      )}
      <CampSiteBagSelectSheetView
        visible={sheetVisible}
        bags={bags}
        spotName=''
        subtitleOverride={l10n.t('community.write.bag.sheetSubtitle')}
        hideCreateNew
        onClose={() => setSheetVisible(false)}
        onSelect={(bag) => void handleSelect(bag)}
        onCreateNew={() => router.push('/bag')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  selectRow: {
    minHeight: 64,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  label: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  value: {
    ...AcgType.control,
    color: Acg.ink,
  },
  emptyBox: {
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    padding: 16,
    gap: 8,
  },
  emptyText: {
    ...AcgType.body,
    color: Acg.ink,
  },
  createButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    backgroundColor: Acg.ink,
  },
  createText: {
    ...AcgType.control,
    color: Acg.paper,
  },
  preview: {
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    padding: 16,
    gap: 4,
  },
  previewTitle: {
    ...AcgType.control,
    color: Acg.ink,
    marginBottom: 4,
  },
  previewText: {
    ...AcgType.meta,
    color: Acg.ink,
  },
  previewGear: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
});

export default observer(CommunityWriteBagSelectView);
