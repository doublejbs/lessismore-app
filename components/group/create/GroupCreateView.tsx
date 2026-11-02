import { FC, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/build/react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import AlertView from '@/components/alert/AlertView';
import LogInView from '@/components/login/LogInView';
import ToastView from '@/components/toast/ToastView';
import LoadingView from '@/components/ui/LoadingView';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import { setBagDestinationPicker } from '@/model/bag-destination/BagDestinationPickerHandoff';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import GroupCreate from '@/model/group-create/GroupCreate';
import GroupCreateField from '@/model/group-create/GroupCreateField';
import { getGroupErrorMessage } from '@/model/group-error/GroupErrorMessage';
import GroupCreateFormView from './GroupCreateFormView';

interface Props {
  groupCreate: GroupCreate;
}

const IS_IOS = Platform.OS === 'ios';

/**
 * 그룹 만들기 화면 (GRP-2). 폼 칸은 수정 화면과 같은 공용 컴포넌트
 * (`components/group/form/`)를 쓴다 — 같은 폼이 두 화면에서 갈리면 한쪽만 고쳐진다.
 * 라벨 행 우측 글자수 카운터, 단일행 입력에 lineHeight 없음, 하단 고정 라임 알약 하나.
 */
const GroupCreateView: FC<Props> = ({ groupCreate }) => {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  /**
   * 생성이 끝났는지. 상태가 아니라 ref인 이유: 생성 성공 직후 같은 틱에서 `router.replace`를
   * 부르는데, `usePreventRemove`가 보는 값은 이펙트가 다시 돌아야 갱신된다. 이펙트는 아직
   * 돌지 않았으므로 상태만 풀면 이탈 확인 알럿이 한 번 더 뜬다. ref는 콜백이 언제 만들어졌든
   * 현재 값을 읽는다.
   */
  const completedRef = useRef(false);
  const [nameFieldY, setNameFieldY] = useState(0);
  const [dateFieldY, setDateFieldY] = useState(0);
  const l10n = app.getL10n();
  const isSubmitting = groupCreate.getIsSubmitting();
  const shouldPreventRemove = groupCreate.getIsDirty() || isSubmitting;

  usePreventRemove(shouldPreventRemove, ({ data }) => {
    if (completedRef.current) {
      navigation.dispatch(data.action);

      return;
    }

    if (isSubmitting) {
      app.getToastManager()?.show({
        message: l10n.t('common.processing'),
      });

      return;
    }

    app.getAlertManager()?.show({
      message: l10n.t('group.create.discardConfirm'),
      confirmText: l10n.t('group.create.discard'),
      cancelText: l10n.t('group.create.keepWriting'),
      onConfirm: async () => {
        navigation.dispatch(data.action);
      },
    });
  });

  const handleOpenDestination = () => {
    setBagDestinationPicker({
      currentLocation: groupCreate.getDestination(),
      // 저장할 그룹이 아직 없으므로 폼에만 담는다 — 좌표는 화면 상태로만 쓰고 저장하지 않는다(GRP-2).
      onConfirm: async (location: BagLocation) => {
        groupCreate.setDestination(location);
      },
    });

    router.push('/bag-destination-picker');
  };

  const handleSubmit = async () => {
    try {
      const groupId = await groupCreate.submit();

      app.getAnalyticsManager()?.logClick('group_create', {
        has_destination: groupCreate.hasDestination(),
        from: groupCreate.getEntryPoint(),
      });
      completedRef.current = true;
      // 만들기 화면을 스택에 남기지 않는다 — 뒤로 가면 빈 폼이 아니라 목록으로 돌아가야 한다.
      router.replace({ pathname: '/group/[id]', params: { id: groupId } });
      // 초대 링크 복사를 유도하는 안내 1회(GRP-2). 상세 화면의 ToastView가 이어받아 띄운다.
      app.getToastManager()?.showLong({
        message: l10n.t('group.create.created'),
      });

      // GRP-13: 자동 연결이 안 됐어도 그룹은 남긴다 — 초대 안내 뒤에 이어서 배낭 쪽 재연결을 알린다.
      if (groupCreate.hasBagLinkFailed()) {
        app.getToastManager()?.enqueue(l10n.t('group.create.bagLinkFailed'));
      }
    } catch (error) {
      const field = groupCreate.getFirstErrorField();

      if (field === GroupCreateField.Name) {
        scrollRef.current?.scrollTo({ y: nameFieldY, animated: true });
      } else if (field === GroupCreateField.Date) {
        scrollRef.current?.scrollTo({ y: dateFieldY, animated: true });
      }

      if (!field) {
        app.getToastManager()?.show({
          message: getGroupErrorMessage(error),
        });
      }
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.select({
          ios: 'padding',
          android: 'height',
          default: undefined,
        })}
      >
        <Stack.Screen
          options={{
            headerShown: IS_IOS,
            headerTransparent: true,
            headerTitle: l10n.t('group.create.title'),
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        {!IS_IOS && (
          <View style={[styles.header, { paddingTop: insets.top }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityRole='button'
              accessibilityLabel={l10n.t('common.back')}
            >
              <Ionicons name='chevron-back' size={24} color={Acg.ink} />
            </TouchableOpacity>
            <View style={styles.headerTitle}>
              <PretendardText style={styles.title} weight='semibold'>
                {l10n.t('group.create.title')}
              </PretendardText>
            </View>
            <View style={styles.headerSpacer} />
          </View>
        )}
        {/* GRP-13: 배낭 값을 다 읽은 뒤에 폼을 그린다 — `DateRangeCalendarView`가 `initialMonth`를 마운트 때만 읽어,
            미리 채운 시작 달로 열리려면 값이 정해진 다음에 마운트돼야 한다. */}
        {groupCreate.getIsPrefilling() ? (
          <LoadingView />
        ) : (
          <GroupCreateFormView
            groupCreate={groupCreate}
            scrollRef={scrollRef}
            onNameFieldLayout={setNameFieldY}
            onDateFieldLayout={setDateFieldY}
            onOpenDestination={handleOpenDestination}
            onSubmit={() => void handleSubmit()}
          />
        )}
      </KeyboardAvoidingView>
      <LogInView logInAlertManager={app.getLogInAlertManager()!} />
      <AlertView alertManager={app.getAlertManager()!} />
      <ToastView toastManager={app.getToastManager()!} bottom={100} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  screen: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: AcgLayout.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
});

export default observer(GroupCreateView);
