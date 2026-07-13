import { FC } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import SharedBag from '@/model/shared-bag/SharedBag';
import Gear from '@/model/gear/Gear';

interface Props {
  sharedBag: SharedBag;
}

const SharedBagView: FC<Props> = ({ sharedBag }) => {
  const router = useRouter();

  const handlePressBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const notShared = sharedBag.isNotShared();
  const gears = sharedBag.getGears();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handlePressBack}
          style={styles.backButton}
          accessibilityLabel='뒤로 가기'
          accessibilityRole='button'
        >
          <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
        </TouchableOpacity>

        <PretendardText
          style={styles.headerTitle}
          weight='semibold'
          numberOfLines={1}
        >
          {sharedBag.getName()}
        </PretendardText>
      </View>

      {notShared ? (
        <View style={styles.emptyWrap}>
          <PretendardText style={styles.emptyText}>
            공유가 해제된 배낭이에요
          </PretendardText>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.summary}>
            <PretendardText style={styles.dateRange}>
              {sharedBag.getDateRange()}
            </PretendardText>
            <PretendardText style={styles.totalWeight} weight='bold'>
              {sharedBag.getTotalWeightLabel()}
            </PretendardText>
          </View>

          <View style={styles.divider} />

          {gears.map(gear => (
            <GearRow key={gear.getId()} gear={gear} />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

interface GearRowProps {
  gear: Gear;
}

// 읽기전용 장비 행 — 탭·편집·삭제·체크 없음.
const GearRow: FC<GearRowProps> = ({ gear }) => {
  const imageUrl = gear.getImageUrl();
  const company = gear.getDisplayCompany();
  const weight = gear.getWeight();

  return (
    <View style={styles.gearRow}>
      <View style={styles.thumb}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.thumbImage}
            contentFit='cover'
          />
        ) : null}
      </View>

      <View style={styles.gearInfo}>
        <PretendardText
          style={styles.gearName}
          weight='semibold'
          numberOfLines={2}
        >
          {gear.getDisplayName()}
        </PretendardText>
        {company ? (
          <PretendardText style={styles.gearCompany}>{company}</PretendardText>
        ) : null}
      </View>

      {weight ? (
        <PretendardText style={styles.gearWeight} weight='medium'>
          {weight}g
        </PretendardText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: Color.background,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    color: Color.textPrimary,
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  summary: {
    paddingTop: 12,
    paddingBottom: 16,
    gap: 6,
  },
  dateRange: {
    fontSize: 14,
    color: Color.textSecondary,
  },
  totalWeight: {
    fontSize: 22,
    lineHeight: 28,
    color: Color.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Color.borderLight,
    marginBottom: 4,
  },
  gearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    minWidth: 56,
    borderRadius: Radius.listThumb,
    backgroundColor: Color.thumbBg,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  gearInfo: {
    flex: 1,
    gap: 4,
  },
  gearName: {
    fontSize: 15,
    lineHeight: 19,
    color: Color.textPrimary,
  },
  gearCompany: {
    fontSize: 13,
    color: Color.textSecondary,
  },
  gearWeight: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 15,
    color: Color.textSecondary,
  },
});

export default observer(SharedBagView);
