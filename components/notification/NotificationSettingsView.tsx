import { FC, useState } from 'react';
import { View, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
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

const NotificationSettingsView: FC = () => {
  const router = useRouter();
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
    <Layout>
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePressBack} style={styles.backButton}>
          <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.titleContainer}>
        <PretendardText weight='bold' style={styles.title}>
          알림 설정
        </PretendardText>
      </View>

      <View style={styles.list}>
        {TOGGLE_ROWS.map((row, index) => (
          <View
            key={row.key}
            style={[
              styles.row,
              index === TOGGLE_ROWS.length - 1 && styles.rowLast,
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
    fontSize: 20,
  },
  list: {
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Color.borderLight,
    backgroundColor: Color.background,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 16,
    color: Color.textPrimary,
  },
});

export default NotificationSettingsView;
