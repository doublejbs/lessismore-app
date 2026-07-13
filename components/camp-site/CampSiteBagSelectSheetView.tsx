import { FC } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color } from '@/constants/DesignTokens';
import BagItem from '@/model/bag/BagItem';

interface Props {
  visible: boolean;
  bags: BagItem[];
  // 여행지로 설정할 박지 이름 — 시트 맥락(무엇을 어디에 넣는지)을 명확히 한다(CS-5).
  spotName: string;
  onClose: () => void;
  onSelect: (bag: BagItem) => void;
  onCreateNew: () => void;
}

// CS-5: 박지를 여행지로 설정할 배낭을 고르는 시트. iOS 네이티브 pageSheet 프레젠테이션.
const CampSiteBagSelectSheetView: FC<Props> = ({
  visible,
  bags,
  spotName,
  onClose,
  onSelect,
  onCreateNew,
}) => {
  const insets = useSafeAreaInsets();

  // 방금 만든/최근 수정한 배낭을 위로 — 최근 수정순(편집일 desc).
  const sortedBags = [...bags].sort(
    (a, b) => b.getEditDateValue() - a.getEditDateValue()
  );

  const handleSelect = (bag: BagItem) => {
    onSelect(bag);
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
      onDismiss={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <PretendardText style={styles.title} weight='bold'>
              배낭 선택
            </PretendardText>
            <PretendardText style={styles.subtitle} numberOfLines={1}>
              {spotName}을 여행지로 설정해요
            </PretendardText>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel='닫기'
            accessibilityRole='button'
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name='close' size={24} color={Color.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 새 배낭 만들기 — 여기로 진입해 만든 배낭에 이 박지가 여행지로 설정된다(CS-5). */}
          <TouchableOpacity
            style={styles.createRow}
            onPress={onCreateNew}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel='새 배낭 만들기'
          >
            <View style={styles.createIcon}>
              <Ionicons name='add' size={22} color={Color.background} />
            </View>
            <PretendardText style={styles.createText} weight='semibold'>
              새 배낭 만들기
            </PretendardText>
          </TouchableOpacity>

          {bags.length === 0 ? (
            <PretendardText style={styles.emptyText}>
              아직 배낭이 없어요. 새 배낭을 만들어 여행지를 설정하세요.
            </PretendardText>
          ) : (
            <>
              {/* 만들기 액션과 선택 목록을 구분하는 소제목(디자인 리뷰). */}
              <PretendardText style={styles.sectionLabel} weight='semibold'>
                내 배낭
              </PretendardText>

              {sortedBags.map(bag => {
                const locationName = bag.getLocationName();

                return (
                  <TouchableOpacity
                    key={bag.getID()}
                    style={styles.row}
                    onPress={() => handleSelect(bag)}
                    activeOpacity={0.7}
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
                      {/* 이미 여행지가 설정된 배낭 — 덮어쓰기 전에 인지하도록 표시(디자인 리뷰). */}
                      {locationName && (
                        <View style={styles.locationRow}>
                          <Ionicons
                            name='location'
                            size={12}
                            color={Color.textSecondary}
                          />
                          <PretendardText
                            style={styles.locationText}
                            numberOfLines={1}
                          >
                            {locationName}
                          </PretendardText>
                        </View>
                      )}
                    </View>
                    <Ionicons
                      name='chevron-forward'
                      size={20}
                      color={Color.iconMuted}
                    />
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: Color.background,
    paddingHorizontal: 20,
    paddingTop: 12,
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
  title: {
    fontSize: 18,
    lineHeight: 26,
    color: Color.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Color.textSecondary,
  },
  closeButton: {
    width: 44,
    height: 44,
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
  // 생성 액션은 목록과 구분되게 아래 여백을 크게 준다(디자인 리뷰).
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    marginBottom: 8,
  },
  createIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Color.chipActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  sectionLabel: {
    fontSize: 13,
    color: Color.textSecondary,
    paddingBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: Color.textSecondary,
    paddingVertical: 20,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: Color.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowName: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  rowDate: {
    fontSize: 13,
    color: Color.textSecondary,
  },
});

export default CampSiteBagSelectSheetView;
