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
  LiquidShadow,
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
  // 검색어가 들어오면 필드가 **채워진 상태**로 바뀐다(핸드오프 §3) — 유리를 한 단계 진하게 덮고
  // 아이콘도 잉크로 올려, 결과 화면에서 필드가 placeholder 상태와 구분되게 한다.
  const hasKeyword = !!searchWarehouse.getKeyword().length;

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

      {/* 필드 위 여백은 타이틀이 있을 때 14, 없을 때(검색 결과 상태) 16이다(목업 §2·§3). */}
      <View style={[styles.container, !title && styles.containerNoTitle]}>
        {/* 그림자는 바깥 래퍼가 진다 — overflow:'hidden'과 같은 뷰에 두면 그림자까지 잘린다. */}
        <View style={styles.fieldShadow}>
          <View style={styles.field}>
            <BlurView
              tint='light'
              intensity={Liquid.glassBlurIntensity}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.fieldFill,
                hasKeyword && styles.fieldFillActive,
              ]}
            />
            <Pressable style={styles.fieldBody} onPress={handlePressContainer}>
              <Ionicons
                name='search'
                size={18}
                color={hasKeyword ? Liquid.ink : Liquid.inkMuted}
              />
              <SearchBarInputView
                ref={inputRef}
                searchWarehouse={searchWarehouse}
              />
            </Pressable>
          </View>
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
  containerNoTitle: {
    paddingTop: 16,
  },
  fieldShadow: {
    borderRadius: FIELD_HEIGHT / 2,
    boxShadow: LiquidShadow.field,
  },
  field: {
    minHeight: FIELD_HEIGHT,
    borderRadius: FIELD_HEIGHT / 2,
    borderWidth: 0.5,
    borderColor: Liquid.glassStroke,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fieldFill: {
    backgroundColor: Liquid.glassFillField,
  },
  // 채워진 필드 — 목업의 `rgba(255,255,255,.85)`가 곧 glassFillStrong이다.
  fieldFillActive: {
    backgroundColor: Liquid.glassFillStrong,
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
