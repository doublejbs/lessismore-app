import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  runTransaction,
} from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import CommunityComment from '../community/CommunityComment';
import CommunityCommentDeletedReason from '../community/CommunityCommentDeletedReason';
import CommunityContentStatus from '../community/CommunityContentStatus';
import CommunityError from '../community/CommunityError';
import CommunityFeedFilter from '../community/CommunityFeedFilter';
import {
  CommunityCommentData,
  CommunityLikeData,
  CommunityPoll,
  CommunityPollInput,
  CommunityPollInputOption,
  CommunityPollVoteData,
  CommunityPostCreateInput,
  CommunityPostData,
  CommunityPostImage,
  CommunityPostPatch,
  CommunityReportInput,
  toDate,
} from '../community/CommunityData';
import CommunityPost from '../community/CommunityPost';
import CommunityPostType from '../community/CommunityPostType';
import CommunityReportStatus from '../community/CommunityReportStatus';
import CommunityReportTargetType from '../community/CommunityReportTargetType';
import CommunityValidator from '../community/CommunityValidator';
import CommunityValidationError from '../community/CommunityValidationError';

const PAGE_SIZE = 20;

class CommunityStore {
  public constructor(private readonly firebase: Firebase) {}

  public createPostId() {
    return doc(collection(this.getStore(), 'community-posts')).id;
  }

  public async getFeedPage(
    filter: CommunityFeedFilter,
    cursor: QueryDocumentSnapshot | null,
    pageSize: number = PAGE_SIZE
  ): Promise<{
    posts: CommunityPost[];
    cursor: QueryDocumentSnapshot | null;
    hasMore: boolean;
  }> {
    const postsRef = collection(this.getStore(), 'community-posts');
    const constraints = [
      where('status', '==', CommunityContentStatus.Published),
      ...(filter === CommunityFeedFilter.All
        ? []
        : [where('type', '==', filter)]),
      orderBy('createdAt', 'desc'),
      firestoreLimit(pageSize + 1),
    ];
    let feedQuery = query(postsRef, ...constraints);

    if (cursor) {
      feedQuery = query(feedQuery, startAfter(cursor));
    }

    const snapshot = await getDocs(feedQuery);
    const hasMore = snapshot.docs.length > pageSize;
    const visibleDocs = hasMore
      ? snapshot.docs.slice(0, pageSize)
      : snapshot.docs;

    return {
      posts: visibleDocs.map(item =>
        CommunityPost.from(this.toPostData(item.id, item.data()))
      ),
      cursor: hasMore ? visibleDocs[visibleDocs.length - 1] : null,
      hasMore,
    };
  }

  public async getPost(postId: string): Promise<CommunityPost | null> {
    const snapshot = await getDoc(
      doc(this.getStore(), 'community-posts', postId)
    );

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();

    if (data.status !== CommunityContentStatus.Published) {
      return null;
    }

    return CommunityPost.from(this.toPostData(snapshot.id, data));
  }

  public async createPost(input: CommunityPostCreateInput): Promise<string>;

  public async createPost(
    postId: string,
    input: CommunityPostCreateInput
  ): Promise<string>;

