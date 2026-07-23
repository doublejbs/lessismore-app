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
import { Stack } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import ImageUploadView from '@/components/gear/ImageUploadView';
import CustomGearConfirmView from '@/components/gear/custom/CustomGearConfirmView';
import CustomGear from '@/model/gear/custom/CustomGear';
import LoadingIconView from '@/components/ui/LoadingIconView';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import CustomGearWeightView from '@/components/gear/custom/CustomGearWeightView';
import CustomGearColorView from '@/components/gear/custom/CustomGearColorView';
import CategoryChipView from '@/components/browse/CategoryChipView';
import AlertView from '@/components/alert/AlertView';
import app from '@/model/app/App';

interface Props {
  customGear: CustomGear;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';

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
        {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 바 버튼·scroll edge effect는 시스템에
            위임한다(headerBlurEffect·headerStyle.backgroundColor 지정 금지). 모달이라
            스택 히스토리가 없어 시스템 back이 안 나온다 — 기존 닫기 핸들러를 headerLeft에
            임베드한다. 커스텀 드래그 바(iOS 전용 어포던스)는 네이티브 헤더로 대체. */}
        <Stack.Screen
          options={{
            headerShown: IS_IOS,
            headerTransparent: true,
            headerTitle: '장비 추가',
            headerLeft: () => (
              <TouchableOpacity
                onPress={handleClickHide}
                style={styles.nativeCloseButton}
                accessibilityRole='button'
                accessibilityLabel='닫기'
              >
                <Ionicons name='close' size={24} color={Color.textPrimary} />
              </TouchableOpacity>
            ),
          }}
        />
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <LoadingIconView />
          </View>
        )}

        {/* 헤더 (Android/Web 커스텀 유지) */}
        {!IS_IOS && (
          <View style={styles.header}>
            {Platform.OS === 'android' && (
              <TouchableOpacity
                onPress={handleClickHide}
                style={styles.backButton}
                accessibilityRole='button'
                accessibilityLabel='닫기'
              >
                <Ionicons
                  name='chevron-back'
                  size={24}
                  color={Color.textPrimary}
                />
              </TouchableOpacity>
            )}
            <PretendardText
              weight='semibold'
              style={[styles.headerTitle, styles.headerTitleWithBackButton]}
            >
              장비 추가
            </PretendardText>
            <View style={styles.backButtonPlaceholder} />
          </View>
        )}

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          enabled={Platform.OS === 'ios'}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            // iOS: 콘텐츠가 투명 헤더 뒤로 흐르되(edge-to-edge) 첫 콘텐츠는 시스템이 자동 인셋.
            contentInsetAdjustmentBehavior='automatic'
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
            <View style={styles.imageSection}>
              <ImageUploadView fileUpload={customGear} />
            </View>
            <View style={styles.inputSection}>
              <PretendardText weight='medium' style={styles.label}>
                제품명
                <PretendardText weight='medium' style={styles.requiredMark}>
                  {' '}
                  *
                </PretendardText>
              </PretendardText>
              <View style={styles.inputContainer}>
                <TextInput
                  ref={nameInputRef}
                  style={styles.input}
                  placeholder='제품명을 입력해주세요'
                  value={name}
                  onChangeText={handleChangeName}
                  onFocus={() => setFocusedInput('name')}
                />
                {name ? (
                  <TouchableOpacity
                    onPress={() => customGear.setName('')}
                    style={styles.clearButton}
                    accessibilityRole='button'
                    accessibilityLabel='입력 지우기'
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name='close-circle'
                      size={20}
                      color={Color.iconMuted}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <View style={styles.inputSection}>
              <PretendardText weight='medium' style={styles.label}>
                브랜드
              </PretendardText>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder='브랜드를 입력해주세요'
                  value={company}
                  onChangeText={handleChangeCompany}
                  onFocus={() => setFocusedInput('company')}
                  ref={companyInputRef}
                />
                {company ? (
                  <TouchableOpacity
                    onPress={() => customGear.setCompany('')}
                    style={styles.clearButton}
                    accessibilityRole='button'
                    accessibilityLabel='입력 지우기'
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name='close-circle'
                      size={20}
                      color={Color.iconMuted}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <CustomGearColorView customGear={customGear} />
            <View style={styles.inputSection}>
              <PretendardText weight='medium' style={styles.label}>
                카테고리
              </PretendardText>
              <View style={styles.filterContainer}>
                {customGear.mapFilters(filter => (
                  <CategoryChipView
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
    backgroundColor: Color.background,
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
    paddingHorizontal: 20,
  },
  scrollContent: {
    gap: 28,
    paddingTop: 20,
  },
  scrollContentKeyboardVisible: {
    paddingBottom: 20,
  },
  scrollBottomPadding: {
    height: 20,
  },
  confirmButtonContainer: {
    backgroundColor: Color.background,
    padding: 16,
    borderTopColor: Color.borderLight,
  },
  imageSection: {
    flexDirection: 'row',
    width: '100%',
    height: 80,
    alignItems: 'center',
  },
  inputSection: {
    flexDirection: 'column',
    gap: 12,
  },
  label: {
    fontSize: 14,
  },
  requiredMark: {
    color: '#FF3B30',
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: Radius.input,
    backgroundColor: Color.inputBg,
    borderWidth: 1,
    borderColor: Color.borderLight,
    padding: 16,
  },
  clearButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
    backgroundColor: Color.background,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -12,
  },
  headerTitle: {
    fontSize: 18,
    color: Color.textPrimary,
    textAlign: 'center',
    flex: 1,
  },
  headerTitleWithBackButton: {
    textAlign: 'center',
  },
  backButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  // iOS 네이티브 headerLeft 닫기 버튼 — HIG 최소 터치 타깃 44×44pt, 바 안 정렬은 시스템에 위임.
  nativeCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(CustomGearView);
