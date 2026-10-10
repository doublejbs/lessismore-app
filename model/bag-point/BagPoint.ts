import MapPoint from '@/model/point/MapPoint';
import PointType from '@/model/point/PointType';
import { BagPointData } from './BagPointData';

/**
 * 개인 여행 지도 포인트 (BD-14, DM-33 `bag/{bagId}/points/{pointId}`).
 *
 * 그룹 포인트(`GroupPoint`)와 필드 구조가 같고 사는 곳만 다르다 — 작성자·권한이 없다.
 * 소유자만 읽고 쓰므로 이 화면에 보이는 배낭 포인트는 언제나 내 것이다.
 */
class BagPoint implements MapPoint {
  private readonly id: string;
  private readonly type: PointType;
  private readonly latitude: number;
  private readonly longitude: number;
  private readonly title: string;
  private readonly description: string | undefined;
  private readonly createdAt: Date;
  private readonly updatedAt: Date | undefined;

  public static from(data: BagPointData) {
    return new BagPoint(data);
  }

  private constructor(data: BagPointData) {
    this.id = data.id;
    this.type = data.type;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.title = data.title;
    this.description = data.description;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  public getId() {
    return this.id;
  }

  public getType() {
    return this.type;
  }

  public getLatitude() {
    return this.latitude;
  }

  public getLongitude() {
    return this.longitude;
  }

  public getTitle() {
    return this.title;
  }

  public getDescription() {
    return this.description;
  }

  public getCreatedAt() {
    return this.createdAt;
  }

  public getUpdatedAt() {
    return this.updatedAt;
  }
}

export default BagPoint;
