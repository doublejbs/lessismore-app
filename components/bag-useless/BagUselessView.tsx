import { FC, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import BagUseless from '../../model/bag-useless/BagUseless';
import { observer } from 'mobx-react-lite';
import app from '../../model/app/App';
import BagUselessGearView from './BagUselessGearView';
import PretendardText from '@/components/PretendardText';
import { Ionicons } from '@expo/vector-icons';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';
import Gear from '@/model/gear/Gear';

interface Props {
  bagUseless: BagUseless;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS 네이티브 내비게이션 바 높이 — 고정(비스크롤) 상단 콘텐츠의 시작 위치 보정용.
const NATIVE_HEADER_HEIGHT = 44;

const toKg = (grams: number) => Math.round((grams / 1000) * 100) / 100;

const BagUselessView: FC<Props> = ({ bagUseless }) => {
  const insets = useSafeAreaInsets();
  const isInitialized = bagUseless.isInitialized();
  const allCount = bagUseless.getAllCount();
  const selectedCount = bagUseless.getSelectedCount();
  const gears = bagUseless.getGears();

  const handlePressToggleSelectAll = () => {
    app.getAnalyticsManager()?.logClick('useless_select_all', {
      selected: selectedCount === 0,
    });
    bagUseless.toggleSelectAll();
  };

  const handlePressConfirm = () => {
    app.getAnalyticsManager()?.logClick('useless_confirm');
    bagUseless.save();
  };

  const handlePressBack = () => {
    bagUseless.back();
  };

  const renderGearItem = ({ item }: { item: Gear }) => (
    <BagUselessGearView gear={item} bagUseless={bagUseless} />
  );

  useEffect(() => {
    bagUseless.initialize();
  }, []);

  if (!isInitialized) {
    return null;
  }

  const totalKg = toKg(
    gears.reduce((acc, gear) => acc + Number(gear.getWeight()), 0)
  );
  const selectedKg = toKg(
    gears
      .filter(gear => bagUseless.isSelected(gear))
      .reduce((acc, gear) => acc + Number(gear.getWeight()), 0)
  );
  const percent = allCount > 0 ? Math.round((selectedCount / allCount) * 100) : 0;

  return (
    <View
      style={[
        styles.container,
        // LG-1: 큰 안내 타이틀이 상단 고정 콘텐츠라 헤더 뒤로 흐를 수 없다 —
        // 투명 헤더(상태바+44pt) 아래에서 시작하도록 여백을 준다.
        // 헤더 높이 + 여백 — back 버튼과 본문 타이틀이 붙어 보이지 않게 간격을 둔다.
        IS_IOS && {
          paddingTop: insets.top + NATIVE_HEADER_HEIGHT + Spacing.section,
        },
      ]}
    >
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)은 시스템에 위임한다
          (headerBlurEffect·headerStyle.backgroundColor 지정 금지). 큰 안내 문구
          ('실제로 사용했던 장비만 선택해주세요')는 내비 타이틀이 아니라 본문 콘텐츠라
          headerTitle은 비워 둔다. 하단 '완료' 버튼은 본문 유지. */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
        <View style={styles.backRow}>
          <TouchableOpacity
            onPress={handlePressBack}
            hitSlop={12}
            accessibilityRole='button'
            accessibilityLabel='뒤로가기'
          >
            <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.titleColumn}>
        <PretendardText weight='bold' style={styles.title}>
          실제로 사용했던 장비만
        </PretendardText>
        <PretendardText weight='bold' style={styles.title}>
          선택해주세요
        </PretendardText>
      </View>

      <View style={styles.progress}>
        <View style={styles.countRow}>
          <PretendardText weight='bold' style={styles.count}>
            {selectedCount}
            <PretendardText weight='medium' style={styles.countTotal}>
              {' '}
              / {allCount} 사용
            </PretendardText>
          </PretendardText>
          <TouchableOpacity onPress={handlePressToggleSelectAll} hitSlop={8}>
            <PretendardText weight='medium' style={styles.selectAllText}>
              {selectedCount ? '전체 해제' : '전체 선택'}
            </PretendardText>
          </TouchableOpacity>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${percent}%` }]} />
        </View>
        <PretendardText weight='medium' style={styles.weightText}>
          {selectedKg}kg / {totalKg}kg
        </PretendardText>
      </View>

      <FlatList
        data={gears}
        renderItem={renderGearItem}
        keyExtractor={item => item.getId()}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.confirmWrapper}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handlePressConfirm}
          activeOpacity={0.8}
        >
          <PretendardText weight='semibold' style={styles.confirmLabel}>
            완료
          </PretendardText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    height: '100%',
  },
  backRow: {
    width: '100%',
    paddingVertical: 7,
  },
  titleColumn: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 28,
    color: Color.textPrimary,
  },
  progress: {
    marginTop: Spacing.section,
    marginBottom: 16,
    gap: 10,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  count: {
    fontSize: 28,
    color: Color.textPrimary,
  },
  countTotal: {
    fontSize: 16,
    color: Color.textSecondary,
  },
  selectAllText: {
    fontSize: 15,
    color: Color.textSecondary,
  },
  barTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: Color.divider,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: Color.textPrimary,
  },
  weightText: {
    fontSize: 15,
    color: Color.textSecondary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 16,
    paddingBottom: 16,
  },
  confirmWrapper: {
    width: '100%',
    paddingVertical: Spacing.item,
  },
  confirmButton: {
    width: '100%',
    backgroundColor: Color.textPrimary,
    paddingVertical: 16,
    borderRadius: Radius.card,
    alignItems: 'center',
  },
  confirmLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});

export default observer(BagUselessView);