  public async createPost(
    first: string | CommunityPostCreateInput,
    second?: CommunityPostCreateInput
  ): Promise<string> {
    const userId = this.requireUserId();
    const input = typeof first === 'string' ? second : first;

    if (!input) {
      throw new CommunityError(CommunityValidationError.PostNotFound);
    }

    CommunityValidator.validatePost(input);
    const postId =
      typeof first === 'string' ? first : first.postId ?? this.createPostId();

    const postData: Record<string, unknown> = {
      type: input.type,
      status: CommunityContentStatus.Published,
      authorId: userId,
      authorName: this.firebase.getNickname(),
      title: input.title.trim(),
      body: input.body.trim(),
      images: input.images.map(image => ({ ...image })),
      likeCount: 0,
      commentCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (input.type === CommunityPostType.BagReview && input.bagSnapshot) {
      postData.bagSnapshot = this.copyBagSnapshot(input.bagSnapshot);
    }

    if (input.type === CommunityPostType.Poll && input.poll) {
      postData.poll = this.toPollData(input.poll);
    }

    await setDoc(
      doc(this.getStore(), 'community-posts', postId),
      postData
    );

    return postId;
  }

  public async updatePost(postId: string, patch: CommunityPostPatch) {
    const userId = this.requireUserId();
    const postRef = doc(this.getStore(), 'community-posts', postId);

    await runTransaction(this.getStore(), async transaction => {
      const snapshot = await transaction.get(postRef);

      if (!snapshot.exists()) {
        throw new CommunityError(CommunityValidationError.PostNotFound);
      }

      const data = snapshot.data();
      this.assertAuthor(data.authorId, userId);

      const type = data.type as CommunityPostType;
      const poll = this.toPoll(data.poll);
      const hasVote = (poll?.totalVoteCount ?? 0) > 0;
      const expiresAtChanged =
        patch.poll !== undefined && 'expiresAt' in patch.poll;

      if (
        type === CommunityPostType.Poll &&
        hasVote &&
        (patch.title !== undefined ||
          patch.poll?.options !== undefined ||
          expiresAtChanged)
      ) {
        throw new CommunityError(CommunityValidationError.PollLocked);
      }

      if (patch.title !== undefined) {
        CommunityValidator.validateTitle(patch.title);
      }

      if (patch.body !== undefined) {
        CommunityValidator.validateBody(type, patch.body);
      }

      if (patch.images !== undefined) {
        CommunityValidator.validateImages(patch.images);
      }

      const updates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };

      if (patch.title !== undefined) {
        updates.title = patch.title.trim();
      }

      if (patch.body !== undefined) {
        updates.body = patch.body.trim();
      }

      if (patch.images !== undefined) {
        updates.images = patch.images.map(image => ({ ...image }));
      }

      if (patch.bagSnapshot !== undefined) {
        updates.bagSnapshot = this.copyBagSnapshot(patch.bagSnapshot);
      }

      if (patch.poll !== undefined && poll) {
        if (patch.poll.options !== undefined) {
          CommunityValidator.validatePollOptions(patch.poll.options);
        }

        const options = patch.poll.options
          ? this.toPollOptions(patch.poll.options)
          : poll.options;
        const nextPoll: Record<string, unknown> = {
          options,
          totalVoteCount: poll.totalVoteCount,
        };

        if (patch.poll.expiresAt) {
          nextPoll.expiresAt = patch.poll.expiresAt;
        }

        updates.poll = nextPoll;
      }

      transaction.update(postRef, updates);
    });
  }

  public async deletePost(postId: string) {
    const userId = this.requireUserId();
    const postRef = doc(this.getStore(), 'community-posts', postId);

    await runTransaction(this.getStore(), async transaction => {
      const snapshot = await transaction.get(postRef);

      if (!snapshot.exists()) {
        throw new CommunityError(CommunityValidationError.PostNotFound);
      }

      this.assertAuthor(snapshot.data().authorId, userId);
      transaction.update(postRef, {
        status: CommunityContentStatus.Deleted,
        updatedAt: serverTimestamp(),
      });
      // CM-9·CM-12: 댓글·좋아요·투표·Storage 연쇄 정리는 별도 작업에서 처리한다.
    });
  }

  public async getCommentsPage(
    postId: string,
    cursor: QueryDocumentSnapshot | null,
    pageSize: number = PAGE_SIZE
  ): Promise<{
    comments: CommunityComment[];
    cursor: QueryDocumentSnapshot | null;
    hasMore: boolean;
  }> {
    const commentsRef = collection(
      this.getStore(),
      'community-posts',
      postId,
      'comments'
    );
    let commentsQuery = query(
      commentsRef,
      where('status', 'in', [
        CommunityContentStatus.Published,
        CommunityContentStatus.Deleted,
      ]),
      orderBy('createdAt', 'asc'),
      firestoreLimit(pageSize + 1)
    );

    if (cursor) {
      commentsQuery = query(commentsQuery, startAfter(cursor));
    }

    const snapshot = await getDocs(commentsQuery);
    const hasMore = snapshot.docs.length > pageSize;
    const visibleDocs = hasMore
      ? snapshot.docs.slice(0, pageSize)
      : snapshot.docs;

    return {
      comments: visibleDocs.map(item =>
        CommunityComment.from(this.toCommentData(item.id, item.data()))
      ),
      cursor: hasMore ? visibleDocs[visibleDocs.length - 1] : null,
      hasMore,
    };
  }

