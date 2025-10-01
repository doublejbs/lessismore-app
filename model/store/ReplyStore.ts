import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  increment,
  serverTimestamp,
  runTransaction,
  DocumentSnapshot,
  DocumentReference,
} from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import Comment, {
  GearCommentSummary,
  CommentCreateRequest,
  CommentUpdateRequest,
} from '../reply/Comment';

class ReplyStore {
  public constructor(private readonly firebase: Firebase) {}

  // 댓글의 위치를 찾는 메서드 (최상위인지 부모 하위인지)
  private async findCommentLocation(
    gearId: string,
    commentId: string
  ): Promise<{ parentId?: string; commentRef: DocumentReference }> {
    const db = this.getStore();

    // 먼저 최상위 댓글에서 찾기
    const topLevelRef = doc(db, 'gear-comments', gearId, 'comments', commentId);
    const topLevelSnap = await getDoc(topLevelRef);

    if (topLevelSnap.exists()) {
      return { commentRef: topLevelRef };
    }

    // 최상위에 없으면 부모 댓글들의 하위에서 찾기
    const parentCommentsRef = collection(
      db,
      'gear-comments',
      gearId,
      'comments'
    );
    const parentCommentsSnap = await getDocs(parentCommentsRef);

    for (const parentDoc of parentCommentsSnap.docs) {
      const childRef = doc(
        db,
        'gear-comments',
        gearId,
        'comments',
        parentDoc.id,
        'comments',
        commentId
      );
      const childSnap = await getDoc(childRef);

      if (childSnap.exists()) {
        return { parentId: parentDoc.id, commentRef: childRef };
      }
    }

    throw new Error('댓글을 찾을 수 없습니다.');
  }

  // 장비 댓글 요약 정보 조회
  public async getGearCommentSummary(
    gearId: string
  ): Promise<GearCommentSummary | null> {
    const docRef = doc(this.getStore(), 'gear-comments', gearId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        gearId: data.gearId,
        totalCount: data.totalCount,
        parentCount: data.parentCount,
        lastCommentAt: data.lastCommentAt.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    }

    return null;
  }

