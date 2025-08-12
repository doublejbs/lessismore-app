import React, { FC } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
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

interface Props {
  gearEdit: GearEdit;
}

const GearEditView: FC<Props> = ({ gearEdit }) => {
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
      <View
        style={{
          flex: 1,
        }}
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
            {isInitialized && <GearEditWeightView gearEdit={gearEdit} />}
          </View>
        </ScrollView>
        <GearEditConfirmView gearEdit={gearEdit} />
      </View>
    </SafeAreaView>
  );
};

export default observer(GearEditView);
