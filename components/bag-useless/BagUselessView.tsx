import { FC, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import BagUseless from '../../model/bag-useless/BagUseless';
import { observer } from 'mobx-react-lite';
import BagUselessGearView from './BagUselessGearView';
import { Svg, Path } from 'react-native-svg';

interface Props {
  bagUseless: BagUseless;
}

const BagUselessView: FC<Props> = ({ bagUseless }) => {
  const isInitialized = bagUseless.isInitialized();
  const allCount = bagUseless.getAllCount();
  const selectedCount = bagUseless.getSelectedCount();
  const gears = bagUseless.getGears();

  const handlePressToggleSelectAll = () => {
    bagUseless.toggleSelectAll();
  };

  const handlePressConfirm = () => {
    bagUseless.save();
  };

  const handlePressBack = () => {
    bagUseless.back();
  };

  const renderGearItem = ({ item }: { item: any }) => (
    <BagUselessGearView gear={item} bagUseless={bagUseless} />
  );

  useEffect(() => {
    bagUseless.initialize();
  }, []);

  if (isInitialized) {
    return (
      <View
        style={{
          flexDirection: 'column',
          height: '100%',
          gap: 12,
        }}
      >
        <View
          style={{
            width: '100%',
            paddingVertical: 7,
          }}
        >
          <TouchableOpacity onPress={handlePressBack}>
            <Svg width={25} height={24} viewBox='0 0 25 24' fill='none'>
              <Path
                d='M16.2844 20.475C15.9844 20.475 15.6844 20.375 15.4844 20.075L7.98438 12.575C7.48438 12.075 7.48438 11.375 7.98438 10.875L15.4844 3.375C15.9844 2.875 16.6844 2.875 17.1844 3.375C17.6844 3.875 17.6844 4.575 17.1844 5.075L10.3844 11.775L17.0844 18.475C17.5844 18.975 17.5844 19.675 17.0844 20.175C16.8844 20.375 16.5844 20.475 16.2844 20.475Z'
                fill='#191F28'
              />
            </Svg>
          </TouchableOpacity>
        </View>
        <View
          style={{
            flexDirection: 'column',
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: 'bold',
            }}
          >
            실제로 사용했던 장비만
          </Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: 'bold',
            }}
          >
            선택해주세요
          </Text>
        </View>
        <View
          style={{
            paddingTop: 24,
            flexDirection: 'column',
            flex: 1,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: 'bold',
              }}
            >
              전채 {allCount}개 중{' '}
              <Text
                style={{
                  color: '#CCF124',
                }}
              >
                {selectedCount}
              </Text>
              개 사용
            </Text>
            <TouchableOpacity onPress={handlePressToggleSelectAll}>
              <Text
                style={{
                  color: '#505967',
                  fontSize: 16,
                }}
              >
                {selectedCount ? '전체 해제' : '전체 선택'}
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={gears}
            renderItem={renderGearItem}
            keyExtractor={item => item.getId()}
            style={{
              flex: 1,
            }}
            showsVerticalScrollIndicator={false}
          />
          <View
            style={{
              width: '100%',
              paddingVertical: 12,
            }}
          >
            <TouchableOpacity
              style={{
                width: '100%',
                backgroundColor: 'black',
                paddingVertical: 18,
                borderRadius: 10,
                alignItems: 'center',
              }}
              onPress={handlePressConfirm}
            >
              <Text
                style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}
              >
                완료
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  } else {
    return null;
  }
};

export default observer(BagUselessView);
