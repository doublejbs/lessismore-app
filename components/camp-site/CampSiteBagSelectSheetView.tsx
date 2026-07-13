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
  onClose: () => void;
  onSelect: (bag: BagItem) => void;
  onCreateNew: () => void;
}

// CS-5: 박지를 여행지로 설정할 배낭을 고르는 시트. iOS 네이티브 pageSheet 프레젠테이션.
const CampSiteBagSelectSheetView: FC<Props> = ({
  visible,
  bags,
  onClose,
  onSelect,
  onCreateNew,
}) => {
  const insets = useSafeAreaInsets();

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
          <PretendardText style={styles.title} weight='bold'>
            배낭 선택
          </PretendardText>
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

          {bags.length === 0 && (
            <PretendardText style={styles.emptyText}>
              아직 배낭이 없어요. 새 배낭을 만들어 여행지를 설정하세요.
            </PretendardText>
          )}

          {bags.map(bag => (
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
              </View>
              <Ionicons
                name='chevron-forward'
                size={20}
                color={Color.iconMuted}
              />
            </TouchableOpacity>
          ))}
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
  title: {
    fontSize: 18,
    lineHeight: 26,
    color: Color.textPrimary,
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
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
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
  emptyText: {
    fontSize: 14,
    color: Color.textSecondary,
    paddingVertical: 20,
    textAlign: 'center',
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
