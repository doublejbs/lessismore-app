import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import PretendardText from '../PretendardText';
import { AcgType, Color } from '@/constants/DesignTokens';
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

const DownArrowIcon = () => (
  <Svg width={25} height={24} viewBox='0 0 25 24' fill='none'>
    <Path
      d='M7.5 10L12.5008 14.58L17.5 10'
      stroke={Color.textPrimary}
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

// SR-7 정렬 진입 버튼. 옵션·현재값·선택 콜백을 모듈 핸드오프에 넣고 공용 formSheet 라우트로 위임한다.
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
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleOpen}>
        <PretendardText style={styles.buttonText} weight='bold'>
          {getBrowseSortName(sort)}
        </PretendardText>
        <DownArrowIcon />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 32,
  },
  button: {
    // 높이 100%는 부모가 고정 높이일 때만 성립했다 — 이제 라벨 줄박스 + 세로 패딩이 높이를 정한다.
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
  },
  buttonText: {
    ...AcgType.control,
    color: Color.textPrimary,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default BrowseSortButtonView;
