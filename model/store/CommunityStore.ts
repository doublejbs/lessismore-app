import {
  collection,
  deleteField,
  doc,
  documentId,
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
import CommunityFeedSort from '../community/CommunityFeedSort';
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
import CommunityReportResult from '../community/CommunityReportResult';
import CommunityReportTargetType from '../community/CommunityReportTargetType';
import CommunityValidator from '../community/CommunityValidator';
import CommunityValidationError from '../community/CommunityValidationError';
import { COMMUNITY_PAGE_SIZE } from '../community/CommunityLimits';
import CommunityBagSnapshotBuilder from '../community/CommunityBagSnapshotBuilder';
import { createCommunityId } from '../community/CommunityId';

class CommunityStore {
  public constructor(private readonly firebase: Firebase) {}

  public createPostId() {
    return doc(collection(this.getStore(), 'community-posts')).id;
  }

  public async getFeedPage(
    filter: CommunityFeedFilter,
    sort: CommunityFeedSort,
    cursor: QueryDocumentSnapshot | null,
    limit: number = COMMUNITY_PAGE_SIZE
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
        : [where(filter === CommunityFeedFilter.Packing ? 'hasBagSnapshot' : 'hasPoll', '==', true)]),
      ...(sort === CommunityFeedSort.Popular
        ? [orderBy('likeCount', 'desc'), orderBy('createdAt', 'desc')]
        : [orderBy('createdAt', 'desc')]),
      firestoreLimit(limit + 1),
    ];
    let feedQuery = query(postsRef, ...constraints);

    if (cursor) {
      feedQuery = query(feedQuery, startAfter(cursor));
    }

    const snapshot = await getDocs(feedQuery);
    const hasMore = snapshot.docs.length > limit;
    const visibleDocs = hasMore
      ? snapshot.docs.slice(0, limit)
      : snapshot.docs;

    return this.toPostPage(visibleDocs, hasMore);
  }

  public async getMyPostsPage(
    userId: string,
    cursor: QueryDocumentSnapshot | null,
    limit: number = COMMUNITY_PAGE_SIZE
  ): Promise<{
    posts: CommunityPost[];
    cursor: QueryDocumentSnapshot | null;
    hasMore: boolean;
  }> {
    const postsRef = collection(this.getStore(), 'community-posts');
    let postsQuery = query(
      postsRef,
      where('authorId', '==', userId),
      where('status', '==', CommunityContentStatus.Published),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit + 1)
    );

    if (cursor) {
      postsQuery = query(postsQuery, startAfter(cursor));
    }

    const snapshot = await getDocs(postsQuery);
    const hasMore = snapshot.docs.length > limit;
    const visibleDocs = hasMore
      ? snapshot.docs.slice(0, limit)
      : snapshot.docs;

    return this.toPostPage(visibleDocs, hasMore);
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

  public async getPostsByIds(postIds: string[]): Promise<CommunityPost[]> {
    const postsRef = collection(this.getStore(), 'community-posts');
    const chunks: string[][] = [];

    for (let index = 0; index < postIds.length; index += 10) {
      chunks.push(postIds.slice(index, index + 10));
    }

    const snapshots = await Promise.all(
      chunks.map(chunk =>
        getDocs(query(postsRef, where(documentId(), 'in', chunk)))
      )
    );
    const postsById = new Map<string, CommunityPost>();

    snapshots.forEach(snapshot => {
      snapshot.docs.forEach(item => {
        const data = item.data();

        if (data.status !== CommunityContentStatus.Published) {
          return;
        }

        postsById.set(
          item.id,
          CommunityPost.from(this.toPostData(item.id, data))
        );
      });
    });

    return postIds.flatMap(postId => {
      const post = postsById.get(postId);

      return post ? [post] : [];
    });
  }

  public async createPost(
    postId: string,
    input: CommunityPostCreateInput
  ): Promise<string> {
    const userId = this.requireUserId();

    CommunityValidator.validatePost(input);

    const postData: Record<string, unknown> = {
      type: CommunityPostType.Post,
      hasBagSnapshot: input.hasBagSnapshot,
      hasPoll: input.hasPoll,
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

    if (input.bagSnapshot) {
      postData.bagSnapshot = this.copyBagSnapshot(input.bagSnapshot);
    }

    if (input.poll) {
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

      const poll = this.toPoll(data.poll);
      const hasVote = (poll?.totalVoteCount ?? 0) > 0;
      const nextHasBagSnapshot = patch.bagSnapshot !== undefined
        ? patch.bagSnapshot !== null
        : Boolean(data.bagSnapshot);
      const nextHasPoll = patch.poll !== undefined
        ? patch.poll !== null
        : Boolean(data.poll);
      const expiresAtChanged =
        patch.poll !== undefined &&
        patch.poll !== null &&
        'expiresAt' in patch.poll;

      if (
        hasVote &&
        patch.poll !== undefined &&
        (patch.poll === null ||
          patch.poll.options !== undefined ||
          expiresAtChanged)
      ) {
        throw new CommunityError(CommunityValidationError.PollLocked);
      }

      if (patch.title !== undefined) {
        CommunityValidator.validateTitle(patch.title);
      }

      if (patch.body !== undefined) {
        CommunityValidator.validateBody(
          nextHasBagSnapshot || nextHasPoll,
          patch.body
        );
      }

      if (patch.images !== undefined) {
        CommunityValidator.validateImages(patch.images);
      }

      const updates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
        hasBagSnapshot: nextHasBagSnapshot,
        hasPoll: nextHasPoll,
      };

      if (patch.hasBagSnapshot !== undefined) {
        if (patch.hasBagSnapshot !== nextHasBagSnapshot) {
          throw new CommunityError(CommunityValidationError.AttachmentMismatch);
        }

      }

      if (patch.hasPoll !== undefined) {
        if (patch.hasPoll !== nextHasPoll) {
          throw new CommunityError(CommunityValidationError.AttachmentMismatch);
        }

      }

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
        if (patch.bagSnapshot === null) {
          updates.bagSnapshot = deleteField();
          updates.hasBagSnapshot = false;
        } else {
          updates.bagSnapshot = this.copyBagSnapshot(patch.bagSnapshot);
          updates.hasBagSnapshot = true;
        }
      }

      if (patch.poll !== undefined) {
        if (patch.poll === null) {
          updates.poll = deleteField();
          updates.hasPoll = false;
        } else {
          const pollOptions = patch.poll.options ?? poll?.options;

          if (!pollOptions) {
            throw new CommunityError(CommunityValidationError.PollRequired);
          }

          CommunityValidator.validatePollOptions(pollOptions);

          const options = this.toPollOptions(pollOptions);
          const nextPoll: Record<string, unknown> = {
            options,
            totalVoteCount: poll?.totalVoteCount ?? 0,
            allowMultiple: patch.poll.allowMultiple
              ?? poll?.allowMultiple
              ?? false,
          };

          if (patch.poll.expiresAt !== null && patch.poll.expiresAt !== undefined) {
            nextPoll.expiresAt = patch.poll.expiresAt;
          } else if (patch.poll.expiresAt === undefined && poll?.expiresAt) {
            nextPoll.expiresAt = poll.expiresAt;
          }

          updates.poll = nextPoll;
          updates.hasPoll = true;
        }
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
    pageSize: number = COMMUNITY_PAGE_SIZE
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

      if (parentId && parent) {
        commentData.parentId = parentId;
        commentData.mentionedUserId = parent.mentionedUserId;
        commentData.mentionedUserName = parent.mentionedUserName;
      }

      transaction.set(commentRef, commentData);
      const currentCount = postSnapshot.data().commentCount ?? 0;
      transaction.update(postRef, {
        commentCount: Math.max(0, currentCount) + 1,
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

      transaction.update(commentRef, {
        status: CommunityContentStatus.Deleted,
        deletedReason: CommunityCommentDeletedReason.Author,
        body: '',
        authorName: '',
        updatedAt: serverTimestamp(),
      });

      transaction.update(postRef, {
        commentCount: Math.max(0, currentCount - 1),
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

      if (voteSnapshot.exists()) {
        const voteData = voteSnapshot.data();
        const previousOptionIds = Array.isArray(voteData.optionIds)
          ? voteData.optionIds as string[]
          : voteData.optionId
            ? [voteData.optionId as string]
            : [];

        if (previousOptionIds.length === 0) {
          throw new CommunityError(CommunityValidationError.PollOptionInvalid);
        }

        if (!previousOptionIds.every(previousOption =>
          poll.options.some(option => option.id === previousOption))) {
          throw new CommunityError(CommunityValidationError.PollOptionInvalid);
        }

        const selected = previousOptionIds.includes(optionId);

        if (!poll.allowMultiple && selected) {
          return;
        }

        if (poll.allowMultiple && selected && previousOptionIds.length === 1) {
          return;
        }

        const nextOptionIds = poll.allowMultiple
          ? (selected
            ? previousOptionIds.filter(id => id !== optionId)
            : [...previousOptionIds, optionId])
          : [optionId];
        const removedOptionIds = previousOptionIds.filter(id => !nextOptionIds.includes(id));
        const addedOptionIds = nextOptionIds.filter(id => !previousOptionIds.includes(id));
        const options = poll.options.map(option => {
          if (removedOptionIds.includes(option.id)) {
            return { ...option, voteCount: Math.max(0, option.voteCount - 1) };
          }

          if (addedOptionIds.includes(option.id)) {
            return { ...option, voteCount: option.voteCount + 1 };
          }

          return option;
        });

        transaction.update(voteRef, {
          optionIds: nextOptionIds,
          updatedAt: serverTimestamp(),
        });
        transaction.update(postRef, {
          'poll.options': options,
          'poll.totalVoteCount': poll.totalVoteCount,
        });

        return;
      }

      const options = poll.options.map(option =>
        option.id === optionId
          ? { ...option, voteCount: option.voteCount + 1 }
          : option
      );
      const voteData: CommunityPollVoteData = {
        postId,
        userId,
        optionIds: [optionId],
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

  public async getMyVote(postId: string): Promise<string[]> {
    const userId = this.firebase.getUserId();

    if (!userId) {
      return [];
    }

    const snapshot = await getDoc(
      doc(this.getStore(), 'community-poll-votes', `${postId}_${userId}`)
    );

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.data();

    if (Array.isArray(data.optionIds)) {
      return data.optionIds as string[];
    }

    return data.optionId ? [data.optionId as string] : [];
  }

  public async report(input: CommunityReportInput): Promise<CommunityReportResult> {
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
        return CommunityReportResult.Duplicate;
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

      return CommunityReportResult.Created;
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
    const bagSnapshot = CommunityBagSnapshotBuilder.fromFirestore(data.bagSnapshot);

    return {
      id,
      type: data.type as CommunityPostType,
      status: data.status as CommunityContentStatus,
      authorId: data.authorId,
      authorName: data.authorName,
      title: data.title,
      body: data.body,
      images: (data.images ?? []) as CommunityPostImage[],
      ...(bagSnapshot
        ? { bagSnapshot }
        : {}),
      ...(poll ? { poll } : {}),
      likeCount: data.likeCount ?? 0,
      commentCount: data.commentCount ?? 0,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  }

  private toPostPage(
    visibleDocs: QueryDocumentSnapshot<DocumentData>[],
    hasMore: boolean
  ) {
    return {
      posts: visibleDocs.map(item =>
        CommunityPost.from(this.toPostData(item.id, item.data()))
      ),
      cursor: hasMore ? visibleDocs[visibleDocs.length - 1] : null,
      hasMore,
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
      allowMultiple?: unknown;
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
      allowMultiple: data.allowMultiple === true,
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
      allowMultiple: input.allowMultiple,
    };

    if (input.expiresAt) {
      result.expiresAt = input.expiresAt;
    }

    return result;
  }

  private toPollOptions(options: CommunityPollInputOption[]) {
    return options.map(option => ({
      id: option.id || createCommunityId(),
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
