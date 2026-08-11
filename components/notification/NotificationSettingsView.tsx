import { FC, useState } from 'react';
import { View, ScrollView, StyleSheet, Switch } from 'react-native';
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
  /** 언제 어떤 알림이 오는지 한 줄(NT-6). 값은 실제 예약 시각·문구에서 가져온 사실이다. */
  description: string;
};

/**
 * 설명은 `NotificationManager`의 실제 예약 규칙을 그대로 옮긴 것이다 —
 * 패킹은 시작일 하루 전 19:00(NT-2), 사용 여부는 종료일 다음 날 21:00(NT-3),
 * 공지는 FCM 토픽 `all` 구독(NT-5). 규칙이 바뀌면 이 문구도 함께 고친다.
 */
const TOGGLE_ROWS: ToggleRow[] = [
  {
    key: 'packing',
    label: '여행 패킹 알림',
    description: '여행 시작 하루 전 저녁 7시에 패킹을 확인하라고 알려요.',
  },
  {
    key: 'useless',
    label: '사용 여부 기록 알림',
    description: '여행이 끝난 다음 날 저녁 9시에 쓴 장비를 기록하라고 알려요.',
  },
  {
    key: 'notice',
    label: '공지 알림',
    description: '새 소식과 점검 안내를 받아요.',
  },
];

/**
 * 카드 아래 안내(NT-6). 로컬 리마인더는 기기에 예약되므로 재설치·기기 변경 시 사라지고
 * (NT-4의 알려진 제약), 시스템 권한이 꺼져 있으면 앱 설정과 무관하게 알림이 오지 않는다(NT-1).
 * 둘 다 사용자가 "안 오는데?"라고 느끼는 상황이라 화면에서 미리 밝힌다.
 */
const FOOTER_NOTES: string[] = [
  '알림은 이 기기에만 예약돼요. 앱을 다시 설치하거나 기기를 바꾸면 예약이 사라질 수 있어요.',
  '알림이 오지 않으면 기기 설정에서 useless 알림 허용을 확인해 주세요.',
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

      {/* 세 줄뿐이라 화면에 다 들어오지만, 설명을 붙여 행이 두 줄이 되면서 큰 글씨(Dynamic
          Type)에서는 넘칠 수 있어 스크롤 컨테이너로 감싼다 — 들어올 때는 스크롤이 없다. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 그림자는 껍데기가 든다 — 안쪽에서 모서리를 깎으므로(overflow) 같은 뷰에 그림자를
            걸면 자기 경계에서 잘린다(장비 상세 섹션 카드와 같은 구조). */}
        <View
          style={[
            styles.cardShell,
            // LG-1: 토글 카드가 투명 헤더(상태바+44pt) 아래에서 시작하도록 여백을 준다.
            // 헤더 아래 살짝 띄우는 여백은 기존 톤(24pt)을 따른다.
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
                  {/* 라벨 + 설명 한 줄(NT-6). 어떤 알림인지 이름만으로는 알 수 없어
                      iOS 설정 관습대로 각 행에 사실을 한 줄 붙인다. */}
                  <View style={styles.rowTexts}>
                    <PretendardText weight='medium' style={styles.rowLabel}>
                      {row.label}
                    </PretendardText>
                    <PretendardText style={styles.rowDescription}>
                      {row.description}
                    </PretendardText>
                  </View>
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

        {/* 카드 밖 안내(NT-6) — 설정 값이 아니라 사실이라 카드 안에 넣지 않는다(iOS 설정 푸터). */}
        <View style={styles.footer}>
          {FOOTER_NOTES.map(note => (
            <PretendardText key={note} style={styles.footerText}>
              {note}
            </PretendardText>
          ))}
        </View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
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
  // 들여쓰기는 좌우 같은 값(카드 여백)이다 — 한쪽만 들여쓰면 카드 모서리와 만나는 지점이
  // 좌우로 달라 선이 기울어 보인다(`LiquidMetricRow`의 divider와 같은 판단).
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: LiquidLayout.cardPad,
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
  // 라벨·설명 묶음. 스위치는 폭이 고정이라 남는 폭을 이쪽이 받는다.
  rowTexts: {
    flex: 1,
    gap: 3,
  },
  rowLabel: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
  },
  rowDescription: {
    fontSize: LiquidType.caption.fontSize,
    lineHeight: LiquidType.caption.lineHeight,
    color: Liquid.inkTertiary,
  },
  // 카드와 같은 좌우 축 안쪽으로 살짝 들여 쓴다 — 카드 여백과 같은 선에 글이 서면 카드의
  // 일부처럼 보인다(iOS 설정 푸터와 같은 처리).
  footer: {
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  footerText: {
    fontSize: LiquidType.caption.fontSize,
    lineHeight: 18,
    color: Liquid.inkTertiary,
  },
});

export default NotificationSettingsView;
