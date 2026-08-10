import ReplyEditView from '@/components/reply/ReplyEditView';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import { Liquid } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import Comment from '@/model/reply/Comment';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스). 네이티브 헤더가 상단을 덮으므로
// top 세이프에어리어를 빼 이중 인셋을 막는다(콘텐츠 여백은 ReplyEditView가 처리).
const IS_IOS = Platform.OS === 'ios';
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

const ReplyEdit = () => {
  const { id, commentId } = useLocalSearchParams<{
    id: string;
    commentId: string;
  }>();
  const [comment, setComment] = useState<Comment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadComment = async () => {
      try {
        const loaded = await app.getReplyStore()?.getComment(id, commentId);

        if (loaded) {
          setComment(loaded);
        }
      } catch (error) {
        console.error('댓글 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadComment();
  }, [id, commentId]);

  if (isLoading || comment === null) {
    return (
      <Layout
        paddingHorizontal={0}
        edges={IS_IOS ? IOS_EDGES : undefined}
        // 지형 없이 지면 + 우상단 라임 글로우 — 입력 화면이라 산세를 깔지 않는다(목록과 같은 판단).
        background={<LiquidBackdrop screen='none' glowPosition='topRight' />}
      >
        {/* 로딩 중에도 네이티브 헤더(back)를 미리 띄워 로드 완료 시 헤더가 튀지 않게 한다. */}
        <Stack.Screen
          options={{
            headerShown: IS_IOS,
            headerTransparent: true,
            headerTitle: '',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={Liquid.inkMuted} />
        </View>
      </Layout>
    );
  }

  // 최상위 댓글(=리뷰)만 별점을 편집한다. 답글은 글만 수정한다.
  const isTopLevel = comment.parentId == null;

  return (
    <Layout
      paddingHorizontal={0}
      edges={IS_IOS ? IOS_EDGES : undefined}
      // 지형 없이 지면 + 우상단 라임 글로우 — 입력 화면이라 산세를 깔지 않는다(목록과 같은 판단).
      background={<LiquidBackdrop screen='none' glowPosition='topRight' />}
    >
      <ReplyEditView
        gearId={id}
        commentId={commentId}
        initialContent={comment.content}
        isTopLevel={isTopLevel}
        initialRating={comment.rating ?? 0}
      />
    </Layout>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReplyEdit;
