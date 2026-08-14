import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FC, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';
import useSheetTransition from '@/hooks/useSheetTransition';

interface MenuItem {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly text: string;
  readonly onPress: () => void;
}

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly menuItems: MenuItem[];
}

const BottomMenuModalView: FC<Props> = ({ visible, onClose, menuItems }) => {
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(300));
  const insets = useSafeAreaInsets();

  useSheetTransition({
    visible,
    fadeAnim,
    slideAnim,
    slideOffset: 300,
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType='none'
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.modalOverlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={Color.textPrimary}
                />
                <PretendardText style={styles.menuItemText}>
                  {item.text}
                </PretendardText>
              </TouchableOpacity>
            ))}
          </View>

          <View
            style={[
              styles.closeSection,
              // 배낭·장비 추가 옵션 시트와 같은 하단 여백 문법을 적용한다.
              { paddingBottom: Math.max(insets.bottom - 16, 12) },
            ]}
          >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <PretendardText weight='bold' style={styles.closeButtonText}>
                닫기
              </PretendardText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Color.overlay,
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: Color.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: 20,
  },
  menuSection: {
    paddingHorizontal: 12,
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 10,
  },
  menuItemText: {
    ...AcgType.rowSubtitle,
    color: Color.textPrimary,
  },
  closeSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  closeButton: {
    width: '100%',
    backgroundColor: Color.chipActiveBg,
    borderRadius: 26,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    ...AcgType.control,
    color: Color.background,
  },
});

export default BottomMenuModalView;
