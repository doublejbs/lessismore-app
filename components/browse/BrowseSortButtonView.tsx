import { FC } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Liquid, LiquidLayout, LiquidMotion } from '@/constants/DesignTokens';
import BrowseSort from '@/model/search/BrowseSort';
import {
  BROWSE_SORT_OPTIONS,
  getBrowseSortName,
} from '@/model/browse/BrowseSortLabel';
import { setSortSheetContext } from '@/model/sort/SortSheetHandoff';

interface Props {
  sort: BrowseSort;
  onSelect: (sort: BrowseSort) => void;
}

/**
 * SR-7 정렬 진입 버튼 (Liquid Depth, 2026-08-11 이식).
 *
 * 옵션·현재값·선택 콜백을 모듈 핸드오프에 넣고 공용 formSheet 라우트로 위임한다.
 * 면을 두지 않는 글자 + 쉐브론이다 — 피드 필터 줄의 정렬 버튼과 같은 문법이라야
 * 두 화면에서 같은 것이 같게 읽힌다(FD-3).
 */
const BrowseSortButtonView: FC<Props> = ({ sort, onSelect }) => {
  const router = useRouter();

  const handleOpen = () => {
    setSortSheetContext({
      options: BROWSE_SORT_OPTIONS.map(option => ({
        key: option.sort,
        label: option.name,
      })),
      selectedKey: sort,
      onSelect: key => {
        onSelect(key as BrowseSort);
      },
    });
    router.push('/sort-sheet');
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleOpen}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole='button'
      accessibilityLabel={`정렬 ${getBrowseSortName(sort)}`}
    >
      <PretendardText style={styles.label} weight='medium'>
        {getBrowseSortName(sort)}
      </PretendardText>
      <Ionicons name='chevron-down' size={15} color={Liquid.inkMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // 고정 높이 대신 minHeight로 HIG 44pt를 채운다 — Dynamic Type에서도 글자가 잘리지 않는다.
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: LiquidLayout.touchMin,
    paddingLeft: 12,
  },
  label: {
    fontSize: 13.5,
    color: Liquid.ink,
  },
});

export default BrowseSortButtonView;
