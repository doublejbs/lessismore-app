import React, { FC, useRef, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import GearEdit from '@/model/gear/edit/GearEdit';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import GearEditWeightView from '@/components/gear/edit/GearEditWeightView';
import GearEditConfirmView from '@/components/gear/edit/GearEditConfirmView';
import GearEditColorView from '@/components/gear/edit/GearEditColorView';
import LoadingView from '@/components/ui/LoadingView';
import PretendardText from '@/components/PretendardText';
import AlertView from '@/components/alert/AlertView';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import LiquidChip from '@/components/liquid/LiquidChip';
import LiquidGlassCircleButton from '@/components/liquid/LiquidGlassCircleButton';
import LiquidFieldLabel from '@/components/liquid/LiquidFieldLabel';
import useKeyboard from '@/hooks/useKeyboard';
import app from '@/model/app/App';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  gearEdit: GearEdit;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS는 네이티브 투명 헤더가 상단을 덮고 스크롤 뷰가 자동 인셋을 받으므로
// top 세이프에어리어를 빼 이중 인셋을 막는다. 하단은 기존 동작 유지.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;
// Android/Web은 기존과 동일한 전 방향 세이프에어리어(SafeAreaView 기본값과 동일).
const ALL_EDGES = ['top', 'right', 'bottom', 'left'] as const;

/**
 * GE-2 장비 수정 폼 (Liquid Depth).
 *
 * 입력이 곧 화면이라 카드를 겹치지 않는다 — 지면 위에 라벨(마이크로) + 가라앉은 알약 입력을
 * 쌓고, 카테고리만 칩 줄로 고른다. 주 액션은 하단 잉크 알약 하나다(`GearEditConfirmView`).
 */
const GearEditView: FC<Props> = ({ gearEdit }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);
  const companyInputRef = useRef<TextInput>(null);
  const weightInputRef = useRef<TextInput>(null);
  const [focusedInput, setFocusedInput] = useState<
    'name' | 'company' | 'weight' | null
  >(null);

  const name = gearEdit.getName();
  const company = gearEdit.getCompany();
  const isLoading = gearEdit.isLoading();
  const isInitialized = gearEdit.isInitialized();

  const { isKeyboardVisible } = useKeyboard();

  const scrollToInput = (inputRef: React.RefObject<TextInput | null>) => {
    if (inputRef.current && scrollViewRef.current) {
      setTimeout(() => {
        inputRef.current?.measureLayout(
          scrollViewRef.current as any,
          (_, y) => {
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, y - 100), // 입력 필드 위쪽에 여백 제공
              animated: true,
            });
          },
          () => {}
        );
      }, 300); // 키보드 애니메이션 완료 후 스크롤
    }
  };

  useEffect(() => {
    if (isKeyboardVisible && focusedInput) {
      let inputRef;
      if (focusedInput === 'name') {
        inputRef = nameInputRef;
      } else if (focusedInput === 'company') {
        inputRef = companyInputRef;
      } else if (focusedInput === 'weight') {
        inputRef = weightInputRef;
      }

      if (inputRef) {
        scrollToInput(inputRef);
      }
    }
  }, [isKeyboardVisible, focusedInput]);

  const handleChangeName = (text: string) => {
    gearEdit.setName(text);
  };

  const handleChangeCompany = (text: string) => {
    gearEdit.setCompany(text);
  };

  const handleClickSelectFilter = (filter: WarehouseFilter) => {
    gearEdit.selectFilter(filter);
  };

  const handlePressBack = () => {
    gearEdit.hide();
  };

  const handlePressDelete = () => {
    gearEdit.delete();
  };

  return (
    <>
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
          시스템에 위임하고(headerBlurEffect·headerStyle.backgroundColor 지정 금지),
          삭제 액션은 기존 핸들러 그대로 headerRight에 임베드한다. */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '수정하기',
          headerBackButtonDisplayMode: 'minimal',
          headerRight: () => (
            <TouchableOpacity
              onPress={handlePressDelete}
              style={styles.nativeHeaderButton}
              activeOpacity={LiquidMotion.pressOpacity}
              accessibilityLabel='삭제'
              accessibilityRole='button'
            >
              <Ionicons name='trash-outline' size={22} color={Liquid.ink} />
            </TouchableOpacity>
          ),
        }}
      />
      {/* 지면은 형제로 깐다 — 세이프에어리어 여백까지 이어져야 한다. */}
      <View style={styles.root}>
        <LiquidBackdrop screen='none' glowPosition='topRight' />
        <SafeAreaView
          style={styles.container}
          edges={IS_IOS ? IOS_EDGES : ALL_EDGES}
        >
          <KeyboardAvoidingView
            style={styles.container}
            behavior={IS_IOS ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            {!IS_IOS && (
              <View style={styles.header}>
                <LiquidGlassCircleButton
                  icon='chevron-back'
                  onPress={handlePressBack}
                  accessibilityLabel='뒤로 가기'
                />
                <PretendardText weight='semibold' style={styles.headerTitle}>
                  수정하기
                </PretendardText>
                <LiquidGlassCircleButton
                  icon='trash-outline'
                  iconSize={20}
                  onPress={handlePressDelete}
                  accessibilityLabel='삭제'
                />
              </View>
            )}
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <LoadingView />
              </View>
            )}
            <ScrollView
              ref={scrollViewRef}
              style={styles.container}
              // iOS: 콘텐츠가 투명 헤더 뒤로 흐르되(edge-to-edge) 첫 콘텐츠는 시스템이 자동 인셋.
              contentInsetAdjustmentBehavior='automatic'
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.form}>
                <View style={styles.field}>
                  <LiquidFieldLabel>제품명</LiquidFieldLabel>
                  <TextInput
                    ref={nameInputRef}
                    style={styles.input}
                    placeholder='제품명을 입력해주세요'
                    onChangeText={handleChangeName}
                    value={name}
                    placeholderTextColor={Liquid.inkMuted}
                    onFocus={() => setFocusedInput('name')}
                    accessibilityLabel='제품명'
                  />
                </View>
                <View style={styles.field}>
                  <LiquidFieldLabel>브랜드</LiquidFieldLabel>
                  <TextInput
                    ref={companyInputRef}
                    style={styles.input}
                    placeholder='브랜드를 입력해주세요'
                    onChangeText={handleChangeCompany}
                    value={company}
                    placeholderTextColor={Liquid.inkMuted}
                    onFocus={() => setFocusedInput('company')}
                    accessibilityLabel='브랜드'
                  />
                </View>
                <GearEditColorView gearEdit={gearEdit} />
                <View style={styles.field}>
                  <LiquidFieldLabel>카테고리</LiquidFieldLabel>
                  <View style={styles.chipRow}>
                    {gearEdit.mapFilters(filter => (
                      <LiquidChip
                        key={filter.getFilter()}
                        label={filter.getName()}
                        selected={filter.isSelected()}
                        onPress={() => handleClickSelectFilter(filter)}
                      />
                    ))}
                  </View>
                </View>
                {isInitialized && (
                  <GearEditWeightView
                    ref={weightInputRef}
                    gearEdit={gearEdit}
                    onFocus={() => setFocusedInput('weight')}
                  />
                )}
              </View>
            </ScrollView>
            <GearEditConfirmView gearEdit={gearEdit} />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
      <AlertView alertManager={app.getAlertManager()!} />
    </>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    // 지면은 LiquidBackdrop이 깐다 — 여기 색을 두면 그 위를 덮는다.
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: LiquidLayout.screenH,
    paddingVertical: 8,
  },
  // iOS 네이티브 headerRight 삭제 버튼 — HIG 최소 터치 타깃 44×44pt, 바 안 정렬은 시스템에 위임.
  nativeHeaderButton: {
    minWidth: LiquidLayout.touchMin,
    minHeight: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  scrollContent: {
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: LiquidLayout.cardPad,
    paddingBottom: 120,
  },
  form: {
    width: '100%',
    flexDirection: 'column',
    gap: LiquidLayout.section,
  },
  // 라벨(`LiquidFieldLabel`)이 자기 아래 여백 10을 들고 있어 gap을 겹치지 않는다.
  field: {
    flexDirection: 'column',
  },
  /**
   * `PretendardText`를 쓸 수 없는 자리라 서체를 직접 건다(TextInput 예외).
   * 한 줄 입력이라 주 액션과 같은 알약이다 — 폼 전체가 같은 필드 문법을 쓴다.
   */
  input: {
    height: LiquidLayout.pillHeight,
    paddingHorizontal: 20,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.surfaceSunken,
    fontFamily: 'Pretendard-Medium',
    fontSize: LiquidType.body.fontSize,
    color: Liquid.ink,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

export default observer(GearEditView);
