import { FC } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import LiquidSectionLabel from '@/components/liquid/LiquidSectionLabel';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';
import BagItem from '@/model/bag/BagItem';

interface Props {
  visible: boolean;
  bags: BagItem[];
  // 여행지로 설정할 박지 이름 — 시트 맥락(무엇을 어디에 넣는지)을 명확히 한다(CS-5).
  spotName: string;
  onClose: () => void;
  onSelect: (bag: BagItem) => void;
  onCreateNew: () => void;
  // true면 '새 배낭 만들기' 행을 렌더하지 않는다(후기 작성 CS-8에서 재사용).
  hideCreateNew?: boolean;
  // 있으면 헤더 서브텍스트를 이 값으로 대체한다(기본은 spotName 기반 문구).
  subtitleOverride?: string;
}

// 만들기 행의 잉크 원 지름. 목업 §5 FAB와 같은 표식(잉크 면 + 라임 `add`)을 행 안에 축약한 크기다.
const CREATE_MARK_SIZE = 32;

/**
 * CS-5: 박지를 여행지로 설정할 배낭을 고르는 시트 (Liquid Depth).
 *
 * iOS는 네이티브 pageSheet, Android는 RN `Modal` + 하단 시트다. 두 경우 다 **지면(canvas) 위
 * 종이 카드** 문법으로 그린다 — 배낭 목록을 고르는 같은 성격의 시트(`SearchGearAddToBagModalView`)와
 * 한 벌로 읽혀야 한다. 유리 면을 깔지 않는 이유는 그 위에 흰 카드가 얹히면 두 면이 겹쳐
 * 카드 경계가 사라지기 때문이다.
 */
