import { FC } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import Warehouse from '@/model/warehouse/Warehouse';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidShadow,
} from '@/constants/DesignTokens';

interface Props {
  warehouse: Warehouse;
  onClose: () => void;
}

// 유리 검색 필드 높이 — 탐색·검색 결과 화면의 필드와 같은 값이다(목업 §2·§3).
const FIELD_HEIGHT = 48;
/**
 * 지우기 버튼 터치 여유. 버튼은 28로 그린다 — 키우면 필드 안쪽 여백을 먹어 입력줄이
 * 눌린다. HIG 44는 여유로만 채운다: (44 − 28) / 2 = 8.
 */
const CLEAR_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

/**
 * Android·Web용 창고 검색 필드 (Liquid Depth, WH-8).
 *
 * iOS는 네이티브 검색 바(`headerSearchBarOptions`)가 이 자리를 맡으므로 쓰지 않는다
 * ([LiquidGlassNavigation.md](../../specs/LiquidGlassNavigation.md) LG-3).
 * 필드는 떠 있는 유리다 — 탐색 탭 필드와 같은 문법(블러 + 유리 채움 + 0.5px 흰 보더)이며,
 * 값이 들어오면 채움을 한 단계 진하게 덮어 입력 상태를 드러낸다.
 */
const WarehouseSearchFieldView: FC<Props> = ({ warehouse, onClose }) => {
  const query = warehouse.getQuery();
  const hasQuery = query.length > 0;

  const handleChangeText = (value: string) => {
    warehouse.setQuery(value);
  };

  const handlePressClear = () => {
    warehouse.setQuery('');
  };

  return (
    <View style={styles.row}>
      {/* 그림자는 바깥 래퍼가 진다 — 안쪽에서 모서리를 깎으므로(overflow) 같은 뷰에 두면 잘린다. */}
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
              hasQuery && styles.fieldFillActive,
            ]}
          />
          {/* 누를 대상이 아니라 인풋을 담는 줄이다 — 필드를 탭하면 TextInput 자신이 받는다. */}
          <View style={styles.fieldBody}>
            <Ionicons
              name='search'
              size={18}
              color={hasQuery ? Liquid.ink : Liquid.inkMuted}
            />
            <TextInput
              style={styles.input}
              placeholder='장비 검색'
              placeholderTextColor={Liquid.inkMuted}
              value={query}
              onChangeText={handleChangeText}
              autoCorrect={false}
              autoFocus
              returnKeyType='search'
            />
            {hasQuery ? (
              <TouchableOpacity
                onPress={handlePressClear}
                style={styles.clearButton}
                hitSlop={CLEAR_HIT_SLOP}
                accessibilityRole='button'
                accessibilityLabel='검색어 지우기'
              >
                <Ionicons
                  name='close-circle'
                  size={20}
                  color={Liquid.inkSubtle}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={onClose}
        style={styles.cancelButton}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel='검색 닫기'
      >
        <PretendardText weight='semibold' style={styles.cancelText}>
          취소
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldShadow: {
    flex: 1,
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
  input: {
    flex: 1,
    // TextInput은 PretendardText로 감쌀 수 없어 서체를 직접 지정한다 — 지정하지 않으면
    // 입력값만 시스템 서체로 렌더돼 화면에서 튄다. 값은 15.5/500(핸드오프 §3).
    fontFamily: 'Pretendard-Medium',
    fontSize: 15.5,
    color: Liquid.ink,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  clearButton: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    minWidth: LiquidLayout.touchMin,
    minHeight: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    color: Liquid.inkSecondary,
  },
});

export default observer(WarehouseSearchFieldView);
