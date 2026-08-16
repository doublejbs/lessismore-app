import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
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
  const [mounted, setMounted] = useState(visible);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(300));
  const pendingAction = useRef<(() => void) | null>(null);
  const insets = useSafeAreaInsets();
  const handleCloseComplete = useCallback(() => {
    setMounted(false);

    const action = pendingAction.current;
    pendingAction.current = null;

    if (action) {
      // Modal의 visible 상태가 반영된 다음 후속 시트·알럿을 열어 겹침을 피한다.
      setTimeout(action, 0);
    }
  }, []);

  const handleMenuItemPress = useCallback(
    (action: () => void) => {
      pendingAction.current = action;
      onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [visible]);

  useSheetTransition({
    visible,
    fadeAnim,
    slideAnim,
    slideOffset: 300,
    onCloseComplete: handleCloseComplete,
  });

  const shouldRender = mounted || visible;

  return (
    <Modal
      visible={shouldRender}
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
                onPress={() => handleMenuItemPress(item.onPress)}
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
