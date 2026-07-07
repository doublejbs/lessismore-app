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
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import GearEdit from '@/model/gear/edit/GearEdit';
import ImageUploadView from '@/components/gear/ImageUploadView';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import GearEditWeightView from '@/components/gear/edit/GearEditWeightView';
import GearEditConfirmView from '@/components/gear/edit/GearEditConfirmView';
import GearEditColorView from '@/components/gear/edit/GearEditColorView';
import LoadingIconView from '@/components/ui/LoadingIconView';
import PretendardText from '@/components/PretendardText';
import AlertView from '@/components/alert/AlertView';
import useKeyboard from '@/hooks/useKeyboard';
import app from '@/model/app/App';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  gearEdit: GearEdit;
}

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

  const { isKeyboardVisible, keyboardHeight } = useKeyboard();

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
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
        <TouchableOpacity onPress={handlePressBack} style={styles.headerButton}>
          <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
        </TouchableOpacity>
        <PretendardText weight='semibold' style={styles.headerTitle}>
          수정하기
        </PretendardText>
        <TouchableOpacity
          onPress={handlePressDelete}
          style={styles.headerButton}
        >
          <Ionicons name='trash-outline' size={22} color={Color.textPrimary} />
        </TouchableOpacity>
      </View>
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
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 120,
          backgroundColor: Color.background,
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
                fontSize: 14,
              }}
            >
              제품명
            </PretendardText>
            <TextInput
              ref={nameInputRef}
              style={{
                borderRadius: Radius.input,
                backgroundColor: Color.inputBg,
                paddingHorizontal: 12,
                paddingVertical: 12,
                fontSize: 16,
              }}
              placeholder='제품명을 입력해주세요'
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
                fontSize: 14,
              }}
            >
              브랜드
            </PretendardText>
            <TextInput
              ref={companyInputRef}
              style={{
                borderRadius: Radius.input,
                backgroundColor: Color.inputBg,
                paddingHorizontal: 12,
                paddingVertical: 12,
                fontSize: 16,
              }}
              placeholder='브랜드를 입력해주세요'
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
                fontSize: 14,
              }}
            >
              카테고리
            </PretendardText>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 4,
              }}
            >
              {gearEdit.mapFilters(filter => {
                return (
                  <TouchableOpacity
                    style={{
                      backgroundColor: filter.isSelected()
                        ? Color.chipActiveBg
                        : Color.chipInactiveBg,
                      borderRadius: Radius.chip,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                    }}
                    key={filter.getFilter()}
                    onPress={() => handleClickSelectFilter(filter)}
                  >
                    <PretendardText
                      style={{
                        color: filter.isSelected()
                          ? Color.background
                          : Color.textPrimary,
                        fontSize: 14,
                      }}
                    >
                      {filter.getName()}
                    </PretendardText>
                  </TouchableOpacity>
                );
              })}
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
    backgroundColor: Color.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Color.background,
  },
  headerButton: {},
  headerTitle: {
    fontSize: 17,
    color: Color.textPrimary,
  },
});

export default observer(GearEditView);
