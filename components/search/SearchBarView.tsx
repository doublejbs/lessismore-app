import { FC, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import SearchBarInputView, { SearchBarInputHandle } from './SearchInputView';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidLayout,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  searchWarehouse: SearchWarehouse;
  /** 화면 제목 — 탐색 탭은 `탐색`, 검색 결과 화면은 제목 없이 필드만 */
  title?: string;
}

// 목업 기준 유리 검색 필드 높이.
const FIELD_HEIGHT = 48;

/**
 * 검색 필드 (Liquid Depth).
 *
 * 필드는 **떠 있는 유리**다 — 지면 위에 얹힌 크롬이라 종이 카드와 달리 반투명 + 블러를 쓴다.
 * RN에 backdrop-filter가 없어 BlurView + glassFill 오버레이 + 0.5px 흰 보더로 근사한다.
 */
const SearchBarView: FC<Props> = ({ searchWarehouse, title }) => {
  const inputRef = useRef<SearchBarInputHandle>(null);

  const handlePressContainer = () => {
    inputRef.current?.focus();
  };

  return (
    <View>
      {title ? (
        <View style={styles.titleRow}>
          <PretendardText weight='bold' style={styles.title}>
            {title}
          </PretendardText>
        </View>
      ) : null}

      <View style={styles.container}>
        <View style={styles.field}>
          <BlurView
            tint='light'
            intensity={Liquid.glassBlurIntensity}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.fieldFill]} />
          <Pressable style={styles.fieldBody} onPress={handlePressContainer}>
            <Ionicons name='search' size={18} color={Liquid.inkMuted} />
            <SearchBarInputView
              ref={inputRef}
              searchWarehouse={searchWarehouse}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  titleRow: {
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: 16,
  },
  title: {
    fontSize: LiquidType.title1.fontSize,
    lineHeight: LiquidType.title1.lineHeight,
    letterSpacing: LiquidType.title1.letterSpacing,
    color: Liquid.ink,
  },
  container: {
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: 14,
  },
  field: {
    minHeight: FIELD_HEIGHT,
    borderRadius: FIELD_HEIGHT / 2,
    borderWidth: 0.5,
    borderColor: Liquid.glassStroke,
    boxShadow: '0 6px 20px rgba(16,16,18,0.07)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fieldFill: {
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  fieldBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
});

export default observer(SearchBarView);
