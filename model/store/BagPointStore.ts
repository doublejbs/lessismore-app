import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  DocumentData,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import BagPoint from '../bag-point/BagPoint';
import { BagPointData } from '../bag-point/BagPointData';
import Firebase from '../firebase/Firebase';
import { toFirestoreDate } from '../firebase/FirestoreDate';
import GroupError from '../group/GroupError';
import GroupValidationError from '../group/GroupValidationError';
import GroupValidator from '../group/GroupValidator';
import { PointInput, PointPatch } from '../point/PointData';
import PointType from '../point/PointType';

/**
 * 배낭 지도 포인트 CRUD (BD-14, DM-33 `bag/{bagId}/points/{pointId}`).
 *
 * `BagRouteStore`와 같은 이유로 `BagStore`와 따로 둔다 — `bag/{bagId}`는 공유되면 누구나 읽는
 * 공개 문서지만, 하위 `points`는 **소유자만** 읽고 쓴다(DM-33). 공개될 수 있는 값과 절대 공개되면
 * 안 되는 값을 한 파일에 섞지 않는다.
 *
 * 검증·상한은 그룹 포인트(GRP-9)와 **같은 값**을 쓴다(제목 1~40자, 설명 200자, 50개).
 */
class BagPointStore {
  public constructor(private readonly firebase: Firebase) {}

  public async getPoints(bagId: string): Promise<BagPoint[]> {
    const snapshot = await getDocs(
      query(this.pointsRef(bagId), orderBy('createdAt', 'asc'))
    );

    return snapshot.docs.map(item =>
      BagPoint.from(this.toPointData(item.id, item.data()))
    );
  }

  // 배낭 상세 `코스` 타일 부제의 포인트 수(BD-14). 문서를 읽지 않고 개수만 센다.
  public async getPointCount(bagId: string): Promise<number> {
    const count = await getCountFromServer(this.pointsRef(bagId));

    return count.data().count;
  }

  /**
   * 포인트 등록 (BD-14). **상한 50개는 `BagPointList.isFull()`이 읽어 둔 목록으로 막는다** — 여기서
   * 서버에 다시 세면 오프라인에서 등록이 실패한다. 소유자 한 사람의 것이라 경합이 없고, 공개 문서인
   * `bag`에 카운터를 더해 개수를 공유 링크로 흘리지 않는다.
   */
  public async createPoint(bagId: string, input: PointInput): Promise<string> {
    this.requireUserId();
    GroupValidator.validatePointTitle(input.title);

    const description = input.description?.trim();

    if (description) {
      GroupValidator.validatePointDescription(description);
    }

    const pointRef = doc(this.pointsRef(bagId));
    const pointData: Record<string, unknown> = {
      type: input.type,
      latitude: input.latitude,
      longitude: input.longitude,
      title: input.title.trim(),
      createdAt: serverTimestamp(),
    };

    // 설명이 없으면 키를 생략한다(DM-33).
    if (description) {
      pointData.description = description;
    }

    await setDoc(pointRef, pointData);

    return pointRef.id;
  }

  public async updatePoint(
    bagId: string,
    pointId: string,
    patch: PointPatch
  ): Promise<void> {
    this.requireUserId();

    if (patch.title !== undefined) {
      GroupValidator.validatePointTitle(patch.title);
    }

    if (patch.description) {
      GroupValidator.validatePointDescription(patch.description);
    }

    const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };

    if (patch.type !== undefined) {
      updates.type = patch.type;
    }

    if (patch.title !== undefined) {
      updates.title = patch.title.trim();
    }

    if (patch.description !== undefined) {
      const description = patch.description?.trim();

      updates.description = description || deleteField();
    }

    await updateDoc(this.pointRef(bagId, pointId), updates);
  }

  public async deletePoint(bagId: string, pointId: string): Promise<void> {
    this.requireUserId();

    await deleteDoc(this.pointRef(bagId, pointId));
  }

  private pointsRef(bagId: string) {
    return collection(this.getStore(), 'bag', bagId, 'points');
  }

  private pointRef(bagId: string, pointId: string) {
    return doc(this.getStore(), 'bag', bagId, 'points', pointId);
  }

  private getStore() {
    return this.firebase.getStore();
  }

  private requireUserId() {
    const userId = this.firebase.getUserId();

    if (!userId) {
      throw new GroupError(GroupValidationError.NotLoggedIn);
    }

    return userId;
  }

  private toPointData(id: string, data: DocumentData): BagPointData {
    return {
      id,
      type: this.toPointType(data.type),
      latitude: Number(data.latitude) || 0,
      longitude: Number(data.longitude) || 0,
      title: data.title ?? '',
      ...(data.description ? { description: data.description as string } : {}),
      createdAt: toFirestoreDate(data.createdAt),
      ...(data.updatedAt ? { updatedAt: toFirestoreDate(data.updatedAt) } : {}),
    };
  }

  private toPointType(value: unknown): PointType {
    return this.isPointType(value) ? value : PointType.Note;
  }

  private isPointType(value: unknown): value is PointType {
    return Object.values(PointType).some(type => type === value);
  }
}

export default BagPointStore;
