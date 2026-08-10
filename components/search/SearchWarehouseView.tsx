import { observer } from 'mobx-react-lite';
import React, { FC } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidShadow,
} from '@/constants/DesignTokens';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import Feed from '@/model/feed/Feed';
import { GearAddContext } from '@/model/gear/GearAddContext';
import useSearchFilterInheritance from '@/hooks/useSearchFilterInheritance';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import SearchBarView from './SearchBarView';
import SearchResultView from './SearchResultView';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  feed: Feed;
  gearAddContext?: GearAddContext | undefined;
  children?: React.ReactNode;
}

// 닫기 원의 지름. 44 터치 타깃은 바깥 버튼이 맡는다(핸드오프 헤더 유리 원 38).
const CLOSE_CIRCLE_SIZE = 38;

// 장비 추가 검색 모달(GE-8). 검색바 위에 핸들바 + 닫기(우상단) 헤더를 둔다.
// 탐색 탭과 동일하게 검색 승계(SR-1)를 배선해 검색 시에도 필터 바를 유지한다.
const SearchWarehouseView: FC<Props> = ({
  searchWarehouse,
  bag,
  feed,
  gearAddContext,
}) => {
  const router = useRouter();

  useSearchFilterInheritance(searchWarehouse, feed);

  const handleClose = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <SheetGrabberView />
      <View style={styles.header}>
        {/* 닫기는 콘텐츠 위에 떠 있는 크롬이라 종이 면이 아니라 유리 원이다(핸드오프 §6 헤더). */}
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
          accessibilityLabel='닫기'
        >
          {/* 그림자는 바깥 래퍼가 진다 — overflow:'hidden'과 같은 뷰에 두면 그림자까지 잘린다. */}
          <View style={styles.closeCircleShadow}>
            <View style={styles.closeCircle}>
              <BlurView
                tint='light'
                intensity={Liquid.glassBlurIntensity}
                style={StyleSheet.absoluteFill}
              />
              <View style={[StyleSheet.absoluteFill, styles.closeCircleFill]} />
              <Ionicons name='close' size={20} color={Liquid.ink} />
            </View>
          </View>
        </TouchableOpacity>
      </View>
      <SearchBarView searchWarehouse={searchWarehouse} />
      <SearchResultView
        searchWarehouse={searchWarehouse}
        bag={bag}
        feed={feed}
        gearAddContext={gearAddContext}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    width: '100%',
    backgroundColor: Liquid.canvas,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: LiquidLayout.navBar,
  },
  closeButton: {
    width: LiquidLayout.touchMin,
    height: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCircleShadow: {
    borderRadius: CLOSE_CIRCLE_SIZE / 2,
    boxShadow: LiquidShadow.glassSm,
  },
  closeCircle: {
    width: CLOSE_CIRCLE_SIZE,
    height: CLOSE_CIRCLE_SIZE,
    borderRadius: CLOSE_CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Liquid.glassStroke,
  },
  // BlurView 배경색은 블러를 가리므로 채움은 별도 레이어로 얹는다.
  closeCircleFill: {
    backgroundColor: Liquid.glassFill,
  },
});

export default observer(SearchWarehouseView);
