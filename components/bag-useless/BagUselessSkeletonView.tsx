import { FC, useEffect, useRef } from 'react';
import { View, Animated, FlatList } from 'react-native';

interface Props {}

const BagUselessSkeletonView: FC<Props> = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, [pulseAnim]);

  const renderGearSkeletonItem = ({ index }: { index: number }) => {
    return (
      <View
        style={{
          flexDirection: 'row',
          paddingVertical: 10,
          gap: 12,
        }}
      >
        {/* 이미지 영역 */}
        <View
          style={{
            flexDirection: 'row',
            gap: 6,
          }}
        >
          <Animated.View
            style={{
              width: 80,
              height: 80,
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              minWidth: 80,
              opacity: pulseAnim,
            }}
          />
        </View>

        {/* 장비 정보 */}
        <View
          style={{
            flexDirection: 'column',
            overflow: 'hidden',
            flex: 1,
            gap: 6,
          }}
        >
          <Animated.View
            style={{
              width: '70%',
              height: 18,
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              opacity: pulseAnim,
            }}
          />
          <Animated.View
            style={{
              width: '50%',
              height: 16,
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              opacity: pulseAnim,
            }}
          />
          <Animated.View
            style={{
              width: '40%',
              height: 16,
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              opacity: pulseAnim,
            }}
          />
        </View>

        {/* 체크박스 영역 */}
        <View
          style={{
            flexDirection: 'column',
            minWidth: 24,
            height: '100%',
          }}
        >
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'flex-end',
              width: 24,
              height: 24,
            }}
          >
            <Animated.View
              style={{
                width: 24,
                height: 24,
                backgroundColor: '#E5E7EB',
                borderRadius: 4,
                opacity: pulseAnim,
              }}
            />
          </View>
        </View>
      </View>
    );
  };

  const data = Array.from({ length: 8 }, (_, index) => ({ index }));

  return (
    <View
      style={{
        flexDirection: 'column',
        height: '100%',
        paddingHorizontal: 20,
        gap: 12,
      }}
    >
      {/* 상단 뒤로가기 버튼 */}
      <View
        style={{
          width: '100%',
          paddingVertical: 7,
        }}
      >
        <Animated.View
          style={{
            width: 25,
            height: 24,
            backgroundColor: '#E5E7EB',
            borderRadius: 4,
            opacity: pulseAnim,
          }}
        />
      </View>

      {/* 제목 영역 */}
      <View
        style={{
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <Animated.View
          style={{
            width: '90%',
            height: 34,
            backgroundColor: '#E5E7EB',
            borderRadius: 4,
            opacity: pulseAnim,
          }}
        />
        <Animated.View
          style={{
            width: '60%',
            height: 34,
            backgroundColor: '#E5E7EB',
            borderRadius: 4,
            opacity: pulseAnim,
          }}
        />
      </View>

      {/* 메인 컨텐츠 영역 */}
      <View
        style={{
          paddingTop: 24,
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {/* 상태 표시 및 전체 선택 버튼 */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <Animated.View
            style={{
              width: 150,
              height: 20,
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              opacity: pulseAnim,
            }}
          />
          <Animated.View
            style={{
              width: 80,
              height: 20,
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              opacity: pulseAnim,
            }}
          />
        </View>

        {/* 장비 리스트 */}
        <FlatList
          data={data}
          renderItem={renderGearSkeletonItem}
          keyExtractor={item => item.index.toString()}
          style={{
            flex: 1,
          }}
          showsVerticalScrollIndicator={false}
        />

        {/* 완료 버튼 */}
        <View
          style={{
            width: '100%',
            paddingVertical: 12,
          }}
        >
          <Animated.View
            style={{
              width: '100%',
              height: 54,
              backgroundColor: '#E5E7EB',
              borderRadius: 10,
              opacity: pulseAnim,
            }}
          />
        </View>
      </View>
    </View>
  );
};

export default BagUselessSkeletonView;
