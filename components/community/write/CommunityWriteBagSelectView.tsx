import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import CampSiteBagSelectSheetView from '@/components/camp-site/CampSiteBagSelectSheetView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import type BagItem from '@/model/bag/BagItem';
import CommunityWrite from '@/model/community-write/CommunityWrite';
import app from '@/model/app/App';
import { formatCommunityWeight } from '@/model/community/CommunityFormat';

interface Props {
  write: CommunityWrite;
  sheetVisible?: boolean;
  onSheetVisibleChange?: (visible: boolean) => void;
  onRemove?: () => void;
}

/**
 * 패킹 첨부의 공개 스냅샷을 선택하는 View다(CM-4, CM-9, DM-28).
 * 스냅샷만 작성 모델에 저장하고 개인 장비 사진은 커뮤니티 이미지 경로와 분리한다.
 */
const CommunityWriteBagSelectView = ({
  write,
  sheetVisible: controlledSheetVisible,
  onSheetVisibleChange,
  onRemove,
}: Props) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const [internalSheetVisible, setInternalSheetVisible] = useState(false);
  const isControlled = controlledSheetVisible !== undefined;
  const sheetVisible = isControlled
    ? controlledSheetVisible
    : internalSheetVisible;
  const bags = write.getBags();

  const setSheetVisible = (visible: boolean) => {
    if (!isControlled) {
      setInternalSheetVisible(visible);
    }

    onSheetVisibleChange?.(visible);
  };

  useEffect(() => {
    if (!sheetVisible) {
      return;
    }

    void write.loadBags().catch(() => {
      app.getToastManager()?.show({
        message: l10n.t('community.write.failed'),
      });
    });
  }, [l10n, sheetVisible, write]);

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
      : '';

  const summary = (
    <>
      {snapshot && (
        <View style={styles.preview}>
          <View style={styles.previewHeader}>
            <View style={styles.previewHeading}>
              <PretendardText style={styles.previewTitle} weight='semibold'>
                {l10n.t('community.write.attachments.packing')}
              </PretendardText>
              <PretendardText style={styles.previewSummary} numberOfLines={2}>
                {selectedBagLabel}
              </PretendardText>
            </View>
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.textAction}
                onPress={() => setSheetVisible(true)}
                disabled={write.getIsSubmitting()}
                accessibilityRole='button'
                accessibilityLabel={l10n.t('community.write.attachments.change')}
              >
                <PretendardText style={styles.textActionLabel}>
                  {l10n.t('community.write.attachments.change')}
                </PretendardText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.textAction}
                onPress={onRemove}
                disabled={write.getIsSubmitting()}
                accessibilityRole='button'
                accessibilityLabel={l10n.t('community.write.attachments.remove')}
              >
                <PretendardText style={styles.textActionLabel}>
                  {l10n.t('community.write.attachments.remove')}
                </PretendardText>
              </TouchableOpacity>
            </View>
          </View>
          <PretendardText style={styles.previewVisibility}>
            {l10n.t('community.write.bag.previewVisibility', {
              destination: snapshot.destinationName
                ? l10n.t('community.write.bag.previewDestinationIncluded')
                : l10n.t('community.write.bag.previewDestinationOmitted'),
              weather: snapshot.weather
                ? l10n.t('community.write.bag.previewWeatherIncluded', {
                    count: snapshot.weather.days.length,
                  })
                : l10n.t('community.write.bag.previewWeatherOmitted'),
            })}
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
    </>
  );

  const sheet = (
    <CampSiteBagSelectSheetView
      visible={sheetVisible}
      bags={bags}
      spotName=''
      subtitleOverride={l10n.t('community.write.bag.sheetSubtitle')}
      emptyText={l10n.t('community.write.bag.empty')}
      onClose={() => setSheetVisible(false)}
      onSelect={(bag) => void handleSelect(bag)}
      onCreateNew={() => router.push('/bag')}
    />
  );

  if (!snapshot) {
    return sheet;
  }

  return (
    <View style={styles.container}>
      {summary}
      {sheet}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  preview: {
    backgroundColor: Acg.paper,
    borderWidth: 1,
    borderColor: Acg.hairline,
    borderRadius: AcgRadius.thumb,
    padding: 16,
    gap: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 4,
  },
  previewHeading: {
    flex: 1,
    gap: 4,
  },
  previewTitle: {
    ...AcgType.control,
    color: Acg.ink,
  },
  previewSummary: {
    ...AcgType.control,
    color: Acg.ink,
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  textAction: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  textActionLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
  previewVisibility: {
    ...AcgType.meta,
    color: Acg.ink,
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
