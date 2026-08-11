import { FC, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  bagEdit: BagEdit;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼 이중 인셋을 막는다.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;
// 유리 검색 필드 높이 — 창고·탐색 화면의 필드와 같은 값이다(목업 §2·§3·§8).
const FIELD_HEIGHT = 48;

// 지우기 버튼 터치 여유. 버튼은 28로 그리고 HIG 44는 여유로만 채운다: (44 − 28) / 2 = 8.
const CLEAR_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const BagEditView: FC<Props> = ({ bagEdit }) => {
  const insets = useSafeAreaInsets();
  const weightGram = bagEdit.getWeightGram();
  const hasQuery = bagEdit.getQuery().length > 0;

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
          <BagEditWeightTitleView weightGram={weightGram} fontSize={17} />
        ),
        headerBackButtonDisplayMode: 'minimal',
        headerRight: () => (
          <TouchableOpacity
            onPress={handlePressAddGear}
            activeOpacity={LiquidMotion.pressOpacity}
            style={styles.nativeAddButton}
            accessibilityRole='button'
            accessibilityLabel='장비 추가'
          >
            {/* 아이콘은 Ionicons로 통일한다 — SF Symbols는 탭바만 쓴다(프로젝트 규칙). */}
            <Ionicons name='add' size={26} color={Liquid.ink} />
          </TouchableOpacity>
        ),
      }}
    />
  );

  if (!bagEdit.isInitialized()) {
    return stackScreen;
  } else {
    return (
      <Layout
        paddingHorizontal={0}
        edges={IS_IOS ? IOS_EDGES : undefined}
        background={<LiquidBackdrop screen='none' glowPosition='topRight' />}
      >
        {stackScreen}
        {IS_IOS ? (
          // 고정 레이아웃 화면 — 투명 헤더 높이만큼 상단 여백을 직접 확보한다.
          <View style={{ height: insets.top + LiquidLayout.navBar }} />
        ) : (
          <View style={styles.sectionWrap}>
            <BagEditHeaderView
              weightGram={weightGram}
              onPressBack={handlePressBack}
              onPressAddGear={handlePressAddGear}
            />
          </View>
        )}
        <View style={styles.mainContent}>
          <View style={styles.titleSection}>
            <PretendardText style={styles.titleText} weight='bold'>
              내 장비
            </PretendardText>
          </View>
          {/* 떠 있는 유리 필드 — 창고·탐색과 같은 문법(블러 + 유리 채움 + 0.5px 흰 보더)이고,
              값이 들어오면 채움을 한 단계 진하게 덮어 입력 상태를 드러낸다. */}
          <View style={styles.sectionWrap}>
            {/* 그림자는 바깥 래퍼가 진다 — 안쪽에서 모서리를 깎으므로(overflow) 같은 뷰에
                두면 그림자가 자기 경계에서 잘린다. */}
            <View style={styles.fieldShadow}>
              <View style={styles.field}>
                <BlurView
                  tint='light'
                  intensity={Liquid.glassBlurIntensity}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    styles.fieldFill,
                    hasQuery && styles.fieldFillActive,
                  ]}
                />
                <View style={styles.fieldBody}>
                  <Ionicons
                    name='search'
                    size={18}
                    color={hasQuery ? Liquid.ink : Liquid.inkMuted}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder='장비 검색'
                    placeholderTextColor={Liquid.inkMuted}
                    value={bagEdit.getQuery()}
                    onChangeText={value => bagEdit.setQuery(value)}
                    autoCorrect={false}
                    returnKeyType='search'
                  />
                  {hasQuery && (
                    <TouchableOpacity
                      onPress={() => bagEdit.setQuery('')}
                      style={styles.clearButton}
                      activeOpacity={LiquidMotion.pressOpacity}
                      hitSlop={CLEAR_HIT_SLOP}
                      accessibilityRole='button'
                      accessibilityLabel='검색어 지우기'
                    >
                      <Ionicons
                        name='close-circle'
                        size={20}
                        color={Liquid.inkSubtle}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>
          <View style={styles.sectionWrap}>
            <BagEditWarehouseFiltersView bagEdit={bagEdit} />
          </View>
          <View style={styles.warehouseContainer}>
            <BagEditWarehouseView bagEdit={bagEdit} />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <LiquidPillButton
            label='완료'
            variant='primary'
            block
            onPress={handlePressConfirm}
          />
        </View>
      </Layout>
    );
  }
};

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
  },
  /**
   * 화면 가로축. Android·Web 크롬 줄과 섹션이 **같은 값**이라 스타일을 하나로 쓴다 —
   * 유리 원형 버튼이 화면 가장자리에 붙지 않게 콘텐츠와 같은 축을 지킨다.
   */
  sectionWrap: {
    paddingHorizontal: LiquidLayout.screenH,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: LiquidLayout.screenH,
  },
  titleText: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
  },
  fieldShadow: {
    borderRadius: FIELD_HEIGHT / 2,
    boxShadow: LiquidShadow.field,
    marginBottom: 8,
  },
  field: {
    minHeight: FIELD_HEIGHT,
    borderRadius: FIELD_HEIGHT / 2,
    borderWidth: 0.5,
    borderColor: Liquid.glassStroke,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fieldFill: {
    backgroundColor: Liquid.glassFillField,
  },
  // 채워진 필드 — 목업의 `rgba(255,255,255,.85)`가 곧 glassFillStrong이다.
  fieldFillActive: {
    backgroundColor: Liquid.glassFillStrong,
  },
  fieldBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  // TextInput은 PretendardText로 감쌀 수 없어 서체를 직접 지정한다(창고 필드와 같은 값).
  searchInput: {
    flex: 1,
    fontFamily: 'Pretendard-Medium',
    fontSize: 15.5,
    color: Liquid.ink,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  clearButton: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warehouseContainer: {
    flex: 1,
    paddingHorizontal: LiquidLayout.screenH,
  },
  // iOS 네이티브 headerRight 장비 추가(+) 버튼 — HIG 최소 터치 타깃 44×44pt.
  nativeAddButton: {
    minWidth: LiquidLayout.touchMin,
    minHeight: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    paddingTop: 12,
    paddingHorizontal: LiquidLayout.screenH,
  },
});

export default observer(BagEditView);
