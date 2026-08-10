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
import LiquidGlassCircleButton from '@/components/liquid/LiquidGlassCircleButton';
import { LIQUID_CHROME_HEIGHT } from '@/components/liquid/LiquidGlassCapsule';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidSemantic,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  bagMemo: BagMemo;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// 삭제는 아이콘 전용 컨트롤이라 터치 여유를 붙인다(유리 원 38 → HIG 44).
const DELETE_HIT_SLOP = { top: 3, bottom: 3, left: 3, right: 3 };

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
        IS_IOS && { paddingTop: insets.top + LiquidLayout.navBar },
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
                    activeOpacity={LiquidMotion.pressOpacity}
                    disabled={isLoading}
                    style={styles.nativeHeaderIconButton}
                    accessibilityRole='button'
                    accessibilityLabel='메모 삭제'
                  >
                    {/* 파괴적 액션은 의미색 — 리디자인해도 바꾸지 않는다. */}
                    <Ionicons
                      name='trash-outline'
                      size={24}
                      color={LiquidSemantic.danger}
                    />
                  </TouchableOpacity>
                ),
              }
            : {}),
        }}
      />
      {!IS_IOS && (
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <LiquidGlassCircleButton
              icon='chevron-back'
              onPress={handlePressBack}
              accessibilityLabel='뒤로가기'
            />
            {bagMemo.getMemo() && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handlePressDelete}
                activeOpacity={LiquidMotion.pressOpacity}
                disabled={isLoading}
                hitSlop={DELETE_HIT_SLOP}
                accessibilityRole='button'
                accessibilityLabel='메모 삭제'
              >
                {/* 파괴적 액션은 의미색 — 리디자인해도 바꾸지 않는다. */}
                <Ionicons
                  name='trash-outline'
                  size={22}
                  color={LiquidSemantic.danger}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      <View style={styles.content}>
        <TextInput
          style={styles.textInput}
          placeholder='메모를 작성하세요'
          placeholderTextColor={Liquid.inkMuted}
          multiline
          textAlignVertical='top'
          value={content}
          onChangeText={setContent}
          editable={!isLoading}
        />
      </View>
      <View style={styles.buttonContainer}>
        {/* 저장 중에도 라벨을 유지하고 앞에 진행 표시만 붙인다 — 라벨이 사라지면
            무엇을 기다리는지 알 수 없다. */}
        <LiquidPillButton
          label='완료'
          variant='primary'
          block
          onPress={handlePressComplete}
          disabled={!content.trim() || isLoading}
          busy={isLoading}
          leading={
            isLoading ? (
              <ActivityIndicator size='small' color={Liquid.surface} />
            ) : null
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 지면은 라우트가 넘긴 LiquidBackdrop이 깐다 — 여기 색을 두면 그 위를 덮는다.
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  header: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: LiquidLayout.screenH,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // iOS 네이티브 headerRight 아이콘 버튼 — HIG 최소 터치 타깃 44×44pt.
  nativeHeaderIconButton: {
    minWidth: LiquidLayout.touchMin,
    minHeight: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Android·Web 크롬의 삭제 버튼 — 유리 원과 같은 키로 맞춘다(같은 크롬 지오메트리 참조).
  deleteButton: {
    width: LIQUID_CHROME_HEIGHT,
    height: LIQUID_CHROME_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: LiquidLayout.screenH,
    paddingVertical: LiquidLayout.cardPad,
  },
  /**
   * 지면 위 인풋이라 종이 카드로 띄운다 — 가라앉은 채움은 지면과 붙어 입력 영역
   * 경계가 안 보인다. `PretendardText`를 쓸 수 없는 자리라 서체를 직접 건다.
   */
  textInput: {
    flex: 1,
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
    padding: LiquidLayout.cardPad,
    fontFamily: 'Pretendard-Medium',
    fontSize: LiquidType.body.fontSize,
    lineHeight: 22,
    color: Liquid.ink,
    minHeight: 200,
  },
  // 키보드가 올라오면 버튼 아래가 키보드 상단에 딱 붙어 눌린 것처럼 보였다
  // (2026-08-04 사용자 지적). 하단 세이프에어리어는 Layout이 이미 잡으므로 여백만 준다.
  buttonContainer: {
    paddingHorizontal: LiquidLayout.screenH,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
});

export default observer(BagMemoInputView);
