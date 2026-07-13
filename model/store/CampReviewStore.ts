import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
} from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import {
  CampReview,
  CampReviewInput,
  CampReviewSummary,
} from '../camp-review/CampReviewTypes';

// 박지 유저 후기 CRUD (CampSite CS-8, DataModel DM-20).
// 작성/수정/삭제는 runTransaction으로 요약 문서(별점 집계)를 동기 갱신한다.
// 요약 문서: camp-spot-user-review/{spotId}
// 후기 문서: camp-spot-user-review/{spotId}/reviews/{userId} (문서 id == 작성자 uid)
class CampReviewStore {
  public constructor(private readonly firebase: Firebase) {}

  // 요약 문서 조회. 없으면 null.
  public async getSummary(
    spotId: string
  ): Promise<CampReviewSummary | null> {
    const snapshot = await getDoc(
      doc(this.getStore(), 'camp-spot-user-review', spotId)
    );

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();

    return {
      spotId: data.spotId,
      reviewCount: data.reviewCount,
      ratingSum: data.ratingSum,
      ratingAvg: data.ratingAvg,
      updatedAt: data.updatedAt,
    };
  }

  // 후기 목록 조회 (최신 수정순).
  public async getReviews(spotId: string): Promise<CampReview[]> {
    const snapshot = await getDocs(
      query(
        collection(
          this.getStore(),
          'camp-spot-user-review',
          spotId,
          'reviews'
        ),
        orderBy('updatedAt', 'desc')
      )
    );

    return snapshot.docs.map(reviewDoc =>
      this.toCampReview(reviewDoc.data())
    );
  }

  // 내 후기 단건 조회 (문서 id == userId). 없으면 null.
  public async getMyReview(
    spotId: string,
    userId: string
  ): Promise<CampReview | null> {
    const snapshot = await getDoc(
      doc(this.getStore(), 'camp-spot-user-review', spotId, 'reviews', userId)
    );

    if (!snapshot.exists()) {
      return null;
    }

    return this.toCampReview(snapshot.data());
  }

  // 후기 작성/수정. 트랜잭션으로 요약 별점 집계를 동기 갱신한다.
  public async saveReview(
    spotId: string,
    userId: string,
    input: CampReviewInput
  ): Promise<void> {
    const db = this.getStore();
    const reviewRef = doc(
      db,
      'camp-spot-user-review',
      spotId,
      'reviews',
      userId
    );
    const summaryRef = doc(db, 'camp-spot-user-review', spotId);

    await runTransaction(db, async transaction => {
      // 모든 read를 write보다 먼저 수행한다(Firestore 규칙).
      const reviewSnap = await transaction.get(reviewRef);
      const summarySnap = await transaction.get(summaryRef);

      const now = new Date().toISOString();

      const isEdit = reviewSnap.exists();
      const oldRating = isEdit ? reviewSnap.data().rating : 0;
      const createdAt = isEdit ? reviewSnap.data().createdAt : now;

      const prevCount = summarySnap.exists()
        ? summarySnap.data().reviewCount
        : 0;
      const prevSum = summarySnap.exists() ? summarySnap.data().ratingSum : 0;

      const reviewCount = isEdit ? prevCount : prevCount + 1;
      const ratingSum = isEdit
        ? prevSum + (input.rating - oldRating)
        : prevSum + input.rating;
      const ratingAvg =
        reviewCount > 0 ? Math.round((ratingSum / reviewCount) * 10) / 10 : 0;

      // optional 필드는 값이 있을 때만 포함한다
      // (exactOptionalPropertyTypes + Firestore는 undefined 거부).
      const content = input.content?.trim();
      const reviewData = {
        authorId: userId,
        authorName: input.authorName,
        rating: input.rating,
        ...(content ? { content } : {}),
        ...(input.bagId ? { bagId: input.bagId } : {}),
        ...(input.bagName ? { bagName: input.bagName } : {}),
        ...(input.bagDate ? { bagDate: input.bagDate } : {}),
        ...(input.bagWeight ? { bagWeight: input.bagWeight } : {}),
        createdAt,
        updatedAt: now,
      };

      transaction.set(reviewRef, reviewData);
      transaction.set(summaryRef, {
        spotId,
        reviewCount,
        ratingSum,
        ratingAvg,
        updatedAt: now,
      });
    });
  }

  // 후기 삭제 (소유자만). 트랜잭션으로 요약 집계 반영(0건이면 요약 문서 정리).
  public async deleteReview(spotId: string, userId: string): Promise<void> {
    const db = this.getStore();
    const reviewRef = doc(
      db,
      'camp-spot-user-review',
      spotId,
      'reviews',
      userId
    );
    const summaryRef = doc(db, 'camp-spot-user-review', spotId);

    await runTransaction(db, async transaction => {
      // 모든 read를 write보다 먼저 수행한다.
      const reviewSnap = await transaction.get(reviewRef);
      const summarySnap = await transaction.get(summaryRef);

      if (!reviewSnap.exists()) {
        return;
      }

      const oldRating = reviewSnap.data().rating;
      const prevCount = summarySnap.exists()
        ? summarySnap.data().reviewCount
        : 0;
      const prevSum = summarySnap.exists() ? summarySnap.data().ratingSum : 0;

      const newCount = prevCount - 1;
      const newSum = prevSum - oldRating;

      transaction.delete(reviewRef);

      if (newCount <= 0) {
        transaction.delete(summaryRef);
      } else {
        transaction.set(summaryRef, {
          spotId,
          reviewCount: newCount,
          ratingSum: newSum,
          ratingAvg: Math.round((newSum / newCount) * 10) / 10,
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }

  // Firestore 문서 데이터를 CampReview로 매핑한다.
  // optional 필드는 값이 있을 때만 포함한다(exactOptionalPropertyTypes).
  private toCampReview(data: any): CampReview {
    return {
      authorId: data.authorId,
      authorName: data.authorName,
      rating: data.rating,
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.bagId !== undefined ? { bagId: data.bagId } : {}),
      ...(data.bagName !== undefined ? { bagName: data.bagName } : {}),
      ...(data.bagDate !== undefined ? { bagDate: data.bagDate } : {}),
      ...(data.bagWeight !== undefined ? { bagWeight: data.bagWeight } : {}),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private getStore() {
    return this.firebase.getStore();
  }
}

export default CampReviewStore;
