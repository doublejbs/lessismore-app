import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { G, Path, Defs, ClipPath, Rect } from 'react-native-svg';
import PretendardText from '../PretendardText';
import BagEdit from '../../model/bag-edit/BagEdit';
import { observer } from 'mobx-react-lite';

interface Props {
  bagEdit: BagEdit;
}

const BagEditWarehouseAddMenuView: FC<Props> = ({ bagEdit }) => {
  const shouldShowAddMenu = bagEdit.isAddMenuVisible();
  const insets = useSafeAreaInsets();

  const handlePressSearch = () => {
    bagEdit.showSearch();
  };

  const handlePressWrite = () => {
    bagEdit.showCustom();
  };

  const handleCloseModal = () => {
    bagEdit.hideAddMenu();
  };

  return (
    <Modal
      visible={shouldShowAddMenu}
      transparent={true}
      onRequestClose={handleCloseModal}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleCloseModal}
      >
        <TouchableOpacity
          style={styles.modalContent}
          activeOpacity={1}
          onPress={e => e.stopPropagation()}
        >
          <View style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
            <View style={styles.container}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handlePressSearch}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                  <Svg width={20} height={20} viewBox='0 0 20 20' fill='none'>
                    <G clipPath='url(#clip0_491_9024)'>
                      <Path
                        d='M12.9167 11.6667H12.2583L12.025 11.4417C12.8417 10.4917 13.3333 9.25833 13.3333 7.91667C13.3333 4.925 10.9083 2.5 7.91667 2.5C4.925 2.5 2.5 4.925 2.5 7.91667C2.5 10.9083 4.925 13.3333 7.91667 13.3333C9.25833 13.3333 10.4917 12.8417 11.4417 12.025L11.6667 12.2583V12.9167L15.8333 17.075L17.075 15.8333L12.9167 11.6667ZM7.91667 11.6667C5.84167 11.6667 4.16667 9.99167 4.16667 7.91667C4.16667 5.84167 5.84167 4.16667 7.91667 4.16667C9.99167 4.16667 11.6667 5.84167 11.6667 7.91667C11.6667 9.99167 9.99167 11.6667 7.91667 11.6667Z'
                        fill='black'
                      />
                    </G>
                    <Defs>
                      <ClipPath id='clip0_491_9024'>
                        <Rect width={20} height={20} fill='white' />
                      </ClipPath>
                    </Defs>
                  </Svg>
                </View>
                <PretendardText style={styles.menuText}>
                  검색으로 추가하기
                </PretendardText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handlePressWrite}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                  <Svg width={20} height={20} viewBox='0 0 20 20' fill='none'>
                    <G clipPath='url(#clip0_491_9029)'>
                      <Path
                        d='M2.5 14.3751V17.5001H5.625L14.8417 8.28346L11.7167 5.15846L2.5 14.3751ZM17.2583 5.8668C17.5833 5.5418 17.5833 5.0168 17.2583 4.6918L15.3083 2.7418C14.9833 2.4168 14.4583 2.4168 14.1333 2.7418L12.6083 4.2668L15.7333 7.3918L17.2583 5.8668Z'
                        fill='black'
                      />
                    </G>
                    <Defs>
                      <ClipPath id='clip0_491_9029'>
                        <Rect width={20} height={20} fill='white' />
                      </ClipPath>
                    </Defs>
                  </Svg>
                </View>
                <PretendardText style={styles.menuText}>
                  직접 작성하기
                </PretendardText>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    justifyContent: 'flex-end',
  },
  safeArea: {
    backgroundColor: 'white',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  container: {
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  menuItem: {
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  iconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 15,
  },
});

export default observer(BagEditWarehouseAddMenuView);
