import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import BagEditWarehouseAddMenuView from './BagEditWarehouseAddMenuView';
import BagEdit from '../../model/bag-edit/BagEdit';
import { observer } from 'mobx-react-lite';

interface Props {
  bagEdit: BagEdit;
  onHideMenu: () => void;
}

const BagEditWarehouseAddView: FC<Props> = ({ bagEdit, onHideMenu }) => {
  if (!bagEdit.isAddMenuVisible()) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdrop}
        onPress={onHideMenu}
        activeOpacity={1}
      >
        <TouchableOpacity
          style={styles.menuContainer}
          activeOpacity={1}
          onPress={() => {}} // 메뉴 영역 터치 시 이벤트 전파 방지
        >
          <BagEditWarehouseAddMenuView bagEdit={bagEdit} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    // 메뉴가 터치되었을 때 backdrop이 닫히지 않도록 하는 컨테이너
  },
});

export default observer(BagEditWarehouseAddView);