  // 최상위 댓글 목록 조회 (페이지네이션)
  public async getParentComments(
    gearId: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot
  ): Promise<{
    comments: Comment[];
    hasMore: boolean;
    lastDoc?: DocumentSnapshot;
  }> {
    const commentsRef = collection(
      this.getStore(),
      'gear-comments',
      gearId,
      'comments'
    );
    let q = query(
      commentsRef,
      where('parentId', '==', null),
      orderBy('createdAt', 'desc'),
      limit(pageSize + 1)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const comments: Comment[] = [];
    const docs = snapshot.docs;
    const hasMore = docs.length > pageSize;

    const commentsToProcess = hasMore ? docs.slice(0, -1) : docs;

    commentsToProcess.forEach(doc => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        content: data.content,
        authorId: data.authorId,
        authorName: data.authorName,
        authorProfileUrl: data.authorProfileUrl,
        parentId: data.parentId,
        depth: data.depth,
        isDeleted: data.isDeleted,
        likeCount: data.likeCount,
        replyCount: data.replyCount,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        deletedAt: data.deletedAt?.toDate(),
      });
    });

    return {
      comments,
      hasMore,
      lastDoc: hasMore ? docs[docs.length - 2] : undefined,
    } as {
      comments: Comment[];
      hasMore: boolean;
      lastDoc?: DocumentSnapshot;
    };
  }

  // 답글 목록 조회
  public async getReplies(
    gearId: string,
    parentId: string
  ): Promise<Comment[]> {
    const commentsRef = collection(
      this.getStore(),
      'gear-comments',
      gearId,
      'comments',
      parentId,
      'comments'
    );
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const snapshot = await getDocs(q);
    const replies: Comment[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      replies.push({
        id: doc.id,
        content: data.content,
        authorId: data.authorId,
        authorName: data.authorName,
        authorProfileUrl: data.authorProfileUrl,
        parentId: data.parentId,
        depth: data.depth,
        isDeleted: data.isDeleted,
        likeCount: data.likeCount,
        replyCount: data.replyCount,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        deletedAt: data.deletedAt?.toDate(),
      });
    });

    return replies;
  }

  // 댓글 작성
  public async createComment(
    gearId: string,
    authorId: string,
    authorName: string,
    request: CommentCreateRequest,
    authorProfileUrl?: string
  ): Promise<string> {
    const db = this.getStore();

    return await runTransaction(db, async transaction => {
      const gearCommentRef = doc(db, 'gear-comments', gearId);
      const gearCommentSnap = await transaction.get(gearCommentRef);

      // 부모 댓글이 있는 경우 검증
      let parentComment: Comment | null = null;
      let depth = 0;

      if (request.parentId) {
        const parentRef = doc(
          db,
          'gear-comments',
          gearId,
          'comments',
          request.parentId
        );
        const parentSnap = await transaction.get(parentRef);

        if (!parentSnap.exists()) {
          throw new Error('부모 댓글을 찾을 수 없습니다.');
        }

        const parentData = parentSnap.data();
        parentComment = {
          id: parentSnap.id,
          content: parentData.content,
          authorId: parentData.authorId,
          authorName: parentData.authorName,
          authorProfileUrl: parentData.authorProfileUrl,
          parentId: parentData.parentId,
          depth: parentData.depth,
          isDeleted: parentData.isDeleted,
          likeCount: parentData.likeCount,
          replyCount: parentData.replyCount,
          createdAt: parentData.createdAt.toDate(),
          updatedAt: parentData.updatedAt.toDate(),
          deletedAt: parentData.deletedAt?.toDate(),
        };

        depth = parentComment.depth + 1;

        // 최대 깊이 제한 (예: 2단계까지만)
        if (depth > 2) {
          throw new Error('답글은 2단계까지만 가능합니다.');
        }
      }

      // 새 댓글 문서 생성 - 부모 댓글이 있으면 부모 하위에, 없으면 최상위에
      let newCommentRef: DocumentReference;
      if (request.parentId) {
        // 부모 댓글 하위에 생성
        const commentsRef = collection(
          db,
          'gear-comments',
          gearId,
          'comments',
          request.parentId,
          'comments'
        );
        newCommentRef = doc(commentsRef);
      } else {
        // 최상위 댓글
        const commentsRef = collection(db, 'gear-comments', gearId, 'comments');
        newCommentRef = doc(commentsRef);
      }

      const now = serverTimestamp();
      const commentData = {
        id: newCommentRef.id,
        content: request.content,
        authorId,
        authorName,
        authorProfileUrl: authorProfileUrl || null,
        parentId: request.parentId || null,
        depth,
        isDeleted: false,
        likeCount: 0,
        replyCount: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      transaction.set(newCommentRef, commentData);

      // 장비 댓글 요약 정보 업데이트
      if (gearCommentSnap.exists()) {
        const updates: any = {
          totalCount: increment(1),
          lastCommentAt: now,
          updatedAt: now,
        };

        if (!request.parentId) {
          updates.parentCount = increment(1);
        }

        transaction.update(gearCommentRef, updates);
      } else {
        // 첫 댓글인 경우
        transaction.set(gearCommentRef, {
          gearId,
          totalCount: 1,
          parentCount: request.parentId ? 0 : 1,
          lastCommentAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      // 부모 댓글의 답글 수 증가
      if (parentComment) {
        const parentRef = doc(
          db,
          'gear-comments',
          gearId,
          'comments',
          request.parentId!
        );
        transaction.update(parentRef, {
          replyCount: increment(1),
          updatedAt: now,
        });
      }

      return newCommentRef.id;
    });
  }

  // 댓글 수정
  public async updateComment(
    gearId: string,
    commentId: string,
    authorId: string,
    request: CommentUpdateRequest
  ): Promise<void> {
    const { commentRef } = await this.findCommentLocation(gearId, commentId);
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      throw new Error('댓글을 찾을 수 없습니다.');
    }

    const commentData = commentSnap.data() as any;
    if (commentData.authorId !== authorId) {
      throw new Error('본인의 댓글만 수정할 수 있습니다.');
    }

    if (commentData.isDeleted) {
      throw new Error('삭제된 댓글은 수정할 수 없습니다.');
    }

    await updateDoc(commentRef, {
      content: request.content,
      updatedAt: serverTimestamp(),
    });
  }

  // 댓글 삭제
  public async deleteComment(
    gearId: string,
    commentId: string,
    authorId: string
  ): Promise<void> {
    const db = this.getStore();

    await runTransaction(db, async transaction => {
      const { parentId, commentRef } = await this.findCommentLocation(
        gearId,
        commentId
      );
      const commentSnap = await transaction.get(commentRef);

      if (!commentSnap.exists()) {
        throw new Error('댓글을 찾을 수 없습니다.');
      }

      const commentData = commentSnap.data() as any;
      if (commentData.authorId !== authorId) {
        throw new Error('본인의 댓글만 삭제할 수 있습니다.');
      }

      if (commentData.isDeleted) {
        throw new Error('이미 삭제된 댓글입니다.');
      }

      const now = serverTimestamp();
      const hasReplies = commentData.replyCount > 0;

      if (hasReplies) {
        // 답글이 있으면 논리적 삭제
        transaction.update(commentRef, {
          content: '[삭제된 댓글입니다]',
          isDeleted: true,
          deletedAt: now,
          updatedAt: now,
        });
      } else {
        // 답글이 없으면 물리적 삭제
        transaction.delete(commentRef);
      }

      // 장비 댓글 요약 정보 업데이트
      const gearCommentRef = doc(db, 'gear-comments', gearId);
      const updates: any = {
        totalCount: increment(-1),
        updatedAt: now,
      };

      if (!parentId) {
        updates.parentCount = increment(-1);
      }

      transaction.update(gearCommentRef, updates);

      // 부모 댓글의 답글 수 감소
      if (parentId) {
        const parentRef = doc(
          db,
          'gear-comments',
          gearId,
          'comments',
          parentId
        );
        transaction.update(parentRef, {
          replyCount: increment(-1),
          updatedAt: now,
        });
      }
    });
  }

  // 댓글 좋아요 토글
  public async toggleCommentLike(
    gearId: string,
    commentId: string,
    userId: string
  ): Promise<boolean> {
    const db = this.getStore();

    return await runTransaction(db, async transaction => {
      const likeId = `${userId}_${commentId}`;
      const likeRef = doc(db, 'comment-likes', likeId);
      const { commentRef } = await this.findCommentLocation(gearId, commentId);

      const [likeSnap, commentSnap] = await Promise.all([
        transaction.get(likeRef),
        transaction.get(commentRef),
      ]);

      if (!commentSnap.exists()) {
        throw new Error('댓글을 찾을 수 없습니다.');
      }

      const now = serverTimestamp();
      const isLiked = likeSnap.exists();

      if (isLiked) {
        // 좋아요 취소
        transaction.delete(likeRef);
        transaction.update(commentRef, {
          likeCount: increment(-1),
          updatedAt: now,
        });
        return false;
      } else {
        // 좋아요 추가
        transaction.set(likeRef, {
          userId,
          commentId,
          gearId,
          createdAt: now,
        });
        transaction.update(commentRef, {
          likeCount: increment(1),
          updatedAt: now,
        });
        return true;
      }
    });
  }

  // 사용자가 댓글에 좋아요를 눌렀는지 확인
  public async isCommentLiked(
    commentId: string,
    userId: string
  ): Promise<boolean> {
    const likeId = `${userId}_${commentId}`;
    const likeRef = doc(this.getStore(), 'comment-likes', likeId);
    const likeSnap = await getDoc(likeRef);

    return likeSnap.exists();
  }

  // 사용자가 좋아요한 댓글 목록 조회
  public async getUserLikedComments(
    userId: string,
    pageSize: number = 20
  ): Promise<string[]> {
    const likesRef = collection(this.getStore(), 'comment-likes');
    const q = query(
      likesRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    const snapshot = await getDocs(q);
    const commentIds: string[] = [];

    snapshot.forEach(doc => {
      commentIds.push(doc.data().commentId);
    });

    return commentIds;
  }

  // 가장 최근 댓글 하나 조회
  public async getLatestComment(gearId: string): Promise<Comment | null> {
    const commentsRef = collection(
      this.getStore(),
      'gear-comments',
      gearId,
      'comments'
    );
    const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(1));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      content: data.content,
      authorId: data.authorId,
      authorName: data.authorName,
      authorProfileUrl: data.authorProfileUrl,
      parentId: data.parentId,
      depth: data.depth,
      isDeleted: data.isDeleted,
      likeCount: data.likeCount,
      replyCount: data.replyCount,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      deletedAt: data.deletedAt?.toDate(),
    };
  }

  private getStore() {
    return this.firebase.getStore();
  }
}

export default ReplyStore;
