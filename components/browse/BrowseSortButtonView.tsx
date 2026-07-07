import { FC, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import Svg, { Path } from 'react-native-svg';
import PretendardText from '../PretendardText';
import BrowseSort from '@/model/search/BrowseSort';
import {
  BROWSE_SORT_OPTIONS,
  getBrowseSortName,
} from '@/model/browse/BrowseSortLabel';

interface Props {
  sort: BrowseSort;
  onSelect: (sort: BrowseSort) => void;
}

const UpArrowIcon = () => (
  <Svg width={25} height={24} viewBox='0 0 25 24' fill='none'>
    <Path
      d='M7.5 14L12.5008 9.42L17.5 14'
      stroke='#0A090B'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

const DownArrowIcon = () => (
  <Svg width={25} height={24} viewBox='0 0 25 24' fill='none'>
    <Path
      d='M7.5 10L12.5008 14.58L17.5 10'
      stroke='#0A090B'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={20} height={20} viewBox='0 0 20 20' fill='none'>
    <Path
      d='M4 10.5L8 14.5L16 5.5'
      stroke='#0A090B'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

const BrowseSortButtonView: FC<Props> = ({ sort, onSelect }) => {
  const [showOptions, setShowOptions] = useState(false);

  const handleOpen = () => {
    setShowOptions(true);
  };

  const handleClose = () => {
    setShowOptions(false);
  };

  const handleSelect = (value: BrowseSort) => {
    setShowOptions(false);
    onSelect(value);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleOpen}>
        <PretendardText style={styles.buttonText} weight='bold'>
          {getBrowseSortName(sort)}
        </PretendardText>
        {showOptions ? <UpArrowIcon /> : <DownArrowIcon />}
      </TouchableOpacity>

      <Modal
        visible={showOptions}
        transparent={true}
        animationType='slide'
        onRequestClose={handleClose}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.handle}>
              <View style={styles.handleBar} />
            </View>

            <PretendardText style={styles.title} weight='bold'>
              정렬
            </PretendardText>

            <View style={styles.optionList}>
              {BROWSE_SORT_OPTIONS.map(option => {
                const isSelected = option.sort === sort;

                return (
                  <TouchableOpacity
                    key={option.sort}
                    style={styles.optionItem}
                    onPress={() => handleSelect(option.sort)}
                    activeOpacity={0.7}
                  >
                    <PretendardText
                      style={[
                        styles.optionText,
                        { color: isSelected ? '#0A090B' : '#505967' },
                      ]}
                      weight={isSelected ? 'bold' : 'medium'}
                    >
                      {option.name}
                    </PretendardText>
                    {isSelected ? <CheckIcon /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 32,
  },
  button: {
    height: '100%',
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
  },
  buttonText: {
    fontSize: 14,
    color: 'black',
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  handle: {
    alignItems: 'center',
    paddingTop: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    color: '#0A090B',
    paddingVertical: 16,
  },
  optionList: {
    flexDirection: 'column',
  },
  optionItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default observer(BrowseSortButtonView);
