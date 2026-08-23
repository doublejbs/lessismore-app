import { FC, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import BagUseless from '../../model/bag-useless/BagUseless';
import { observer } from 'mobx-react-lite';
import app from '../../model/app/App';
import BagUselessGearView from './BagUselessGearView';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import { Ionicons } from '@expo/vector-icons';
import { Acg, AcgType, Color, Spacing } from '@/constants/DesignTokens';
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

  const renderGearItem = ({ item, index }: { item: Gear; index: number }) => (
    <BagUselessGearView
      gear={item}
      bagUseless={bagUseless}
      divided={index > 0}
    />
  );

  useEffect(() => {
    bagUseless.initialize();
  }, []);

  const percent =
    allCount > 0 ? Math.round((selectedCount / allCount) * 100) : 0;

  // 진행 바를 패킹모드 헤더와 동일한 스프링으로 채운다(오버슈트 없이 목표치까지).
  // 훅은 early return보다 위에 둔다(조건부 훅 금지).
  const progress = useSharedValue(percent);

  useEffect(() => {
    progress.value = withSpring(percent, {
      damping: 18,
      stiffness: 120,
      overshootClamping: true,
    });
  }, [percent, progress]);

  const barStyle = useAnimatedStyle(() => ({
    // 0~100 클램프 — 무효 width 퍼센트로 순간 풀폭 렌더되는 것을 막는다.
    width: `${Math.min(100, Math.max(0, progress.value))}%`,
  }));

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
            accessibilityLabel={app.getL10n().t('bagUseless.back')}
          >
            <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.titleColumn}>
        <PretendardText weight='bold' style={styles.title}>
          {app.getL10n().t('bagUseless.title')}
        </PretendardText>
      </View>

      <View style={styles.progress}>
        <View style={styles.countRow}>
          {/* 숫자라 콘덴스드를 쓴다 — 패킹 모드 진행률과 같은 문법(ACG). */}
          <View style={styles.countGroup}>
            <AcgDisplayText style={styles.count}>
              {String(selectedCount)}
            </AcgDisplayText>
            <PretendardText weight='medium' style={styles.countTotal}>
              {app.getL10n().t('bagUseless.usage', { count: allCount })}
            </PretendardText>
          </View>
          <TouchableOpacity onPress={handlePressToggleSelectAll} hitSlop={8}>
            <PretendardText weight='medium' style={styles.selectAllText}>
              {selectedCount ? app.getL10n().t('bagUseless.clearAll') : app.getL10n().t('bagUseless.selectAll')}
            </PretendardText>
          </TouchableOpacity>
        </View>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, barStyle]} />
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
            {app.getL10n().t('common.done')}
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
    ...AcgType.screenTitle,
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
  countGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  count: {
    ...AcgType.displayLarge,
    color: Acg.ink,
  },
  countTotal: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
  selectAllText: {
    ...AcgType.control,
    color: Acg.textMuted,
  },
  // 각진 진행 바 + 라임 채움(ACG) — 패킹 모드와 같은 값이라 두 화면이 같은 문법으로 읽힌다.
  barTrack: {
    width: '100%',
    height: 10,
    backgroundColor: Acg.hairline,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Acg.lime,
  },
  weightText: {
    ...AcgType.sectionSubtitle,
    color: Acg.textMuted,
  },
  list: {
    flex: 1,
  },
  listContent: {
    // 행이 각자 종이 면이라 홈 목록과 같은 8px로 벌린다(ACG).
    gap: 8,
    paddingBottom: 16,
  },
  confirmWrapper: {
    width: '100%',
    paddingVertical: Spacing.item,
  },
  confirmButton: {
    width: '100%',
    backgroundColor: Color.textPrimary,
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: 26,
    alignItems: 'center',
  },
  confirmLabel: {
    color: '#FFFFFF',
    ...AcgType.control,
  },
});

export default observer(BagUselessView);
