import { FC, useCallback, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgLayout,
  AcgType,
  Color,
  Radius,
} from '@/constants/DesignTokens';
import useSheetTransition from '@/hooks/useSheetTransition';
import TripRecordAfterAction from '@/model/trip-record/TripRecordAfterAction';
import app from '@/model/app/App';

interface Props {
  onAction: (action: TripRecordAfterAction) => void;
}

const SHEET_SLIDE_OFFSET = 320;
const BUTTON_HEIGHT = 52;

/**
 * 여행 기록 게시 후 배낭 상세 위에 뜨는 완료 카드(CM-16) — 바텀 시트 한 장.
 * 주 액션은 `사용한 장비 확인하기`(라임, 사용 기록 BD-5로 잇는다), 그 아래 `기록 보기`·`닫기`.
 * 부모는 카드가 필요할 때만 마운트하고 `onAction`을 받으면 내린다. 액션은 시트가 다 내려간 뒤
 * 부른다 — 이어지는 화면 이동이 모달 닫힘과 겹치지 않는다.
 */
const TripRecordDoneSheetView: FC<Props> = ({ onAction }) => {
  const insets = useSafeAreaInsets();
  const l10n = app.getL10n();
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(false);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(SHEET_SLIDE_OFFSET));
  const pendingAction = useRef<TripRecordAfterAction>(
    TripRecordAfterAction.Close
  );

  const handleCloseComplete = useCallback(() => {
    setClosed(true);

    const action = pendingAction.current;

    setTimeout(() => onAction(action), 0);
  }, [onAction]);

  useSheetTransition({
    visible: !closing,
    fadeAnim,
    slideAnim,
    slideOffset: SHEET_SLIDE_OFFSET,
    onCloseComplete: handleCloseComplete,
  });

  const handlePress = (action: TripRecordAfterAction) => {
    if (closing) {
      return;
    }

    pendingAction.current = action;
    setClosing(true);
  };

  return (
    <Modal
      visible={!closed}
      transparent={true}
      animationType='none'
      onRequestClose={() => handlePress(TripRecordAfterAction.Close)}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={() => handlePress(TripRecordAfterAction.Close)}
          accessible={false}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.textGroup}>
            <PretendardText
              weight='semibold'
              style={styles.title}
              accessibilityRole='header'
            >
              {l10n.t('tripRecord.done.title')}
            </PretendardText>
            <PretendardText style={styles.subtitle}>
              {l10n.t('tripRecord.done.subtitle')}
            </PretendardText>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => handlePress(TripRecordAfterAction.Useless)}
            activeOpacity={0.85}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('tripRecord.done.useless')}
          >
            <PretendardText weight='semibold' style={styles.buttonText}>
              {l10n.t('tripRecord.done.useless')}
            </PretendardText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => handlePress(TripRecordAfterAction.View)}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('tripRecord.done.view')}
          >
            <PretendardText weight='semibold' style={styles.buttonText}>
              {l10n.t('tripRecord.done.view')}
            </PretendardText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => handlePress(TripRecordAfterAction.Close)}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('common.close')}
          >
            <PretendardText weight='medium' style={styles.closeText}>
              {l10n.t('common.close')}
            </PretendardText>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Color.overlay,
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Acg.paper,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: 24,
    paddingHorizontal: AcgLayout.screenPadding,
    gap: 10,
  },
  textGroup: {
    gap: 4,
    marginBottom: 10,
  },
  title: {
    ...AcgType.sectionTitle,
    color: Acg.ink,
  },
  subtitle: {
    ...AcgType.body,
    color: Acg.textMuted,
  },
  button: {
    minHeight: BUTTON_HEIGHT,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: Acg.lime,
  },
  secondaryButton: {
    backgroundColor: Acg.controlFill,
  },
  buttonText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  closeButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    ...AcgType.control,
    color: Acg.textMuted,
  },
});

export default TripRecordDoneSheetView;
