import { FC } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import Gear from '@/model/gear/Gear';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  visible: boolean;
  gears: Gear[];
  onClose: () => void;
  onSelectGear: (gear: Gear) => void;
}

const GearSelectionModalView: FC<Props> = ({
  visible,
  gears,
  onClose,
  onSelectGear,
}) => {
  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name='close' size={24} color={Color.textPrimary} />
          </TouchableOpacity>
          <PretendardText weight='semibold' style={styles.headerTitle}>
            장비 선택
          </PretendardText>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.categoryListContainer}>
            <View style={styles.gearGridList}>
              {gears.map(gear => (
                <TouchableOpacity
                  key={gear.getId()}
                  style={styles.gearGridItem}
                  onPress={() => onSelectGear(gear)}
                >
                  <Image
                    source={{ uri: gear.getImageUrl?.() }}
                    style={styles.gearGridImage}
                    contentFit='cover'
                  />
                  <View style={styles.gearGridInfo}>
                    <PretendardText
                      weight='semibold'
                      style={styles.gearGridName}
                      numberOfLines={1}
                    >
                      {gear.getDisplayName()}
                    </PretendardText>
                    <PretendardText style={styles.gearGridWeight}>
                      {Number(gear.getWeight()) >= 1000
                        ? `${(Number(gear.getWeight()) / 1000).toFixed(1)}kg`
                        : `${gear.getWeight()}g`}
                    </PretendardText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.surfaceMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Color.background,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    color: Color.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  categoryListContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  gearGridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gearGridItem: {
    width: 108,
    aspectRatio: 1,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: Color.surfaceMuted,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gearGridImage: {
    width: '100%',
    height: '70%',
  },
  gearGridInfo: {
    padding: 8,
    height: '30%',
    justifyContent: 'center',
  },
  gearGridName: {
    fontSize: 12,
    color: Color.textPrimary,
    marginBottom: 2,
  },
  gearGridWeight: {
    fontSize: 10,
    color: Color.textTertiary,
  },
});

export default GearSelectionModalView;
