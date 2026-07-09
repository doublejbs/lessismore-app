import { FC, useEffect, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import BagWeather from '@/model/bag/BagWeather';
import weatherService from '@/model/weather/WeatherService';

interface Props {
  bagWeather: BagWeather;
  visible: boolean;
  onClose: () => void;
}

// 위치 미설정 시 기본 중심(서울 시청).
const DEFAULT: Region = {
  latitude: 37.5665,
  longitude: 126.978,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const WeatherMapPickerView: FC<Props> = ({ bagWeather, visible, onClose }) => {
  const location = bagWeather.getLocation();
  const initialRegion: Region = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : DEFAULT;

  const [center, setCenter] = useState({
    latitude: initialRegion.latitude,
    longitude: initialRegion.longitude,
  });
  const [addressName, setAddressName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);

  // 지도 중심 이동 시 디바운스 역지오코딩으로 주소 미리보기.
  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    setResolving(true);
    const timer = setTimeout(async () => {
      try {
        const name = await weatherService.reverseGeocode(
          center.latitude,
          center.longitude
        );
        if (!cancelled) {
          setAddressName(name);
        }
      } catch {
        if (!cancelled) {
          setAddressName('');
        }
      } finally {
        if (!cancelled) {
          setResolving(false);
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [center.latitude, center.longitude, visible]);

  const handleConfirm = async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      const name =
        addressName ||
        (await weatherService.reverseGeocode(
          center.latitude,
          center.longitude
        ));
      await bagWeather.updateLocation({
        name,
        latitude: center.latitude,
        longitude: center.longitude,
      });
      onClose();
    } catch {
      // 저장 실패 시 모달 유지
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      onRequestClose={onClose}
      presentationStyle='fullScreen'
    >
      <View style={styles.container}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          onRegionChangeComplete={r =>
            setCenter({ latitude: r.latitude, longitude: r.longitude })
          }
        />

        {/* 중앙 고정 핀(지도를 움직여 중심을 맞춘다) */}
        <View style={styles.centerPin} pointerEvents='none'>
          <Ionicons
            name='location'
            size={40}
            color={Color.textPrimary}
            style={styles.pinIcon}
          />
        </View>

        <SafeAreaView edges={['top']} style={styles.headerWrap}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={onClose}
              hitSlop={8}
            >
              <Ionicons name='close' size={24} color={Color.textPrimary} />
            </TouchableOpacity>
            <PretendardText style={styles.headerTitle} weight='bold'>
              지도에서 위치 선택
            </PretendardText>
            <View style={styles.headerButton} />
          </View>
        </SafeAreaView>

        <SafeAreaView edges={['bottom']} style={styles.bottomWrap}>
          <View style={styles.bottomPanel}>
            <View style={styles.addressRow}>
              <Ionicons
                name='location-outline'
                size={18}
                color={Color.textPrimary}
              />
              <PretendardText
                style={styles.addressText}
                weight='medium'
                numberOfLines={2}
              >
                {resolving
                  ? '위치 확인 중…'
                  : addressName || '주소를 찾을 수 없어요'}
              </PretendardText>
            </View>
            <TouchableOpacity
              style={[styles.confirmButton, saving && styles.confirmDisabled]}
              onPress={handleConfirm}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color={Color.background} />
              ) : (
                <PretendardText style={styles.confirmText} weight='semibold'>
                  이 위치로 설정
                </PretendardText>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  centerPin: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 핀 끝(하단)이 지도 중심에 오도록 위로 들어올린다.
  pinIcon: {
    marginBottom: 40,
  },
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    margin: 12,
    borderRadius: Radius.card,
    backgroundColor: Color.background,
  },
  headerButton: {
    width: 24,
  },
  headerTitle: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  bottomWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomPanel: {
    margin: 16,
    padding: 16,
    borderRadius: Radius.modal,
    backgroundColor: Color.background,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 15,
    color: Color.textPrimary,
    lineHeight: 20,
  },
  confirmButton: {
    height: 52,
    borderRadius: Radius.input,
    backgroundColor: Color.chipActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    fontSize: 16,
    color: Color.background,
  },
});

export default WeatherMapPickerView;
