import { FC } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Stack, useRouter } from 'expo-router';
import PretendardText from '@/components/PretendardText';
import { Color } from '@/constants/DesignTokens';
import SharedBag from '@/model/shared-bag/SharedBag';
import Gear from '@/model/gear/Gear';

interface Props {
  sharedBag: SharedBag;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';

const SharedBagView: FC<Props> = ({ sharedBag }) => {
  const router = useRouter();

  const handlePressBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const notShared = sharedBag.isNotShared();
  const gears = sharedBag.getGears();
  // 공유 링크 콜드스타트(스택 히스토리 없음)면 시스템 back이 안 나온다 —
  // 기존 홈 이동 폴백(handlePressBack)을 headerLeft로 이관해 뒤로가기 어포던스를 유지한다.
  const needsFallbackBack = IS_IOS && !router.canGoBack();

  return (
    <View style={styles.container}>
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
          시스템에 위임한다(headerBlurEffect·headerStyle.backgroundColor 지정 금지). */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: sharedBag.getName(),
          headerBackButtonDisplayMode: 'minimal',
          ...(needsFallbackBack && {
            headerLeft: () => (
              <TouchableOpacity
                onPress={handlePressBack}
                style={styles.nativeBackButton}
                accessibilityLabel='뒤로 가기'
                accessibilityRole='button'
              >
                <Ionicons
                  name='chevron-back'
                  size={24}
                  color={Color.textPrimary}
                />
              </TouchableOpacity>
            ),
          }),
        }}
      />
      {!IS_IOS && (
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handlePressBack}
            style={styles.backButton}
            accessibilityLabel='뒤로 가기'
            accessibilityRole='button'
          >
            <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
          </TouchableOpacity>

          <PretendardText
            style={styles.headerTitle}
            weight='semibold'
            numberOfLines={1}
          >
            {sharedBag.getName()}
          </PretendardText>
        </View>
      )}

      {notShared ? (
        <View style={styles.emptyWrap}>
          <PretendardText style={styles.emptyText}>
            공유가 해제된 배낭이에요
          </PretendardText>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          // iOS: 콘텐츠가 투명 헤더 뒤로 흐르되(edge-to-edge) 첫 콘텐츠는 시스템이 자동 인셋.
          contentInsetAdjustmentBehavior='automatic'
        >
          <View style={styles.summary}>
            <PretendardText style={styles.dateRange}>
              {sharedBag.getDateRange()}
            </PretendardText>
            <PretendardText style={styles.totalWeight} weight='bold'>
              {sharedBag.getTotalWeightLabel()}
            </PretendardText>
          </View>

          <View style={styles.divider} />

          {gears.map(gear => (
            <GearRow key={gear.getId()} gear={gear} />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

interface GearRowProps {
  gear: Gear;
}

// 읽기전용 장비 행 — 탭·편집·삭제·체크 없음.
// 장비 썸네일은 표시하지 않는다(DataModel §1 장비 이미지 미제공 원칙).
const GearRow: FC<GearRowProps> = ({ gear }) => {
  const company = gear.getDisplayCompany();
  const weight = gear.getWeight();

  return (
    <View style={styles.gearRow}>
      <View style={styles.gearInfo}>
        <PretendardText
          style={styles.gearName}
          weight='semibold'
          numberOfLines={2}
        >
          {gear.getDisplayName()}
        </PretendardText>
        {company ? (
          <PretendardText style={styles.gearCompany}>{company}</PretendardText>
        ) : null}
      </View>

      {weight ? (
        <PretendardText style={styles.gearWeight} weight='medium'>
          {weight}g
        </PretendardText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: Color.background,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  // 콜드스타트 폴백 back(headerLeft) — HIG 최소 터치 타깃 44×44pt, 바 안 정렬은 시스템에 위임.
  nativeBackButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    color: Color.textPrimary,
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  summary: {
    paddingTop: 12,
    paddingBottom: 16,
    gap: 6,
  },
  dateRange: {
    fontSize: 14,
    color: Color.textSecondary,
  },
  totalWeight: {
    fontSize: 22,
    lineHeight: 28,
    color: Color.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Color.borderLight,
    marginBottom: 4,
  },
  gearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  gearInfo: {
    flex: 1,
    gap: 4,
  },
  gearName: {
    fontSize: 15,
    lineHeight: 19,
    color: Color.textPrimary,
  },
  gearCompany: {
    fontSize: 13,
    color: Color.textSecondary,
  },
  gearWeight: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 15,
    color: Color.textSecondary,
  },
});

export default observer(SharedBagView);