  public async createComment(
    postId: string,
    body: string,
    parent?: {
      parentId: string;
      mentionedUserId: string;
      mentionedUserName: string;
    }
  ): Promise<string> {
    const userId = this.requireUserId();
    CommunityValidator.validateComment(body);
    const postRef = doc(this.getStore(), 'community-posts', postId);

    return await runTransaction(this.getStore(), async transaction => {
      const postSnapshot = await transaction.get(postRef);

      if (
        !postSnapshot.exists() ||
        postSnapshot.data().status !== CommunityContentStatus.Published
      ) {
        throw new CommunityError(CommunityValidationError.PostNotFound);
      }

      let parentId: string | undefined;

      if (parent) {
        const parentRef = doc(
          this.getStore(),
          'community-posts',
          postId,
          'comments',
          parent.parentId
        );
        const parentSnapshot = await transaction.get(parentRef);

        if (!parentSnapshot.exists()) {
          throw new CommunityError(CommunityValidationError.CommentNotFound);
        }

        const parentData = parentSnapshot.data();
        parentId = parentData.parentId || parentSnapshot.id;
      }

      const parentInput = parent;

      const commentRef = doc(
        collection(
          this.getStore(),
          'community-posts',
          postId,
          'comments'
        )
      );
      const commentData: Record<string, unknown> = {
        status: CommunityContentStatus.Published,
        authorId: userId,
        authorName: this.firebase.getNickname(),
        body: body.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (parentId && parentInput) {
        commentData.parentId = parentId;
        commentData.mentionedUserId = parentInput.mentionedUserId;
        commentData.mentionedUserName = parentInput.mentionedUserName;
      }

      transaction.set(commentRef, commentData);
      const currentCount = postSnapshot.data().commentCount ?? 0;
      transaction.update(postRef, {
        commentCount: Math.max(0, currentCount) + 1,
        updatedAt: serverTimestamp(),
      });

      return commentRef.id;
    });
  }

  public async updateComment(postId: string, commentId: string, body: string) {
    const userId = this.requireUserId();
    CommunityValidator.validateComment(body);
    const commentRef = this.commentRef(postId, commentId);

    await runTransaction(this.getStore(), async transaction => {
      const snapshot = await transaction.get(commentRef);

      if (!snapshot.exists()) {
        throw new CommunityError(CommunityValidationError.CommentNotFound);
      }

      const data = snapshot.data();
      this.assertAuthor(data.authorId, userId);

      if (data.status !== CommunityContentStatus.Published) {
        throw new CommunityError(CommunityValidationError.Forbidden);
      }

      transaction.update(commentRef, {
        body: body.trim(),
        updatedAt: serverTimestamp(),
      });
    });
  }

  public async deleteComment(postId: string, commentId: string) {
    const userId = this.requireUserId();
    const commentsRef = collection(
      this.getStore(),
      'community-posts',
      postId,
      'comments'
    );
    const replies = await getDocs(
      query(
        commentsRef,
        where('parentId', '==', commentId),
        firestoreLimit(1)
      )
    );
    const commentRef = doc(commentsRef, commentId);
    const postRef = doc(this.getStore(), 'community-posts', postId);

    await runTransaction(this.getStore(), async transaction => {
      const postSnapshot = await transaction.get(postRef);
      const commentSnapshot = await transaction.get(commentRef);

      if (!postSnapshot.exists()) {
        throw new CommunityError(CommunityValidationError.PostNotFound);
      }

      if (!commentSnapshot.exists()) {
        throw new CommunityError(CommunityValidationError.CommentNotFound);
      }

      const commentData = commentSnapshot.data();
      this.assertAuthor(commentData.authorId, userId);

      if (commentData.status === CommunityContentStatus.Deleted) {
        throw new CommunityError(CommunityValidationError.Forbidden);
      }

      const currentCount = postSnapshot.data().commentCount ?? 0;

      if (replies.empty) {
        transaction.delete(commentRef);
      } else {
        transaction.update(commentRef, {
          status: CommunityContentStatus.Deleted,
          deletedReason: CommunityCommentDeletedReason.Author,
          body: '',
          authorName: '',
          authorId: '',
          updatedAt: serverTimestamp(),
        });
      }

      transaction.update(postRef, {
        commentCount: Math.max(0, currentCount - 1),
        updatedAt: serverTimestamp(),
      });
    });
  }

  public async toggleLike(postId: string): Promise<boolean> {
    const userId = this.requireUserId();
    const postRef = doc(this.getStore(), 'community-posts', postId);
    const likeRef = doc(
      this.getStore(),
      'community-post-likes',
      `${userId}_${postId}`
    );

    return await runTransaction(this.getStore(), async transaction => {
      const postSnapshot = await transaction.get(postRef);
      const likeSnapshot = await transaction.get(likeRef);

      if (
        !postSnapshot.exists() ||
        postSnapshot.data().status !== CommunityContentStatus.Published
      ) {
        throw new CommunityError(CommunityValidationError.PostNotFound);
      }

      const currentCount = postSnapshot.data().likeCount ?? 0;

      if (likeSnapshot.exists()) {
        transaction.delete(likeRef);
        transaction.update(postRef, {
          likeCount: Math.max(0, currentCount - 1),
        });

        return false;
      }

      const likeData: CommunityLikeData = {
        userId,
        postId,
        createdAt: new Date(),
      };
      transaction.set(likeRef, {
        ...likeData,
        createdAt: serverTimestamp(),
      });
      transaction.update(postRef, {
        likeCount: Math.max(0, currentCount) + 1,
      });

      return true;
    });
  }

  public async isLiked(postId: string) {
    const userId = this.firebase.getUserId();

    if (!userId) {
      return false;
    }

    const snapshot = await getDoc(
      doc(
        this.getStore(),
        'community-post-likes',
        `${userId}_${postId}`
      )
    );

    return snapshot.exists();
  }

  public async getLikedPostIds(postIds: string[]) {
    const userId = this.firebase.getUserId();

    if (!userId || postIds.length === 0) {
      return [];
    }

    const snapshots = await Promise.all(
      postIds.map(postId =>
        getDoc(
          doc(
            this.getStore(),
            'community-post-likes',
            `${userId}_${postId}`
          )
        )
      )
    );

    return postIds.filter((_, index) => snapshots[index].exists());
  }

  public async vote(postId: string, optionId: string) {
    const userId = this.requireUserId();
    const postRef = doc(this.getStore(), 'community-posts', postId);
    const voteRef = doc(
      this.getStore(),
      'community-poll-votes',
      `${postId}_${userId}`
    );

    await runTransaction(this.getStore(), async transaction => {
      const postSnapshot = await transaction.get(postRef);
      const voteSnapshot = await transaction.get(voteRef);

      if (
        !postSnapshot.exists() ||
        postSnapshot.data().status !== CommunityContentStatus.Published
      ) {
        throw new CommunityError(CommunityValidationError.PostNotFound);
      }

      if (voteSnapshot.exists()) {
        throw new CommunityError(CommunityValidationError.AlreadyVoted);
      }

      const poll = this.toPoll(postSnapshot.data().poll);

      if (!poll) {
        throw new CommunityError(CommunityValidationError.PollRequired);
      }

      if (poll.expiresAt && poll.expiresAt <= new Date()) {
        throw new CommunityError(CommunityValidationError.PollExpired);
      }

      if (!poll.options.some(option => option.id === optionId)) {
        throw new CommunityError(CommunityValidationError.PollOptionInvalid);
      }

      const options = poll.options.map(option =>
        option.id === optionId
          ? { ...option, voteCount: option.voteCount + 1 }
          : option
      );
      const voteData: CommunityPollVoteData = {
        postId,
        userId,
        optionId,
        createdAt: new Date(),
      };

      transaction.set(voteRef, {
        ...voteData,
        createdAt: serverTimestamp(),
      });
      transaction.update(postRef, {
        'poll.options': options,
        'poll.totalVoteCount': poll.totalVoteCount + 1,
      });
    });
  }

  public async getMyVote(postId: string): Promise<string | null> {
    const userId = this.firebase.getUserId();

    if (!userId) {
      return null;
    }

    const snapshot = await getDoc(
      doc(this.getStore(), 'community-poll-votes', `${postId}_${userId}`)
    );

    return snapshot.exists() ? (snapshot.data().optionId as string) : null;
  }

  public async report(input: CommunityReportInput): Promise<'created' | 'duplicate'> {
    const reporterId = this.requireUserId();
    const targetId =
      input.targetType === CommunityReportTargetType.Comment
        ? input.commentId
        : input.postId;

    if (!targetId ||
      (input.targetType === CommunityReportTargetType.Comment &&
        !input.commentId)) {
      throw new CommunityError(CommunityValidationError.ReportTargetInvalid);
    }

    const reportId = `${reporterId}_${input.targetType}_${targetId}`;
    const reportRef = doc(this.getStore(), 'community-reports', reportId);

    return await runTransaction(this.getStore(), async transaction => {
      const snapshot = await transaction.get(reportRef);

      if (snapshot.exists()) {
        return 'duplicate';
      }

      const reportData: Record<string, unknown> = {
        reporterId,
        targetType: input.targetType,
        targetPostId: input.postId,
        targetAuthorId: input.targetAuthorId,
        reason: input.reason,
        status: CommunityReportStatus.Open,
        createdAt: serverTimestamp(),
      };

      if (
        input.targetType === CommunityReportTargetType.Comment &&
        input.commentId
      ) {
        reportData.targetCommentId = input.commentId;
      }

      if (input.detail !== undefined) {
        reportData.detail = input.detail;
      }

      transaction.set(reportRef, reportData);

      return 'created';
    });
  }

  private getStore() {
    return this.firebase.getStore();
  }

  private requireUserId() {
    const userId = this.firebase.getUserId();

    if (!userId) {
      throw new CommunityError(CommunityValidationError.NotLoggedIn);
    }

    return userId;
  }

  private assertAuthor(authorId: unknown, userId: string) {
    if (authorId !== userId) {
      throw new CommunityError(CommunityValidationError.Forbidden);
    }
  }

  private commentRef(postId: string, commentId: string) {
    return doc(
      this.getStore(),
      'community-posts',
      postId,
      'comments',
      commentId
    );
  }

  private toPostData(id: string, data: DocumentData): CommunityPostData {
    const poll = this.toPoll(data.poll);

    return {
      id,
      type: data.type as CommunityPostType,
      status: data.status as CommunityContentStatus,
      authorId: data.authorId,
      authorName: data.authorName,
      title: data.title,
      body: data.body,
      images: (data.images ?? []) as CommunityPostImage[],
      ...(data.bagSnapshot
        ? { bagSnapshot: data.bagSnapshot }
        : {}),
      ...(poll ? { poll } : {}),
      likeCount: data.likeCount ?? 0,
      commentCount: data.commentCount ?? 0,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  }

  private toCommentData(id: string, data: DocumentData): CommunityCommentData {
    return {
      id,
      status: data.status as CommunityContentStatus,
      ...(data.deletedReason
        ? { deletedReason: data.deletedReason as CommunityCommentDeletedReason }
        : {}),
      authorId: data.authorId ?? '',
      authorName: data.authorName ?? '',
      body: data.body ?? '',
      ...(data.parentId ? { parentId: data.parentId } : {}),
      ...(data.mentionedUserId
        ? { mentionedUserId: data.mentionedUserId }
        : {}),
      ...(data.mentionedUserName
        ? { mentionedUserName: data.mentionedUserName }
        : {}),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  }

  private toPoll(value: unknown): CommunityPoll | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const data = value as {
      options?: unknown;
      totalVoteCount?: unknown;
      expiresAt?: unknown;
    };

    if (!Array.isArray(data.options)) {
      return null;
    }

    const options = data.options as {
      id: string;
      text: string;
      voteCount?: number;
    }[];
    const poll: CommunityPoll = {
      options: options.map(option => ({
        id: option.id,
        text: option.text,
        voteCount: option.voteCount ?? 0,
      })),
      totalVoteCount: Number(data.totalVoteCount) || 0,
    };

    if (data.expiresAt) {
      poll.expiresAt = toDate(data.expiresAt);
    }

    return poll;
  }

  private toPollData(input: CommunityPollInput) {
    const result: Record<string, unknown> = {
      options: this.toPollOptions(input.options),
      totalVoteCount: 0,
    };

    if (input.expiresAt) {
      result.expiresAt = input.expiresAt;
    }

    return result;
  }

  private toPollOptions(options: CommunityPollInputOption[]) {
    return options.map(option => ({
      id: option.id || this.createPostId(),
      text: option.text.trim(),
      voteCount: 0,
    }));
  }

  private copyBagSnapshot(snapshot: NonNullable<CommunityPostCreateInput['bagSnapshot']>) {
    return {
      ...snapshot,
      gears: snapshot.gears.map(gear => ({ ...gear })),
    };
  }
}

export default CommunityStore;
