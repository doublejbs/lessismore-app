import { FC, useEffect, useMemo, useState } from 'react';
import {
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (spot: CampSpot) => void;
}

// WT-2 '캠프 박지에서 선택' 소스. 활성 박지를 전량 조회해 이름·지역으로 로컬 필터한다
// (CampSpotStore 읽기 재사용, 지도 CS-1과 동일 소스). 선택 시 onSelect로 박지를 넘긴다.
const CampSpotPickerView: FC<Props> = ({ visible, onClose, onSelect }) => {
  const [spots, setSpots] = useState<CampSpot[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!visible || loaded) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      const store = app.getCampSpotStore();

      if (!store) {
        return;
      }

      setLoading(true);

      try {
        const found = await store.getActiveSpots();

        if (!cancelled) {
          setSpots(found);
          setLoaded(true);
        }
      } catch (error) {
        console.error('박지 목록 조회 실패:', error);

        if (!cancelled) {
          setSpots([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [visible, loaded]);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    if (trimmed.length === 0) {
      return spots;
    }

    return spots.filter(
      spot =>
        spot.name.toLowerCase().includes(trimmed) ||
        spot.region.toLowerCase().includes(trimmed)
    );
  }, [spots, query]);

  const handleSelect = (spot: CampSpot) => {
    setQuery('');
    onSelect(spot);
  };

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      presentationStyle='pageSheet'
      animationType='slide'
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <PretendardText style={styles.title} weight='bold'>
            캠프 박지에서 선택
          </PretendardText>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={8}
            accessibilityRole='button'
            accessibilityLabel='닫기'
          >
            <Ionicons name='close' size={24} color={Color.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name='search' size={18} color={Color.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder='박지명·지역 검색'
            placeholderTextColor={Color.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType='search'
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons
                name='close-circle'
                size={18}
                color={Color.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator size='small' color={Color.textSecondary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centerFill}>
            <PretendardText style={styles.emptyText}>
              {loaded ? '박지가 없습니다' : '박지를 불러오지 못했어요'}
            </PretendardText>
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={filtered}
            keyboardShouldPersistTaps='handled'
            keyboardDismissMode='on-drag'
            showsVerticalScrollIndicator={false}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name='location-outline'
                  size={18}
                  color={Color.textSecondary}
                />
                <View style={styles.rowTextWrap}>
                  <PretendardText style={styles.rowText} weight='medium'>
                    {item.name}
                  </PretendardText>
                  <PretendardText style={styles.rowSubtitle}>
                    {item.region}
                  </PretendardText>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  title: {
    fontSize: 17,
    color: Color.textPrimary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.input,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Pretendard-Regular',
    color: Color.textPrimary,
    padding: 0,
  },
  list: {
    flex: 1,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Color.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  rowTextWrap: {
    flex: 1,
    gap: 2,
  },
  rowText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: Color.textSecondary,
  },
});

export default observer(CampSpotPickerView);
