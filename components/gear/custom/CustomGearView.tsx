import React, { FC, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
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
import ImageUploadView from '@/components/gear/ImageUploadView';
import CustomGearConfirmView from '@/components/gear/custom/CustomGearConfirmView';
import CustomGear from '@/model/gear/custom/CustomGear';
import LoadingIconView from '@/components/ui/LoadingIconView';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import CustomGearWeightView from '@/components/gear/custom/CustomGearWeightView';
import CustomGearColorView from '@/components/gear/custom/CustomGearColorView';
import CustomGearInputSectionView from '@/components/gear/custom/CustomGearInputSectionView';
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
  // 검색 결과 스크롤 상태
  const [isSearchScrolling, setIsSearchScrolling] = useState(false);

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

  const handleSearchScrollStart = () => {
    setIsSearchScrolling(true);
  };

  const handleSearchScrollEnd = () => {
    setIsSearchScrolling(false);
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <LoadingIconView />
          </View>
        )}

        {/* 드래그 바 (iOS만) */}
        {Platform.OS === 'ios' && <View style={styles.dragBar} />}

        {/* 헤더 */}
        <View style={styles.header}>
          {Platform.OS === 'android' && (
            <TouchableOpacity
              onPress={handleClickHide}
              style={styles.backButton}
            >
              <Ionicons name='chevron-back' size={24} color='black' />
            </TouchableOpacity>
          )}
          <Text
            style={[
              styles.headerTitle,
              Platform.OS === 'android' && styles.headerTitleWithBackButton,
            ]}
          >
            장비 추가
          </Text>
          {Platform.OS === 'android' && (
            <View style={styles.backButtonPlaceholder} />
          )}
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          enabled={Platform.OS === 'ios'}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              isKeyboardVisible && styles.scrollContentKeyboardVisible,
            ]}
            keyboardShouldPersistTaps='handled'
            showsVerticalScrollIndicator={false}
            keyboardDismissMode='interactive'
            scrollEnabled={!isSearchScrolling}
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
            <CustomGearInputSectionView
              label='제품명'
              placeholder='제품명을 입력해주세요'
              value={name}
              onChangeText={handleChangeName}
              onFocus={() => setFocusedInput('name')}
              inputRef={nameInputRef}
              customGear={customGear}
              onSearchScrollStart={handleSearchScrollStart}
              onSearchScrollEnd={handleSearchScrollEnd}
            />
            <View style={styles.inputSection}>
              <Text style={styles.label}>브랜드</Text>
              <TextInput
                style={styles.input}
                placeholder='브랜드를 입력해주세요'
                value={company}
                onChangeText={handleChangeCompany}
                onFocus={() => setFocusedInput('company')}
                ref={companyInputRef}
              />
            </View>
            <CustomGearColorView customGear={customGear} />
            <View style={styles.inputSection}>
              <Text style={styles.label}>카테고리</Text>
              <View style={styles.filterContainer}>
                {customGear.mapFilters(filter => {
                  return (
                    <TouchableOpacity
                      style={[
                        styles.filterButton,
                        filter.isSelected() && styles.filterButtonSelected,
                      ]}
                      key={filter.getFilter()}
                      onPress={() => handleClickSelectFilter(filter)}
                    >
                      <Text
                        style={[
                          styles.filterButtonText,
                          filter.isSelected() &&
                            styles.filterButtonTextSelected,
                        ]}
                      >
                        {filter.getName()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
    backgroundColor: 'white',
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
    backgroundColor: 'white',
    padding: 16,
    borderTopColor: '#F0F0F0',
  },
  debugContainer: {
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  debugText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
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
    fontWeight: '500',
  },
  input: {
    borderRadius: 10,
    backgroundColor: '#F6F6F6',
    padding: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#F6F6F6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  filterButtonSelected: {
    backgroundColor: 'black',
  },
  filterButtonText: {
    fontSize: 14,
    color: 'black',
  },
  filterButtonTextSelected: {
    color: 'white',
  },
  dragBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: 'white',
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
    fontWeight: '600',
    color: 'black',
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
});

export default observer(CustomGearView);
