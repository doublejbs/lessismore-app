import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgShadow } from '@/constants/DesignTokens';
import Comment from '@/model/reply/Comment';
import Reply from '@/model/reply/Reply';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BottomMenuModalView from '../ui/BottomMenuModalView';
import StarRatingView from '../camp-site/StarRatingView';

interface Props {
  gearId: string;
  comment: Comment;
  reply: Reply;
}

// 좋아요 빨강은 의미색이라 ACG 액센트(라임)로 바꾸지 않는다.
const LIKED_COLOR = '#FF6B6B';

const ReplyItemView: FC<Props> = ({ gearId, comment, reply }) => {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const isLiked = reply.isCommentLiked(comment.id);
  const currentUserId = app.getFirebase().getUserId();
  const isMyComment = comment.authorId === currentUserId;

  const handlePress = () => {
    router.push(`/reply/${gearId}/${comment.id}`);
  };

  const handleLikePress = (e: any) => {
    e.stopPropagation();
    app.getAnalyticsManager()?.logClick('reply_like', { liked: !isLiked });
    reply.toggleLike(comment.id);
  };

  const handlePressMore = (e: any) => {
    e.stopPropagation();
    setShowMenu(true);
  };

  const handleCloseMenu = () => {
    setShowMenu(false);
  };

  const handlePressEdit = () => {
    setShowMenu(false);
    router.push(`/reply/${gearId}/${comment.id}/edit`);
  };

  const handlePressDelete = () => {
    setShowMenu(false);
    reply.showDeleteConfirm(comment.id);
  };

  const menuItems = [
    {
      icon: 'pencil' as const,
      text: '수정하기',
      onPress: handlePressEdit,
    },
    {
      icon: 'trash-outline' as const,
      text: '삭제하기',
      onPress: handlePressDelete,
    },
  ];

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <PretendardText
              weight='semibold'
              style={[styles.name, isMyComment && styles.myName]}
            >
              {comment.authorName}
            </PretendardText>
            <PretendardText style={styles.date}>
              {dayjs(comment.createdAt).format('YYYY.MM.DD')}
            </PretendardText>
          </View>
          {isMyComment && (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={handlePressMore}
            >
              <Ionicons
                name='ellipsis-horizontal'
                size={16}
                color={Acg.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
        {comment.rating !== undefined && (
          <StarRatingView rating={comment.rating} size={14} />
        )}
        <View style={styles.contentContainer}>
          <PretendardText style={styles.content}>
            {comment.content}
          </PretendardText>
          <View style={styles.likeCountContainer}>
            <TouchableOpacity
              style={styles.iconWithText}
              onPress={handleLikePress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={isLiked ? LIKED_COLOR : Acg.textSecondary}
              />
              <PretendardText
                style={[styles.likeCount, isLiked && styles.likeCountActive]}
              >
                {comment.likeCount}
              </PretendardText>
            </TouchableOpacity>
            <View style={styles.iconWithText}>
              <Ionicons
                name='chatbubble-outline'
                size={20}
                color={Acg.textSecondary}
              />
              <PretendardText style={styles.replyCount}>
                {comment.replyCount}
              </PretendardText>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <BottomMenuModalView
        visible={showMenu}
        onClose={handleCloseMenu}
        menuItems={menuItems}
      />
    </>
  );
};

const styles = StyleSheet.create({
  // 홈 탭 리스트와 같은 행 문법 — 지면 위 각진 종이 면. 3px 회색 띠로 행을 가르던
  // 방식은 지면이 생기면서 필요 없어졌다(간격이 구분을 맡는다).
  container: {
    flexDirection: 'column',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.paper,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'column',
    gap: 4,
  },
  name: {
    fontSize: 14,
    color: Acg.ink,
  },
  // 내 리뷰 표시 — 앱의 단 하나뿐인 액센트(라임)를 쓴다.
  myName: {
    color: Acg.limeText,
  },
  date: {
    fontSize: 12,
    color: Acg.textSecondary,
  },
  moreButton: {
    opacity: 0.3,
  },
  likeCountContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  iconWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contentContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  content: {
    fontSize: 15,
    lineHeight: 21,
    color: Acg.ink,
  },
  likeCount: {
    fontSize: 14,
    color: Acg.textSecondary,
  },
  likeCountActive: {
    color: LIKED_COLOR,
  },
  replyCount: {
    fontSize: 14,
    color: Acg.textSecondary,
  },
});

export default observer(ReplyItemView);
