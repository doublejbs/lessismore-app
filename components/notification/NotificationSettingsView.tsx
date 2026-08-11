import { FC, useState } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgFontSize, Color } from '@/constants/DesignTokens';
import app from '@/model/app/App';

type ToggleKey = 'packing' | 'useless' | 'notice';

type ToggleRow = {
  key: ToggleKey;
  label: string;
};

const TOGGLE_ROWS: ToggleRow[] = [
  { key: 'packing', label: '여행 패킹 알림' },
  { key: 'useless', label: '사용 여부 기록 알림' },
  { key: 'notice', label: '공지 알림' },
];

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS 네이티브 내비게이션 바 높이 — 고정(비스크롤) 상단 콘텐츠의 시작 위치 보정용.
const NATIVE_HEADER_HEIGHT = 44;
// iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼 이중 인셋을 막는다.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

const NotificationSettingsView: FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const notificationManager = app.getNotificationManager();
  const [settings, setSettings] = useState(
    () =>
      notificationManager?.getSettings() ?? {
        packing: true,
        useless: true,
        notice: true,
      }
  );

  const handlePressBack = () => {
    router.back();
  };

  const handleToggle = async (key: ToggleKey, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));

    if (!notificationManager) {
      return;
    }

    if (key === 'packing') {
      await notificationManager.setPackingEnabled(value);
    } else if (key === 'useless') {
      await notificationManager.setUselessEnabled(value);
    } else {
      await notificationManager.setNoticeEnabled(value);
    }
  };

  return (
    <Layout edges={IS_IOS ? IOS_EDGES : undefined}>
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)은 시스템에 위임하고
          (headerBlurEffect·headerStyle.backgroundColor 지정 금지), 화면 타이틀은
          네이티브 headerTitle로 통합한다(본문 타이틀 행과 중복 표시 금지). */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '알림 설정',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
        <>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handlePressBack}
              style={styles.backButton}
            >
              <Ionicons
                name='chevron-back'
                size={24}
                color={Color.textPrimary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.titleContainer}>
            <PretendardText weight='bold' style={styles.title}>
              알림 설정
            </PretendardText>
          </View>
        </>
      )}

      <View
        style={[
          styles.list,
          // LG-1: 고정(비스크롤) 화면이라 토글 리스트가 투명 헤더(상태바+44pt) 아래에서
          // 시작하도록 여백을 준다. 헤더 아래 살짝 띄우는 여백은 기존 톤(24pt)을 따른다.
          IS_IOS && {
            marginTop: insets.top + NATIVE_HEADER_HEIGHT + 24,
          },
        ]}
      >
        {TOGGLE_ROWS.map((row, index) => (
          <View
            key={row.key}
            style={[
              styles.row,
              // 첫 행에는 선을 두지 않는다 — 바로 위가 화면 제목이라 밑줄처럼 읽힌다.
              index === 0 && styles.rowFirst,
            ]}
          >
            <PretendardText weight='medium' style={styles.rowLabel}>
              {row.label}
            </PretendardText>
            <Switch
              value={settings[row.key]}
              onValueChange={value => handleToggle(row.key, value)}
              trackColor={{
                false: Color.borderLight,
                true: Color.textPrimary,
              }}
              thumbColor={Color.background}
              ios_backgroundColor={Color.borderLight}
            />
          </View>
        ))}
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  backButton: {
    paddingVertical: 8,
  },
  titleContainer: {
    paddingVertical: 24,
  },
  title: {
    fontSize: AcgFontSize.screenTitle,
    lineHeight: 30,
    color: Acg.ink,
  },
  // 정보 탭 메뉴와 같은 문법(HM-8) — 면 없이 지면에 놓고 행 사이 헤어라인으로 가른다.
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  // 첫 행에는 선을 두지 않는다 — 바로 위가 화면 제목이라 밑줄처럼 읽힌다.
  rowFirst: {
    borderTopWidth: 0,
  },
  rowLabel: {
    fontSize: AcgFontSize.rowTitle,
    color: Acg.ink,
  },
});

export default NotificationSettingsView;
