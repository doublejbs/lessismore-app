import {
  ActivityIndicator,
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';
import useSheetTransition from '@/hooks/useSheetTransition';
import app from '@/model/app/App';

interface MenuItem {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly text: string;
  readonly onPress: () => void;
  // 있으면 항목 이름 아래 메타 한 줄(HM-8). 고르는 목록(배낭 → 그룹 연결 BD-1)에서 쓴다.
  readonly subtitle?: string;
  /**
   * 있으면 누른 뒤 **시트를 띄운 채** 이 일을 먼저 끝내고, 그다음 시트를 내리고 `onPress`를 부른다.
   * 그동안 항목 자리에 진행 표시(`preparingText`)를 두고 다른 항목·닫기를 막는다
   * (코스 GPX 내보내기 GRP-8 — 받는 동안 시트가 닫히지 않는다). 던지지 않아야 한다.
   */
  readonly prepare?: () => Promise<void>;
  readonly preparingText?: string;
}

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly menuItems: MenuItem[];
  // 있으면 항목 위에 시트 제목을 둔다(고르는 목록일 때 무엇을 고르는지).
  readonly title?: string;
  // 있으면 항목이 없을 때 이 문구만 보여준다.
  readonly emptyText?: string;
}

const BottomMenuModalView: FC<Props> = ({
  visible,
  onClose,
  menuItems,
  title,
  emptyText,
}) => {
  const [mounted, setMounted] = useState(visible);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(300));
  const pendingAction = useRef<(() => void) | null>(null);
  // `prepare`를 돌리고 있는 항목. 그동안은 시트를 닫지 않는다.
  const [preparingIndex, setPreparingIndex] = useState<number | null>(null);
  const isPreparing = preparingIndex !== null;
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
    async (item: MenuItem, index: number) => {
      if (isPreparing) {
        return;
      }

      if (item.prepare) {
        setPreparingIndex(index);

        try {
          await item.prepare();
        } finally {
          setPreparingIndex(null);
        }
      }

      pendingAction.current = item.onPress;
      onClose();
    },
    [isPreparing, onClose]
  );

  // 진행 중에는 딤 탭·뒤로 가기·`닫기`로 시트를 내리지 않는다.
  const handleClose = useCallback(() => {
    if (isPreparing) {
      return;
    }

    onClose();
  }, [isPreparing, onClose]);

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
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.modalOverlayTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {title ? (
            <PretendardText style={styles.title} weight='semibold'>
              {title}
            </PretendardText>
          ) : null}
          <View style={styles.menuSection}>
            {menuItems.length === 0 && emptyText ? (
              <PretendardText style={styles.emptyText}>
                {emptyText}
              </PretendardText>
            ) : null}
            {menuItems.map((item, index) => {
              const preparing = preparingIndex === index;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    isPreparing && !preparing && styles.disabled,
                  ]}
                  onPress={() => void handleMenuItemPress(item, index)}
                  disabled={isPreparing}
                  {...(item.subtitle
                    ? {
                        accessibilityRole: 'button' as const,
                        accessibilityLabel: `${item.text}, ${item.subtitle}`,
                      }
                    : {})}
                  {...(isPreparing
                    ? {
                        accessibilityState: { disabled: true, busy: preparing },
                      }
                    : {})}
                >
                  {preparing ? (
                    <ActivityIndicator
                      size='small'
                      color={Color.textPrimary}
                      style={styles.menuItemSpinner}
                    />
                  ) : (
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={Color.textPrimary}
                    />
                  )}
                  {preparing ? (
                    <PretendardText style={styles.menuItemText}>
                      {item.preparingText ?? item.text}
                    </PretendardText>
                  ) : item.subtitle ? (
                    <View style={styles.menuItemTextGroup}>
                      <PretendardText
                        style={styles.menuItemName}
                        weight='medium'
                        numberOfLines={2}
                      >
                        {item.text}
                      </PretendardText>
                      <PretendardText style={styles.menuItemSubtitle}>
                        {item.subtitle}
                      </PretendardText>
                    </View>
                  ) : (
                    <PretendardText style={styles.menuItemText}>
                      {item.text}
                    </PretendardText>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={[
              styles.closeSection,
              // 배낭·장비 추가 옵션 시트와 같은 하단 여백 문법을 적용한다.
              { paddingBottom: Math.max(insets.bottom - 16, 12) },
            ]}
          >
            <TouchableOpacity
              style={[styles.closeButton, isPreparing && styles.disabled]}
              onPress={handleClose}
              disabled={isPreparing}
            >
              <PretendardText weight='bold' style={styles.closeButtonText}>
                {app.getL10n().t('common.close')}
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
  // 아이콘과 같은 20pt 칸 — 진행 표시로 바뀌어도 라벨이 옆으로 밀리지 않는다.
  menuItemSpinner: {
    width: 20,
    height: 20,
  },
  disabled: {
    opacity: 0.5,
  },
  menuItemText: {
    ...AcgType.rowSubtitle,
    color: Color.textPrimary,
  },
  title: {
    ...AcgType.sectionTitle,
    color: Color.textPrimary,
    paddingHorizontal: 30,
    paddingBottom: 8,
  },
  emptyText: {
    ...AcgType.rowSubtitle,
    color: Color.textSecondary,
    paddingVertical: 20,
    textAlign: 'center',
  },
  menuItemTextGroup: {
    flex: 1,
    gap: 2,
  },
  // 고르는 목록의 행 = 이름 16 medium + 메타 14 잉크(HM-8). 기간·인원은 정보라 회색으로 두지 않는다.
  menuItemName: {
    ...AcgType.rowTitle,
    color: Color.textPrimary,
  },
  menuItemSubtitle: {
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

export default observer(BottomMenuModalView);
