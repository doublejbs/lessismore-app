import { FC, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import GroupStateView from '@/components/group/GroupStateView';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupMemberBag from '@/model/group-member-bag/GroupMemberBag';
import GroupMemberBagGearListView from './GroupMemberBagGearListView';
import GroupMemberBagSummaryView from './GroupMemberBagSummaryView';

interface Props {
  bag: GroupMemberBag;
}

const IS_IOS = Platform.OS === 'ios';
const NATIVE_HEADER_HEIGHT = 44;
const CONTENT_BOTTOM_PADDING = 40;

/**
 * 멤버 배낭 상세 (GRP-5) — **읽기 전용**이다.
 *
 * 그룹 하위의 공개 스냅샷만 그린다. 원본 배낭 편집 화면으로 가는 경로를 두지 않는다.
 * iOS는 네이티브 투명 헤더, Android는 커스텀 헤더를 쓴다(GRP-11, LG-1).
 */
const GroupMemberBagView: FC<Props> = ({ bag }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const l10n = app.getL10n();

  useFocusEffect(
    useCallback(() => {
      void bag.initialize();
    }, [bag])
  );

  const handleBack = () => {
    router.back();
  };

  const snapshot = bag.getSnapshot();

  const renderContent = () => {
    switch (true) {
      case (!bag.isInitialized() || bag.isLoading()) && !snapshot: {
        return null;
      }
      case bag.isNotMember(): {
        return (
          <GroupStateView
            title={l10n.t('group.member.notMember')}
            actionLabel={l10n.t('group.member.goBack')}
            onPress={handleBack}
          />
        );
      }
      case bag.isNotFound(): {
        return (
          <GroupStateView
            title={l10n.t('group.member.notFound')}
            actionLabel={l10n.t('group.member.goBack')}
            onPress={handleBack}
          />
        );
      }
      case !!bag.getError() && !snapshot: {
        return (
          <GroupStateView
            title={l10n.t('group.member.loadFailed')}
            actionLabel={l10n.t('common.retry')}
            onPress={() => void bag.refresh()}
          />
        );
      }
      case !!snapshot: {
        return (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              IS_IOS && { paddingTop: insets.top + NATIVE_HEADER_HEIGHT },
            ]}
            contentInsetAdjustmentBehavior='never'
            showsVerticalScrollIndicator={false}
          >
            {snapshot ? (
              <>
                <GroupMemberBagSummaryView
                  snapshot={snapshot}
                  nickname={bag.getNickname()}
                  isMine={bag.isMine()}
                />
                <GroupMemberBagGearListView snapshot={snapshot} />
              </>
            ) : null}
          </ScrollView>
        );
      }
      default: {
        return null;
      }
    }
  };

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleBack}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('common.back')}
          >
            <Ionicons name='chevron-back' size={24} color={Acg.ink} />
          </TouchableOpacity>
          <PretendardText weight='semibold' style={styles.headerTitle}>
            {bag.getNickname()}
          </PretendardText>
        </View>
      )}
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Acg.paper },
  header: {
    minHeight: 52,
    paddingHorizontal: AcgLayout.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
    backgroundColor: Acg.paper,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...AcgType.sectionTitle,
    color: Acg.ink,
    flexShrink: 1,
  },
  content: { flex: 1, paddingHorizontal: AcgLayout.screenPadding },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: CONTENT_BOTTOM_PADDING,
  },
});

export default observer(GroupMemberBagView);
