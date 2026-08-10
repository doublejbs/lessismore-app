import { FC, useState } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import InfoSubScreenHeaderView, {
  IOS_EDGES,
  IS_IOS,
  NATIVE_HEADER_HEIGHT,
} from '@/components/info/InfoSubScreenHeaderView';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';
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
    <Layout
      edges={IS_IOS ? IOS_EDGES : undefined}
      background={<LiquidBackdrop screen='none' glowPosition='topRight' />}
    >
      <InfoSubScreenHeaderView title='알림 설정' />

      {/* 그림자는 껍데기가 든다 — 안쪽에서 모서리를 깎으므로(overflow) 같은 뷰에 그림자를
          걸면 자기 경계에서 잘린다(장비 상세 섹션 카드와 같은 구조). */}
      <View
        style={[
          styles.cardShell,
          // LG-1: 고정(비스크롤) 화면이라 토글 카드가 투명 헤더(상태바+44pt) 아래에서
          // 시작하도록 여백을 준다. 헤더 아래 살짝 띄우는 여백은 기존 톤(24pt)을 따른다.
          IS_IOS && {
            marginTop: insets.top + NATIVE_HEADER_HEIGHT + 24,
          },
        ]}
      >
        <View style={styles.cardClip}>
          {TOGGLE_ROWS.map((row, index) => (
            <View key={row.key}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.row}>
                <PretendardText weight='medium' style={styles.rowLabel}>
                  {row.label}
                </PretendardText>
                <Switch
                  value={settings[row.key]}
                  onValueChange={value => handleToggle(row.key, value)}
                  // 스위치는 별도 요소로 포커스되므로 행 라벨과 같은 문구를 직접 건다 —
                  // 없으면 VoiceOver에 "켬/끔"만 읽혀 어느 알림인지 알 수 없다.
                  accessibilityLabel={row.label}
                  trackColor={{
                    false: Liquid.surfaceSunken,
                    true: Liquid.ink,
                  }}
                  thumbColor={Liquid.surface}
                  ios_backgroundColor={Liquid.surfaceSunken}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  cardShell: {
    // Android·Web은 커스텀 헤더 행(56) 바로 아래라 카드가 헤더에 붙지 않을 만큼만 띄운다.
    // iOS는 아래 인라인 스타일이 이 값을 투명 헤더 보정값으로 덮는다.
    marginTop: 12,
    borderRadius: LiquidRadius.card,
    boxShadow: LiquidShadow.card,
  },
  cardClip: {
    borderRadius: LiquidRadius.card,
    overflow: 'hidden',
    backgroundColor: Liquid.surface,
  },
  // 목록 행이라 구분선을 라벨 시작선까지 들여쓴다 — 스펙 표(라벨 컬럼이 왼쪽 선을 만드는
  // 경우)와 달리 여기선 행마다 라벨이 곧 첫 글자다.
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: LiquidLayout.cardPad,
    backgroundColor: Liquid.hairline,
  },
  // 고정 높이를 주지 않는다 — Dynamic Type에서 라벨이 잘린다. 세로 여백으로 44pt를 만든다.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: LiquidLayout.touchMin,
    paddingVertical: LiquidLayout.cardPad,
    paddingHorizontal: LiquidLayout.cardPad,
  },
  rowLabel: {
    flex: 1,
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
  },
});

export default NotificationSettingsView;
