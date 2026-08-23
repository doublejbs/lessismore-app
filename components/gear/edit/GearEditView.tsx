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
import LoadingIconView from '@/components/ui/LoadingIconView';
import PretendardText from '@/components/PretendardText';
import AlertView from '@/components/alert/AlertView';
import CategoryChipView from '@/components/browse/CategoryChipView';
import useKeyboard from '@/hooks/useKeyboard';
import app from '@/model/app/App';
import { Acg, AcgType, Color, Radius } from '@/constants/DesignTokens';

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
          headerTitle: app.getL10n().t('gearEdit.title'),
          headerBackButtonDisplayMode: 'minimal',
          headerRight: () => (
            <TouchableOpacity
              onPress={handlePressDelete}
              style={styles.nativeHeaderButton}
              accessibilityLabel={app.getL10n().t('gearEdit.delete')}
              accessibilityRole='button'
            >
              <Ionicons
                name='trash-outline'
                size={22}
                color={Color.textPrimary}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView
        style={styles.container}
        edges={IS_IOS ? IOS_EDGES : ALL_EDGES}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {!IS_IOS && (
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handlePressBack}
                style={styles.headerButton}
                accessibilityLabel={app.getL10n().t('gearEdit.back')}
                accessibilityRole='button'
              >
                <Ionicons
                  name='chevron-back'
                  size={24}
                  color={Color.textPrimary}
                />
              </TouchableOpacity>
              <PretendardText weight='semibold' style={styles.headerTitle}>
                {app.getL10n().t('gearEdit.title')}
              </PretendardText>
              <TouchableOpacity
                onPress={handlePressDelete}
                style={styles.headerButton}
                accessibilityLabel={app.getL10n().t('gearEdit.delete')}
                accessibilityRole='button'
              >
                <Ionicons
                  name='trash-outline'
                  size={22}
                  color={Color.textPrimary}
                />
              </TouchableOpacity>
            </View>
          )}
          {isLoading && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 100,
              }}
            >
              <LoadingIconView />
            </View>
          )}
          <ScrollView
            ref={scrollViewRef}
            style={{
              flex: 1,
            }}
            // iOS: 콘텐츠가 투명 헤더 뒤로 흐르되(edge-to-edge) 첫 콘텐츠는 시스템이 자동 인셋.
            contentInsetAdjustmentBehavior='automatic'
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 120,
            }}
          >
            <View
              style={{
                width: '100%',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <View
                style={{
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <PretendardText
                  weight='medium'
                  style={{
                    ...AcgType.rowSubtitle,
                  }}
                >
                  {app.getL10n().t('gearEdit.productName')}
                </PretendardText>
                <TextInput
                  ref={nameInputRef}
                  style={{
                    borderRadius: Radius.input,
                    backgroundColor: Color.inputBg,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    // 단일행 입력이라 lineHeight를 얹지 않는다(안드로이드에서 커서 높이가 어긋난다).
                    fontSize: AcgType.control.fontSize,
                    letterSpacing: AcgType.control.letterSpacing,
                  }}
                  placeholder={app.getL10n().t('gearEdit.productNamePlaceholder')}
                  onChangeText={handleChangeName}
                  value={name}
                  placeholderTextColor={Color.textSecondary}
                  onFocus={() => setFocusedInput('name')}
                />
              </View>
              <View
                style={{
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <PretendardText
                  weight='medium'
                  style={{
                    ...AcgType.rowSubtitle,
                  }}
                >
                  {app.getL10n().t('gearEdit.brand')}
                </PretendardText>
                <TextInput
                  ref={companyInputRef}
                  style={{
                    borderRadius: Radius.input,
                    backgroundColor: Color.inputBg,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    // 단일행 입력이라 lineHeight를 얹지 않는다(안드로이드에서 커서 높이가 어긋난다).
                    fontSize: AcgType.control.fontSize,
                    letterSpacing: AcgType.control.letterSpacing,
                  }}
                  placeholder={app.getL10n().t('gearEdit.brandPlaceholder')}
                  onChangeText={handleChangeCompany}
                  value={company}
                  placeholderTextColor={Color.textSecondary}
                  onFocus={() => setFocusedInput('company')}
                />
              </View>
              <GearEditColorView gearEdit={gearEdit} />
              <View
                style={{
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <PretendardText
                  weight='medium'
                  style={{
                    ...AcgType.rowSubtitle,
                  }}
                >
                  {app.getL10n().t('gearEdit.category')}
                </PretendardText>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 4,
                  }}
                >
                  {gearEdit.mapFilters(filter => (
                    <CategoryChipView
                      key={filter.getFilter()}
                      label={filter.getLabel()}
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
          <View
            style={{
              backgroundColor: 'transparent',
            }}
          >
            <GearEditConfirmView gearEdit={gearEdit} />
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
    backgroundColor: Acg.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {},
  // iOS 네이티브 headerRight 삭제 버튼 — HIG 최소 터치 타깃 44×44pt, 바 안 정렬은 시스템에 위임.
  nativeHeaderButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...AcgType.rowTitle,
    color: Color.textPrimary,
  },
});

export default observer(GearEditView);
