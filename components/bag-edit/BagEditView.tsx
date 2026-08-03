import { FC, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '../PretendardText';
import BagEditWarehouseView from './BagEditWarehouseView';
import BagEditWarehouseFiltersView from './BagEditWarehouseFiltersView';
import BagEdit from '../../model/bag-edit/BagEdit';
import app from '../../model/app/App';
import BagEditHeaderView from './BagEditHeaderView';
import BagEditWeightTitleView from './BagEditWeightTitleView';
import Layout from '../Layout';
import { Stack, useFocusEffect } from 'expo-router';
import { Acg, Color, Radius, Spacing } from '@/constants/DesignTokens';

interface Props {
  bagEdit: BagEdit;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼 이중 인셋을 막는다.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;
// iOS 26 투명 헤더는 배경이 없어(고정 레이아웃 화면) 콘텐츠 상단 여백을
// 세이프에어리어 + 컴팩트 바 높이(44pt)로 직접 확보한다.
const IOS_HEADER_BAR_HEIGHT = 44;

const BagEditView: FC<Props> = ({ bagEdit }) => {
  const insets = useSafeAreaInsets();
  const weight = bagEdit.getWeight();

  const handlePressBack = () => {
    bagEdit.back();
  };

  const handlePressAddGear = () => {
    bagEdit.showCustom();
  };

  const handlePressConfirm = () => {
    app.getAnalyticsManager()?.logClick('bag_edit_confirm');
    bagEdit.back();
  };

  useFocusEffect(
    useCallback(() => {
      bagEdit.initialize();
    }, [])
  );

  // LG-2 C: iOS 네이티브 헤더 — 무게 카운트업 타이틀을 headerTitle 커스텀 컴포넌트로 이식하고
  // 장비 추가(+)를 headerRight로 옮긴다(커스텀 컴포넌트 타이틀이라 Pretendard 폰트 유지).
  const stackScreen = (
    <Stack.Screen
      options={{
        headerShown: IS_IOS,
        headerTransparent: true,
        headerTitle: () => (
          <BagEditWeightTitleView weight={weight.toString()} fontSize={17} />
        ),
        headerBackButtonDisplayMode: 'minimal',
        headerRight: () => (
          <TouchableOpacity
            onPress={handlePressAddGear}
            activeOpacity={0.7}
            style={styles.nativeAddButton}
            accessibilityRole='button'
            accessibilityLabel='장비 추가'
          >
            <Svg width={24} height={24} viewBox='0 0 14 14' fill='none'>
              <Path
                d='M14 8H8V14H6V8H0V6H6V0H8V6H14V8Z'
                fill={Color.textPrimary}
              />
            </Svg>
          </TouchableOpacity>
        ),
      }}
    />
  );

  if (!bagEdit.isInitialized()) {
    return stackScreen;
  } else {
    return (
      <Layout paddingHorizontal={0} edges={IS_IOS ? IOS_EDGES : undefined}>
        {stackScreen}
        {IS_IOS ? (
          // 고정 레이아웃 화면 — 투명 헤더 높이만큼 상단 여백을 직접 확보한다.
          <View style={{ height: insets.top + IOS_HEADER_BAR_HEIGHT }} />
        ) : (
          <View style={{ paddingHorizontal: Spacing.screenH }}>
            <BagEditHeaderView
              weight={weight.toString()}
              onPressBack={handlePressBack}
              onPressAddGear={handlePressAddGear}
            />
          </View>
        )}
        <View style={styles.mainContent}>
          <View
            style={[
              styles.titleSection,
              { paddingHorizontal: Spacing.screenH },
            ]}
          >
            <PretendardText style={styles.titleText} weight='bold'>
              내 장비
            </PretendardText>
          </View>
          <View style={{ paddingHorizontal: Spacing.screenH }}>
            <View style={styles.searchBox}>
              <Ionicons name='search' size={18} color={Color.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder='장비 검색'
                placeholderTextColor={Color.textSecondary}
                value={bagEdit.getQuery()}
                onChangeText={value => bagEdit.setQuery(value)}
                autoCorrect={false}
                returnKeyType='search'
              />
              {bagEdit.getQuery().length > 0 && (
                <TouchableOpacity
                  onPress={() => bagEdit.setQuery('')}
                  hitSlop={8}
                  accessibilityRole='button'
                  accessibilityLabel='검색어 지우기'
                >
                  <Ionicons
                    name='close-circle'
                    size={18}
                    color={Color.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={{ paddingHorizontal: Spacing.screenH }}>
            <BagEditWarehouseFiltersView bagEdit={bagEdit} />
          </View>
          <View style={styles.warehouseContainer}>
            <BagEditWarehouseView bagEdit={bagEdit} />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handlePressConfirm}
            activeOpacity={0.8}
            accessibilityRole='button'
          >
            <PretendardText style={styles.confirmButtonText} weight='semibold'>
              완료
            </PretendardText>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Acg.bg,
  },
  mainContent: {
    flex: 1,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: Color.background,
  },
  titleText: {
    fontSize: 20,
    color: Color.textPrimary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.input,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Pretendard-Regular',
    color: Color.textPrimary,
    padding: 0,
  },
  warehouseContainer: {
    flex: 1,
    paddingHorizontal: Spacing.screenH,
  },
  // iOS 네이티브 headerRight 장비 추가(+) 버튼 — HIG 최소 터치 타깃 44×44pt.
  nativeAddButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    paddingTop: Spacing.item,
    paddingHorizontal: Spacing.screenH,
    backgroundColor: Color.background,
  },
  confirmButton: {
    backgroundColor: Color.chipActiveBg,
    width: '100%',
    padding: 14,
    borderRadius: Radius.card,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: Color.background,
    fontSize: 16,
  },
});

export default observer(BagEditView);
