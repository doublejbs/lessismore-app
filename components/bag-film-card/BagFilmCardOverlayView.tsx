import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BagFilmCardDarkChipView from '@/components/bag-film-card/BagFilmCardDarkChipView';
import { FilmCardControlPalette } from '@/components/bag-film-card/FilmCardControlPalette';
import PretendardText from '@/components/PretendardText';
import { Radius, Spacing } from '@/constants/DesignTokens';
import app from '@/model/app/App';

/**
 * 오버레이가 그릴 칩 하나의 정보.
 *
 * 어떤 값이 선택됐는지·무엇을 고르면 되는지는 화면(BagFilmCardView)이 판단하고,
 * 이 컴포넌트는 받은 대로 그리기만 한다.
 */
export interface FilmCardChipOption {
  key: string;
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
}

interface Props {
  // 사진 위에 얹는 요소를 켜고 끄는 칩(BS-7). 선택이 아니라 **토글**이라 둘 다 켜질 수 있다.
  elementChips: readonly FilmCardChipOption[];
  ratioChips: readonly FilmCardChipOption[];
  hasPhoto: boolean;
  // 캡처·공유·저장이 도는 동안에는 모든 컨트롤을 잠근다(BS-5).
  busy: boolean;
  sharing: boolean;
  saving: boolean;
  onPressBack: () => void;
  onPressPhoto: () => void;
  onPressShare: () => void;
  onPressSave: () => void;
}

// 상·하단 컨트롤을 세이프에어리어에서 조금 더 띄우는 여백.
const EDGE_GAP = 10;
// 상단 원형 버튼 지름 — 그 자체로 44×44pt 터치 영역을 만든다(HIG).
const CIRCLE_BUTTON_SIZE = 44;
// 하단 주 액션(공유) 높이. 저장 원형 버튼도 같은 값을 써 두 컨트롤의 높이를 맞춘다.
const ACTION_HEIGHT = 52;

/**
 * 카드 프리뷰 **위에 떠 있는** 컨트롤 전부(BS-10) —
 * 뒤로가기·사진 고르기·요소/비율 칩·공유하기·갤러리 저장.
 *
 * **캡처 대상 캔버스(`cardRef`)의 형제로 렌더해야 한다.** 캔버스 안에 넣으면 저장·공유한
 * 이미지에 컨트롤이 그대로 찍힌다.
 *
 * 컨트롤을 캔버스 아래에 쌓지 않고 전부 띄우는 이유는 쌓는 만큼 프리뷰가 줄어들기
 * 때문이다(BS-10 — 컨트롤이 세로 388pt를 먹던 구조에서 9:16 캔버스가 화면 폭의 55%까지
 * 눌렸다). 인스타그램 스토리 편집기와 같은 배치다.
 */
const BagFilmCardOverlayView: FC<Props> = ({
  elementChips,
  ratioChips,
  hasPhoto,
  busy,
  sharing,
  saving,
  onPressBack,
  onPressPhoto,
  onPressShare,
  onPressSave,
}) => {
  const insets = useSafeAreaInsets();
  const photoLabel = hasPhoto
    ? app.getL10n().t('bagFilmCard.choosePhotoAgain')
    : app.getL10n().t('bagFilmCard.choosePhoto');

  return (
    // box-none: 컨트롤이 아닌 자리의 탭은 아래 캔버스(사진 다시 고르기·패킹리스트 드래그)로
    // 그대로 통과시킨다.
    <View style={StyleSheet.absoluteFill} pointerEvents='box-none'>
      <View
        style={[styles.topBar, { paddingTop: insets.top + EDGE_GAP }]}
        pointerEvents='box-none'
      >
        <TouchableOpacity
          style={styles.circleButton}
          onPress={onPressBack}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={app.getL10n().t('bagFilmCard.back')}
        >
          <Ionicons
            name='chevron-back'
            size={22}
            color={FilmCardControlPalette.foreground}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.circleButton, busy ? styles.disabled : null]}
          onPress={onPressPhoto}
          disabled={busy}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={photoLabel}
        >
          <Ionicons
            name='images-outline'
            size={20}
            color={FilmCardControlPalette.foreground}
          />
        </TouchableOpacity>
      </View>
      <View
        style={[styles.bottomBar, { paddingBottom: insets.bottom + EDGE_GAP }]}
        pointerEvents='box-none'
      >
        <View style={styles.chipRow} pointerEvents='box-none'>
          {elementChips.map(option => (
            <BagFilmCardDarkChipView
              key={option.key}
              label={option.label}
              accessibilityLabel={option.accessibilityLabel}
              selected={option.selected}
              disabled={busy}
              toggle
              onPress={option.onPress}
            />
          ))}
        </View>
        <View style={styles.chipRow} pointerEvents='box-none'>
          {ratioChips.map(option => (
            <BagFilmCardDarkChipView
              key={option.key}
              label={option.label}
              accessibilityLabel={option.accessibilityLabel}
              selected={option.selected}
              disabled={busy}
              toggle={false}
              onPress={option.onPress}
            />
          ))}
        </View>
        <View style={styles.actionRow} pointerEvents='box-none'>
          {/* 주 액션은 흰 채움 알약 하나뿐이다(HIG — 화면당 명확한 주 액션 1개). */}
          <TouchableOpacity
            style={[styles.shareButton, busy ? styles.disabled : null]}
            onPress={onPressShare}
            disabled={busy}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityLabel={app.getL10n().t('bagFilmCard.share')}
          >
            {sharing ? (
              <ActivityIndicator
                size='small'
                color={FilmCardControlPalette.selectedForeground}
              />
            ) : (
              <PretendardText style={styles.shareButtonText} weight='semibold'>
                {app.getL10n().t('bagFilmCard.share')}
              </PretendardText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, busy ? styles.disabled : null]}
            onPress={onPressSave}
            disabled={busy}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={app.getL10n().t('bagFilmCard.saveGallery')}
          >
            {saving ? (
              <ActivityIndicator
                size='small'
                color={FilmCardControlPalette.foreground}
              />
            ) : (
              <Ionicons
                name='download-outline'
                size={22}
                color={FilmCardControlPalette.foreground}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.item,
  },
  bottomBar: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.screenH,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 10,
  },
  circleButton: {
    width: CIRCLE_BUTTON_SIZE,
    height: CIRCLE_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: FilmCardControlPalette.border,
    backgroundColor: FilmCardControlPalette.background,
  },
  shareButton: {
    flex: 1,
    minHeight: ACTION_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    backgroundColor: FilmCardControlPalette.selectedBackground,
  },
  shareButtonText: {
    fontSize: 16,
    color: FilmCardControlPalette.selectedForeground,
  },
  saveButton: {
    width: ACTION_HEIGHT,
    height: ACTION_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: FilmCardControlPalette.border,
    backgroundColor: FilmCardControlPalette.background,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default observer(BagFilmCardOverlayView);
