import React, { FC, useRef, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import GearEdit from '@/model/gear/edit/GearEdit';
import ImageUploadView from '@/components/gear/ImageUploadView';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import GearEditWeightView from '@/components/gear/edit/GearEditWeightView';
import GearEditConfirmView from '@/components/gear/edit/GearEditConfirmView';
import GearEditColorView from '@/components/gear/edit/GearEditColorView';
import LoadingIconView from '@/components/ui/LoadingIconView';
import PretendardText from '@/components/PretendardText';

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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const name = gearEdit.getName();
  const company = gearEdit.getCompany();
  const isLoading = gearEdit.isLoading();
  const isInitialized = gearEdit.isInitialized();

  const handleChangeName = (text: string) => {
    gearEdit.setName(text);
  };

  const handleChangeCompany = (text: string) => {
    gearEdit.setCompany(text);
  };

  const scrollToInput = (inputRef: React.RefObject<TextInput | null>) => {
    if (inputRef.current && scrollViewRef.current) {
      setTimeout(() => {
        inputRef.current?.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
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
        setFocusedInput(null);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

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

  const handleClickSelectFilter = (filter: WarehouseFilter) => {
    gearEdit.selectFilter(filter);
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: 'white',
      }}
    >
      <KeyboardAvoidingView
        style={{
          flex: 1,
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
                flexDirection: 'row',
                width: '100%',
                height: 80,
                alignItems: 'center',
              }}
            >
              <ImageUploadView fileUpload={gearEdit} />
            </View>
            <View
              style={{
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <PretendardText
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                }}
              >
                제품명
              </PretendardText>
              <TextInput
                ref={nameInputRef}
                style={{
                  borderRadius: 10,
                  backgroundColor: '#F6F6F6',
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 16,
                }}
                placeholder='제품명을 입력해주세요'
                onChangeText={handleChangeName}
                value={name}
                placeholderTextColor='#999'
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
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                }}
              >
                브랜드
              </PretendardText>
              <TextInput
                ref={companyInputRef}
                style={{
                  borderRadius: 10,
                  backgroundColor: '#F6F6F6',
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 16,
                }}
                placeholder='브랜드를 입력해주세요'
                onChangeText={handleChangeCompany}
                value={company}
                placeholderTextColor='#999'
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
                style={{
                  fontSize: 14,
                  fontWeight: '500',
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
                          ? 'black'
                          : '#F6F6F6',
                        borderRadius: 20,
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                      }}
                      key={filter.getFilter()}
                      onPress={() => handleClickSelectFilter(filter)}
                    >
                      <PretendardText
                        style={{
                          color: filter.isSelected() ? 'white' : 'black',
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
            paddingBottom: isKeyboardVisible ? keyboardHeight - 190 : 16,
          }}
        >
          <GearEditConfirmView gearEdit={gearEdit} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default observer(GearEditView);
