import BagMemo from '@/model/bag/BagMemo';
import { FC, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgLayout,
  AcgRadius,
  AcgType,
  Spacing,
} from '@/constants/DesignTokens';

interface Props {
  bagMemo: BagMemo;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS 26 투명 헤더는 배경이 없어(고정 레이아웃 화면) 콘텐츠 상단 여백을
// 세이프에어리어 + 컴팩트 바 높이(44pt)로 직접 확보한다.
const IOS_HEADER_BAR_HEIGHT = 44;

const BagMemoInputView: FC<Props> = ({ bagMemo }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadMemo = async () => {
      await bagMemo.initialize();
      setContent(bagMemo.getMemo());
    };
    void loadMemo();
  }, [bagMemo]);

  const handlePressBack = () => {
    if (isLoading) {
      return;
    }

    router.back();
  };

  const handlePressDelete = () => {
    if (isLoading) {
      return;
    }

    bagMemo.delete();
  };

  const handlePressComplete = async () => {
    if (!content.trim() || isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      await bagMemo.confirm(content.trim());
    } catch (error) {
        console.error('메모 저장 실패:', error); // l10n-ignore: 개발자 로그
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        // 고정 레이아웃(비스크롤) 화면 — iOS는 투명 헤더 높이만큼 상단 여백을 직접 확보한다.
        IS_IOS && {
          paddingTop: insets.top + IOS_HEADER_BAR_HEIGHT + Spacing.item,
        },
      ]}
      behavior={IS_IOS ? 'padding' : 'height'}
      // iOS: Layout에서 top 세이프에어리어를 빼 이 뷰가 화면 최상단(y=0)에서 시작하므로 오프셋 불필요.
      keyboardVerticalOffset={0}
    >
      {/* LG-1: iOS만 네이티브 투명 헤더 — 기존 커스텀 헤더의 우측 액션(메모 삭제)을 그대로 옮긴다. */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: app.getL10n().t('bag.memo.title'),
          headerBackVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={handlePressBack}
              activeOpacity={0.7}
              disabled={isLoading}
              style={styles.nativeHeaderIconButton}
              accessibilityRole='button'
              accessibilityLabel={app.getL10n().t('bag.memo.back')}
            >
              <Ionicons name='chevron-back' size={24} color={Acg.ink} />
            </TouchableOpacity>
          ),
          ...(bagMemo.getMemo()
            ? {
                headerRight: () => (
                  <TouchableOpacity
                    onPress={handlePressDelete}
                    activeOpacity={0.7}
                    disabled={isLoading}
                    style={[
                      styles.nativeHeaderIconButton,
                      styles.nativeHeaderRightIconButton,
                    ]}
                    accessibilityRole='button'
                    accessibilityLabel={app.getL10n().t('bag.memo.delete')}
                  >
                    <Ionicons name='trash-outline' size={24} color='#FF3B30' />
                  </TouchableOpacity>
                ),
              }
            : {}),
        }}
      />
      {!IS_IOS && (
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={handlePressBack}
              activeOpacity={0.7}
              disabled={isLoading}
              style={styles.backButton}
              accessibilityRole='button'
              accessibilityLabel={app.getL10n().t('bag.memo.back')}
            >
              <Ionicons name='chevron-back' size={24} color={Acg.ink} />
            </TouchableOpacity>
            <PretendardText style={styles.headerTitle} weight='semibold'>
              {app.getL10n().t('bag.memo.title')}
            </PretendardText>
            {bagMemo.getMemo() && (
              <TouchableOpacity
                onPress={handlePressDelete}
                activeOpacity={0.7}
                disabled={isLoading}
                style={styles.deleteButton}
                accessibilityRole='button'
              accessibilityLabel={app.getL10n().t('bag.memo.delete')}
              >
                <Ionicons name='trash-outline' size={24} color='#FF3B30' />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      <View style={styles.content}>
        <TextInput
          style={styles.textInput}
          placeholder={app.getL10n().t('bag.memo.placeholder')}
          placeholderTextColor={Acg.textMuted}
          multiline
          textAlignVertical='top'
          value={content}
          onChangeText={setContent}
          editable={!isLoading}
        />
      </View>
      <View style={[styles.buttonContainer]}>
        <TouchableOpacity
          style={[
            styles.completeButton,
            content.trim() && !isLoading
              ? styles.completeButtonActive
              : styles.completeButtonDisabled,
          ]}
          onPress={handlePressComplete}
          disabled={!content.trim() || isLoading}
          accessibilityRole='button'
              accessibilityLabel={app.getL10n().t('bag.memo.save')}
          accessibilityState={{ disabled: !content.trim() || isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator size='small' color={Acg.ink} />
          ) : (
            <PretendardText
              weight='semibold'
              style={[
                styles.completeButtonText,
                content.trim() && !isLoading
                  ? styles.completeButtonTextActive
                  : styles.completeButtonTextDisabled,
              ]}
            >
              {app.getL10n().t('common.done')}
            </PretendardText>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Acg.bg,
  },
  header: {
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Android/Web 헤더 아이콘 전용 컨트롤 — HIG 최소 터치 타깃 44×44pt.
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  deleteButton: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerTitle: {
    ...AcgType.screenTitle,
    color: Acg.ink,
    marginLeft: 12,
  },
  // iOS 네이티브 headerRight 아이콘 버튼 — HIG 최소 터치 타깃 44×44pt.
  nativeHeaderIconButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  nativeHeaderRightIconButton: {
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    padding: AcgLayout.screenPadding,
  },
  // 지면 위 인풋이라 종이 면으로 띄운다(ACG) — 회색 채움은 지면과 붙어 입력 영역
  // 경계가 안 보였다(2026-08-04 시뮬레이터 확인).
  textInput: {
    flex: 1,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    padding: 14,
    ...AcgType.body,
    fontFamily: 'Pretendard-Regular',
    color: Acg.ink,
    minHeight: 200,
  },
  // 키보드가 올라오면 버튼 아래가 키보드 상단에 딱 붙어 눌린 것처럼 보였다
  // (2026-08-04 사용자 지적). 하단 세이프에어리어는 Layout이 이미 잡으므로 여백만 준다.
  buttonContainer: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  completeButton: {
    minHeight: 52,
    borderRadius: 26,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButtonActive: {
    backgroundColor: Acg.lime,
  },
  completeButtonDisabled: {
    backgroundColor: Acg.controlFill,
  },
  completeButtonText: {
    ...AcgType.control,
  },
  completeButtonTextActive: {
    color: Acg.ink,
  },
  completeButtonTextDisabled: {
    color: Acg.textMuted,
  },
});

export default observer(BagMemoInputView);
