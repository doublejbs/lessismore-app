import { FC, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import SearchBarInputView, { SearchBarInputHandle } from './SearchInputView';
import SearchBarVariant from './SearchBarVariant';
import { Acg, AcgLayout, Spacing } from '@/constants/DesignTokens';
import AcgGlassView from '@/components/acg/AcgGlassView';

interface Props {
  searchWarehouse: SearchWarehouse;
  // 기본은 기존 유리 면(장비 추가 검색 시트가 그대로 쓴다).
  // 탐색 탭만 `Plain`(레퍼런스 연회색 알약)을 넘긴다.
  variant?: SearchBarVariant;
}

// 레퍼런스 검색 필드 — 높이 56 알약, 좌우 여백 16.
const PLAIN_FIELD_HEIGHT = 56;

const PLAIN_SCREEN_H = 16;

const SearchBarView: FC<Props> = ({
  searchWarehouse,
  variant = SearchBarVariant.Glass,
}) => {
  const inputRef = useRef<SearchBarInputHandle>(null);

  const handlePressContainer = () => {
    inputRef.current?.focus();
  };

  if (variant === SearchBarVariant.Plain) {
    // FD-2: 순백 지면 위 연회색 단색 알약. 테두리·유리·그림자를 두지 않는다.
    return (
      <View style={styles.plainContainer}>
        <Pressable style={styles.plainField} onPress={handlePressContainer}>
          <SearchBarInputView
            ref={inputRef}
            searchWarehouse={searchWarehouse}
            variant={variant}
          />
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.container}>
        {/* 검색 필드는 유리 면(ACG). */}
        <AcgGlassView style={styles.searchGlass}>
          <Pressable
            style={styles.searchContainer}
            onPress={handlePressContainer}
          >
            <SearchBarInputView
              ref={inputRef}
              searchWarehouse={searchWarehouse}
            />
          </Pressable>
        </AcgGlassView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AcgLayout.screenH,
    // 제목을 걷어내 검색 필드가 화면 최상단이 됐다 — 제목이 쓰던 여백을 여기서 낸다.
    paddingTop: 20,
    // 필터바까지 리듬 = 이 값 + 필터 paddingTop(8) = 20(Spacing.screenH). height 고정은 Dynamic Type에서 잘려 제거.
    paddingBottom: Spacing.item,
    gap: 4,
  },
  searchGlass: {
    flex: 1,
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  plainContainer: {
    paddingHorizontal: PLAIN_SCREEN_H,
    paddingTop: 12,
    paddingBottom: 12,
  },
  plainField: {
    flexDirection: 'row',
    alignItems: 'center',
    // 고정 높이가 아니라 최소 높이로 둬 Dynamic Type에서 입력이 잘리지 않게 한다.
    minHeight: PLAIN_FIELD_HEIGHT,
    // 높이가 커져도 알약을 유지한다(레퍼런스: radius full).
    borderRadius: PLAIN_FIELD_HEIGHT,
    backgroundColor: Acg.controlFill,
    paddingHorizontal: 20,
  },
});

export default observer(SearchBarView);