const CampSiteBagSelectSheetView: FC<Props> = ({
  visible,
  bags,
  spotName,
  onClose,
  onSelect,
  onCreateNew,
  hideCreateNew = false,
  subtitleOverride,
}) => {
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';

  // 방금 만든/최근 수정한 배낭을 위로 — 최근 수정순(편집일 desc).
  const sortedBags = [...bags].sort(
    (a, b) => b.getEditDateValue() - a.getEditDateValue()
  );

  const handleSelect = (bag: BagItem) => {
    onSelect(bag);
  };

  // 시트 본문(헤더 + 목록). iOS는 pageSheet 전체, Android는 하단 바텀시트에 담는다.
  const sheetContent = (
    <>
      {/* iOS pageSheet Modal에도 OS 그래버가 없다 — 양쪽 다 핸들바를 직접 그린다. */}
      <SheetGrabberView />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <PretendardText style={styles.title} weight='bold'>
            배낭 선택
          </PretendardText>
          <PretendardText style={styles.subtitle} numberOfLines={1}>
            {subtitleOverride ?? `${spotName}을 여행지로 설정해요`}
          </PretendardText>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityLabel='닫기'
          accessibilityRole='button'
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name='close' size={24} color={Liquid.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.list, isAndroid && styles.listAndroid]}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: isAndroid ? 8 : Math.max(insets.bottom, 16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 새 배낭 만들기 — 여기로 진입해 만든 배낭에 이 박지가 여행지로 설정된다(CS-5). */}
        {!hideCreateNew && (
          <TouchableOpacity
            style={styles.createRow}
            onPress={onCreateNew}
            activeOpacity={LiquidMotion.pressOpacity}
            accessibilityRole='button'
            accessibilityLabel='새 배낭 만들기'
          >
            <View style={styles.createMark}>
              <Ionicons name='add' size={20} color={Liquid.lime} />
            </View>
            <PretendardText style={styles.createText} weight='semibold'>
              새 배낭 만들기
            </PretendardText>
            <Ionicons
              name='chevron-forward'
              size={20}
              color={Liquid.inkSubtle}
            />
          </TouchableOpacity>
        )}

        {bags.length === 0 ? (
          // 빈 상태는 사실 + 다음 걸음 두 줄(핸드오프 Interactions).
          <View style={styles.empty}>
            <PretendardText style={styles.emptyFact} weight='semibold'>
              아직 만든 배낭이 없어요
            </PretendardText>
            <PretendardText style={styles.emptyNext}>
              {hideCreateNew
                ? '배낭을 만들면 여기에서 고를 수 있어요'
                : '새 배낭을 만들어 여행지를 설정해요'}
            </PretendardText>
          </View>
        ) : (
          <>
            {/* 만들기 액션과 선택 목록을 구분하는 섹션 라벨. */}
            <LiquidSectionLabel>내 배낭</LiquidSectionLabel>

            <View style={styles.bagList}>
              {sortedBags.map(bag => {
                const locationName = bag.getLocationName();

                return (
                  <TouchableOpacity
                    key={bag.getID()}
                    style={styles.row}
                    onPress={() => handleSelect(bag)}
                    activeOpacity={LiquidMotion.pressOpacity}
                    accessibilityRole='button'
                    accessibilityLabel={`배낭 ${bag.getName()}`}
                  >
                    <View style={styles.rowText}>
                      <PretendardText
                        style={styles.rowName}
                        weight='semibold'
                        numberOfLines={1}
                      >
                        {bag.getName()}
                      </PretendardText>
                      <PretendardText style={styles.rowDate}>
                        {bag.getDate()}
                      </PretendardText>
                      {/* 이미 여행지가 설정된 배낭 — 덮어쓰기 전에 인지하도록 표시(디자인 리뷰).
                          `📍` 접두는 이 앱이 허용하는 유일한 이모지다(CLAUDE.md) — 여행지 허브
                          (DST-8)·배낭 상세와 같은 표기라 아이콘으로 갈라 두지 않는다. */}
                      {locationName && (
                        <PretendardText
                          style={styles.locationText}
                          numberOfLines={1}
                        >
                          📍 {locationName}
                        </PretendardText>
                      )}
                    </View>
                    <Ionicons
                      name='chevron-forward'
                      size={20}
                      color={Liquid.inkSubtle}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );

  // Android: presentationStyle는 iOS 전용이라 Modal이 전체화면으로 뜬다.
  // 딤 배경 + 하단 라운드 바텀시트(최대 높이)로 감싸 시트처럼 보이게 한다.
  if (isAndroid) {
    return (
      <Modal
        visible={visible}
        animationType='slide'
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.androidBackdrop}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.backdropTouchable} />
          </TouchableWithoutFeedback>
          <View style={[styles.androidSheet, { paddingBottom: insets.bottom }]}>
            {sheetContent}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
      onDismiss={onClose}
    >
      <View style={styles.sheet}>{sheetContent}</View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: Liquid.canvas,
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: 12,
  },
  // Android 딤 배경 — 하단에 시트를 정렬한다.
  androidBackdrop: {
    flex: 1,
    backgroundColor: Liquid.scrim,
    justifyContent: 'flex-end',
  },
  // 배경 탭 시 닫힘 영역(시트 위쪽 여백 전체).
  backdropTouchable: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  // Android 바텀시트 컨테이너 — 상단 라운드 + 최대 높이로 전체화면 방지.
  // 화면 폭을 꽉 채운 채 아래가 잘린 면이라 시트 모서리는 `sheetLg`다(로그인 시트와 같은 자리).
  androidSheet: {
    maxHeight: '85%',
    backgroundColor: Liquid.canvas,
    borderTopLeftRadius: LiquidRadius.sheetLg,
    borderTopRightRadius: LiquidRadius.sheetLg,
    boxShadow: LiquidShadow.sheet,
    paddingHorizontal: LiquidLayout.screenH,
  },
  // Android는 내용 높이에 맞춰 시트가 줄어들도록 flex를 강제하지 않는다.
  listAndroid: {
    flexGrow: 0,
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  // 시트 제목은 화면 대상이라 title3 — 목록 행(15)과 위계가 갈린다(sort-sheet 선례).
  title: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
  },
  subtitle: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
  },
  closeButton: {
    width: LiquidLayout.touchMin,
    height: LiquidLayout.touchMin,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: -4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 4,
  },
  // 만들기 액션도 목록과 같은 종이 카드다 — 아래 여백으로 선택 목록과 구분한다.
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: LiquidLayout.cardPad,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
    marginBottom: LiquidLayout.section,
  },
  // 잉크 면 + 라임 글리프 — 목업 §5 `배낭 추가` FAB와 같은 표식이다.
  createMark: {
    width: CREATE_MARK_SIZE,
    height: CREATE_MARK_SIZE,
    borderRadius: CREATE_MARK_SIZE / 2,
    backgroundColor: Liquid.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: {
    flex: 1,
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
  },
  empty: {
    paddingVertical: 32,
    gap: 4,
    alignItems: 'center',
  },
  emptyFact: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
  },
  emptyNext: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
  },
  bagList: {
    gap: LiquidLayout.listGap,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: LiquidLayout.cardPad,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
  },
  rowDate: {
    fontSize: LiquidType.caption.fontSize,
    lineHeight: LiquidType.caption.lineHeight,
    color: Liquid.inkMuted,
  },
  locationText: {
    marginTop: 2,
    fontSize: 12,
    color: Liquid.inkSubtle,
  },
});

export default CampSiteBagSelectSheetView;
