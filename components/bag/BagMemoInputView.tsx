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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

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
    loadMemo();
  }, [bagMemo]);

  const handlePressBack = () => {
    if (isLoading) return;
    router.back();
  };

  const handlePressDelete = () => {
    if (isLoading) return;
    bagMemo.delete();
  };

  const handlePressComplete = async () => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await bagMemo.confirm(content.trim());
    } catch (error) {
      console.error('메모 저장 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        // 고정 레이아웃(비스크롤) 화면 — iOS는 투명 헤더 높이만큼 상단 여백을 직접 확보한다.
        IS_IOS && { paddingTop: insets.top + IOS_HEADER_BAR_HEIGHT },
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
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          ...(bagMemo.getMemo()
            ? {
                headerRight: () => (
                  <TouchableOpacity
                    onPress={handlePressDelete}
                    activeOpacity={0.7}
                    disabled={isLoading}
                    style={styles.nativeHeaderIconButton}
                    accessibilityRole='button'
                    accessibilityLabel='메모 삭제'
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
            <TouchableOpacity onPress={handlePressBack} activeOpacity={0.7}>
              <Ionicons
                name='chevron-back'
                size={24}
                color={Color.textPrimary}
              />
            </TouchableOpacity>
            {bagMemo.getMemo() && (
              <TouchableOpacity
                onPress={handlePressDelete}
                activeOpacity={0.7}
                disabled={isLoading}
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
          placeholder='메모를 작성하세요'
          placeholderTextColor={Color.textSecondary}
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
        >
          {isLoading ? (
            <ActivityIndicator size='small' color={Color.background} />
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
              완료
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
    backgroundColor: Color.background,
    paddingHorizontal: 0,
  },
  header: {
    backgroundColor: Color.background,
    paddingVertical: 4,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // iOS 네이티브 headerRight 아이콘 버튼 — HIG 최소 터치 타깃 44×44pt.
  nativeHeaderIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  textInput: {
    flex: 1,
    borderRadius: Radius.input,
    backgroundColor: Color.surfaceMuted,
    padding: 16,
    fontSize: 16,
    minHeight: 200,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    backgroundColor: Color.background,
  },
  completeButton: {
    paddingVertical: 16,
    borderRadius: Radius.input,
    alignItems: 'center',
  },
  completeButtonActive: {
    backgroundColor: Color.chipActiveBg,
  },
  completeButtonDisabled: {
    backgroundColor: Color.borderLight,
  },
  completeButtonText: {
    fontSize: 16,
  },
  completeButtonTextActive: {
    color: Color.background,
  },
  completeButtonTextDisabled: {
    color: Color.textSecondary,
  },
});

export default observer(BagMemoInputView);
