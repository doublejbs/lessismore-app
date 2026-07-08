import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FC, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

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
              paddingBottom: Math.max(insets.bottom, 20),
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
                <Ionicons name={item.icon} size={20} color={Color.textPrimary} />
                <PretendardText style={styles.menuItemText}>
                  {item.text}
                </PretendardText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.closeSection}>
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
    minHeight: 229,
  },
  menuSection: {
    flex: 1,
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
    fontSize: 16,
    lineHeight: 18,
    color: Color.textPrimary,
  },
  closeSection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  closeButton: {
    width: '100%',
    backgroundColor: Color.chipActiveBg,
    borderRadius: Radius.card,
    paddingVertical: 18,
    alignItems: 'center',
  },
  closeButtonText: {
    color: Color.background,
    fontSize: 16,
  },
});

export default BottomMenuModalView;
