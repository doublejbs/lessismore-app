import React, { FC, useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';
import CustomGearConfirmView from '@/components/gear/custom/CustomGearConfirmView';
import CustomGear from '@/model/gear/custom/CustomGear';
import LoadingIconView from '@/components/ui/LoadingIconView';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import CustomGearWeightView from '@/components/gear/custom/CustomGearWeightView';
import CustomGearColorView from '@/components/gear/custom/CustomGearColorView';
import LiquidChip from '@/components/liquid/LiquidChip';
import LiquidFieldLabel from '@/components/liquid/LiquidFieldLabel';
import AlertView from '@/components/alert/AlertView';
import app from '@/model/app/App';

interface Props {
  customGear: CustomGear;
}

const CustomGearView: FC<Props> = ({ customGear }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);
  const companyInputRef = useRef<TextInput>(null);
  const weightInputRef = useRef<TextInput>(null);
  const [focusedInput, setFocusedInput] = useState<
    'name' | 'company' | 'weight' | null
  >(null);

  const name = customGear.getName();
  const company = customGear.getCompany();
  const isLoading = customGear.isLoading();

  // 키보드 상태 감지
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // 스크롤 위치 저장
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);

  const scrollToInput = (inputRef: React.RefObject<TextInput | null>) => {
    if (inputRef.current && scrollViewRef.current) {
      setTimeout(() => {
        inputRef.current?.measureLayout(
          scrollViewRef.current as any,
          (_x, y) => {
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
    // 키보드 이벤트 리스너 등록
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
        setFocusedInput(null);

        // 안드로이드에서 레이아웃 변경 후 스크롤 위치 복원
        if (
          Platform.OS === 'android' &&
          scrollViewRef.current &&
          savedScrollPosition > 0
        ) {
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              y: savedScrollPosition,
              animated: false,
            });
          }, 50);
        }
      }
    );

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, [savedScrollPosition]);

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
    customGear.setName(text);
  };

  const handleClickHide = () => {
    customGear.hide();
  };

  const handleClickSelectFilter = (filter: WarehouseFilter) => {
    customGear.selectFilter(filter);
  };

  const handleChangeCompany = (text: string) => {
    customGear.setCompany(text);
  };

  return (
    <>
      <SafeAreaView
        style={styles.container}
        edges={
          Platform.OS === 'android'
            ? ['top', 'bottom', 'left', 'right']
            : ['bottom', 'left', 'right']
        }
      >
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <LoadingIconView />
          </View>
        )}

        {/* GE-8 직접 입력 모달의 이탈 경로 — 핸들바 + 우상단 닫기. 같은 시트에서 갈라지는
            검색 모달(SearchWarehouseView)과 같은 얼개다. 네이티브 formSheet가 아니라
            pageSheet 모달이라 OS 그래버가 없어 핸들바를 직접 그린다. */}
        <SheetGrabberView />
        <View style={styles.header}>
          <PretendardText weight='bold' style={styles.headerTitle}>
            장비 추가
          </PretendardText>
          <TouchableOpacity
            onPress={handleClickHide}
            style={styles.closeButton}
            activeOpacity={LiquidMotion.pressOpacity}
            accessibilityRole='button'
            accessibilityLabel='닫기'
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name='close' size={24} color={Liquid.ink} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          enabled={Platform.OS === 'ios'}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            // 헤더가 JS 행이라 시스템 인셋 보정이 필요 없다 — 자동 보정은 끄고 패딩만 쓴다.
            contentInsetAdjustmentBehavior='never'
            contentContainerStyle={[
              styles.scrollContent,
              isKeyboardVisible && styles.scrollContentKeyboardVisible,
            ]}
            keyboardShouldPersistTaps='handled'
            showsVerticalScrollIndicator={false}
            keyboardDismissMode='interactive'
            onScroll={e => {
              if (Platform.OS === 'android') {
                setSavedScrollPosition(e.nativeEvent.contentOffset.y);
              }
            }}
            scrollEventThrottle={16}
          >
            <View style={styles.inputSection}>
              <LiquidFieldLabel required>제품명</LiquidFieldLabel>
              <View style={styles.inputContainer}>
                <TextInput
                  ref={nameInputRef}
                  style={styles.input}
                  placeholder='제품명을 입력해주세요'
                  placeholderTextColor={Liquid.inkMuted}
                  value={name}
                  onChangeText={handleChangeName}
                  onFocus={() => setFocusedInput('name')}
                  accessibilityLabel='제품명'
                />
                {name ? (
                  <TouchableOpacity
                    onPress={() => customGear.setName('')}
                    style={styles.clearButton}
                    activeOpacity={LiquidMotion.pressOpacity}
                    accessibilityRole='button'
                    accessibilityLabel='입력 지우기'
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name='close-circle'
                      size={20}
                      color={Liquid.inkSubtle}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <View style={styles.inputSection}>
              <LiquidFieldLabel>브랜드</LiquidFieldLabel>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder='브랜드를 입력해주세요'
                  placeholderTextColor={Liquid.inkMuted}
                  value={company}
                  onChangeText={handleChangeCompany}
                  onFocus={() => setFocusedInput('company')}
                  ref={companyInputRef}
                  accessibilityLabel='브랜드'
                />
                {company ? (
                  <TouchableOpacity
                    onPress={() => customGear.setCompany('')}
                    style={styles.clearButton}
                    activeOpacity={LiquidMotion.pressOpacity}
                    accessibilityRole='button'
                    accessibilityLabel='입력 지우기'
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name='close-circle'
                      size={20}
                      color={Liquid.inkSubtle}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <CustomGearColorView customGear={customGear} />
            <View style={styles.inputSection}>
              <LiquidFieldLabel>카테고리</LiquidFieldLabel>
              <View style={styles.filterContainer}>
                {customGear.mapFilters(filter => (
                  <LiquidChip
                    key={filter.getFilter()}
                    label={filter.getName()}
                    selected={filter.isSelected()}
                    onPress={() => handleClickSelectFilter(filter)}
                  />
                ))}
              </View>
            </View>
            <CustomGearWeightView
              ref={weightInputRef}
              customGear={customGear}
              onFocus={() => setFocusedInput('weight')}
            />
            <View style={styles.scrollBottomPadding} />
          </ScrollView>
          <View
            style={[
              styles.confirmButtonContainer,
              {
                paddingBottom:
                  Platform.OS === 'ios' && isKeyboardVisible
                    ? keyboardHeight - 180
                    : 16,
              },
            ]}
          >
            <CustomGearConfirmView customGear={customGear} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <AlertView alertManager={app.getAlertManager()!} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 이 화면은 pageSheet 모달이라 지면을 스스로 깐다(지형 없는 중성 지면).
    backgroundColor: Liquid.canvas,
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: LiquidLayout.screenH,
  },
  scrollContent: {
    gap: LiquidLayout.section,
    // 세로 여백이라 `LiquidLayout.screenH`(가로축 토큰)를 쓰지 않는다 — 값이 같아도 축이 다르다.
    paddingTop: 20,
  },
  scrollContentKeyboardVisible: {
    paddingBottom: 20,
  },
  scrollBottomPadding: {
    height: 20,
  },
  confirmButtonContainer: {
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: LiquidLayout.cardPad,
  },
  // 라벨(`LiquidFieldLabel`)이 자기 아래 여백 10을 들고 있어 gap을 겹치지 않는다.
  inputSection: {
    flexDirection: 'column',
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  /**
   * 폼 안 모든 필드가 같은 알약을 쓴다 — `PretendardText`를 쓸 수 없어 서체를 직접 건다.
   * 지우기 버튼이 겹쳐 앉으므로 우측 여백을 더 비운다.
   */
  input: {
    flex: 1,
    height: LiquidLayout.pillHeight,
    paddingLeft: 20,
    paddingRight: 48,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.surfaceSunken,
    fontFamily: 'Pretendard-Medium',
    fontSize: LiquidType.body.fontSize,
    color: Liquid.ink,
  },
  clearButton: {
    position: 'absolute',
    right: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 28,
    minWidth: 28,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: LiquidLayout.screenH,
    paddingRight: 12,
    minHeight: 56,
  },
  // 시트 제목은 화면 대상이라 title3 — 폼 라벨(마이크로)과 위계가 갈린다.
  headerTitle: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
  },
  // HIG 최소 터치 타깃 44×44pt.
  closeButton: {
    width: LiquidLayout.touchMin,
    height: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(CustomGearView);
