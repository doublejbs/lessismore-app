import { runTransaction, writeBatch } from '@firebase/firestore';
import dayjs, { Dayjs } from 'dayjs';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  CollectionReference,
  deleteField,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  QuerySnapshot,
  updateDoc,
  where,
} from 'firebase/firestore';
import Gear, { toGearExtra } from '../gear/Gear';
import { getGroupForCategory } from '../gear/GearCategoryGroups';
import GearFilter from '../gear/GearFilter';
import Firebase from '../firebase/Firebase';
import { GearData } from './GearStore';
import BagItem from '../bag/BagItem';
import OrderType from '../order/OrderType';
import {
  compareByCodePoint,
  getBagComparator,
} from '../order/BagOrderComparators';
import app from '../app/App';
import { BagLocation } from '../bag-destination/BagLocation';
import { BagActivitySummary } from '../bag/BagActivitySummary';
import { WeatherSnapshot } from '../weather/WeatherTypes';

// Firestore `in` 쿼리 값 상한(30개). 초과분은 청크로 나눠 조회한다(DM-25).
const IN_QUERY_CHUNK_SIZE = 30;

class BagStore {
  public constructor(private readonly firebase: Firebase) {}

  // order를 넘기지 않으면 기존 동작(최근 여행순)을 유지한다(BAG-6).
  public async getList(
    order: OrderType = OrderType.StartDateDesc
  ): Promise<BagItem[]> {
    try {
      const bagIDs = (
        await getDoc(doc(this.getStore(), 'users', this.firebase.getUserId()))
      ).data()?.['bags'];

      return (await this.getBags(bagIDs)).sort(getBagComparator(order));
    } catch (e) {
      console.log(e);

      return [];
    }
  }

  public async getSharedBag(id: string, filters: GearFilter[]) {
    const bag = await getDoc(doc(this.getStore(), 'bag', id));
    if (bag.exists()) {
      const {
        name,
        weight,
        editDate,
        startDate,
        endDate,
        shared,
        reviewShared,
        gears,
        userId,
      } = bag.data();

      // 링크 공유(shared) 또는 후기 첨부 공개(reviewShared) 둘 중 하나라도 true면 열람 허용(CS-8, DM-20).
      // 미공유는 호출측(읽기전용 뷰어)이 상태로 안내하므로 여기서 raw alert는 띄우지 않는다.
      if (!shared && !reviewShared) {
        throw new Error('Bag not shared');
      }

      if (gears.length === 0) {
        return {
          name,
          weight,
          editDate,
          startDate,
          endDate,
          gears: [],
          shared,
          reviewShared,
        };
      } else {
        const warehouseGears = await this.getBagGears(userId, gears, filters);

        return {
          name,
          weight,
          editDate,
          startDate,
          endDate,
          shared,
          reviewShared,
          gears: warehouseGears.length
            ? warehouseGears.map(gearData => {
                const {
                  id,
                  name,
                  company,
                  weight,
                  category = '',
                  useless,
                  used,
                  bags,
                  isCustom,
                  createDate,
                  color,
                  companyKorean,
                  nameKorean,
                } = gearData;

                return new Gear(
                  id,
                  name,
                  company,
                  weight,
                  true,
                  isCustom,
                  category,
                  useless,
                  used,
                  bags,
                  createDate,
                  color,
                  companyKorean,
                  nameKorean,
                  toGearExtra(gearData)
                );
              })
            : [],
        };
      }
    } else {
      return null;
    }
  }

  public async getBagWithAllFilter(id: string) {
    return await this.getBag(id, [GearFilter.All]);
  }

  public async getBag(id: string, filters: GearFilter[]) {
    const bagIDs = (
      await getDoc(doc(this.getStore(), 'users', this.firebase.getUserId()))
    ).data()?.['bags'];

    if (!bagIDs.includes(id)) {
      window.alert('잘못된 접근입니다.');
      throw new Error('Bag not found');
    }

    const {
      name,
      weight,
      gears,
      editDate,
      startDate,
      endDate,
      shared,
      memo,
      location,
      weather,
      activity,
    } = (await getDoc(doc(this.getStore(), 'bag', id))).data() as {
      name: string;
      weight: string;
      editDate: string;
      startDate: string;
      endDate: string;
      gears: string[];
      shared: boolean;
      memo?: string;
      location?: BagLocation;
      weather?: WeatherSnapshot;
      activity?: BagActivitySummary;
    };

    if (gears.length === 0) {
      return {
        name,
        weight,
        editDate,
        startDate,
        endDate,
        gears: [],
        shared,
        memo: memo || '',
        location: location ?? null,
        weather: weather ?? null,
        activity: activity ?? null,
      };
    } else {
      const warehouseGears = await this.getBagGears(
        this.getUserID(),
        gears,
        filters
      );

      return {
        name,
        weight,
        editDate,
        startDate,
        endDate,
        shared,
        memo: memo || '',
        location: location ?? null,
        weather: weather ?? null,
        activity: activity ?? null,
        gears: warehouseGears.length
          ? warehouseGears.map(gearData => {
              const {
                id,
                name,
                company,
                weight,
                category = '',
                useless,
                used,
                bags,
                isCustom,
                createDate,
                color,
                companyKorean,
                nameKorean,
              } = gearData;

              return new Gear(
                id,
                name,
                company,
                weight,
                true,
                isCustom,
                category,
                useless,
                used,
                bags,
                createDate,
                color,
                companyKorean,
                nameKorean,
                toGearExtra(gearData)
              );
            })
          : [],
      };
    }
  }

  /**
   * 배낭에 담긴 장비를 읽는다. `in` 절 30개 상한(DM-25)을 넘기지 않도록 청크로 나눠
   * 병렬 조회한 뒤 병합하고, 기존 서버 쿼리와 같은 이름 오름차순으로 정렬한다.
   */
  private async getBagGears(
    userId: string,
    gearIDs: string[],
    filters: GearFilter[]
  ): Promise<GearData[]> {
    if (!gearIDs.length) {
      return [];
    }

    // bag.gears에 같은 ID가 중복으로 들어 있어도 장비가 두 번 나오지 않도록 먼저 제거한다.
    const uniqueGearIDs = Array.from(new Set(gearIDs));

    const snapshots = await this.getDocsByIDs(
      collection(this.getStore(), 'users', userId, 'gears'),
      uniqueGearIDs
    );

    const gearDataByID = new Map<string, GearData>();

    snapshots.forEach(snapshot => {
      snapshot.docs.forEach(doc => {
        gearDataByID.set(doc.id, {
          ...(doc.data() as GearData),
          id: doc.id,
        });
      });
    });

    // 세분 카테고리는 그룹으로 매핑해 비교한다(DM-4).
    // (기존 category.includes(filter)는 'tent_acc'.includes('tent') 같은 부분 문자열 오탐이 있었다.)
    const isAllFilter = filters.length === 1 && filters[0] === GearFilter.All;

    // 조회되지 않은 ID(삭제된 장비 참조)는 건너뛴다.
    return uniqueGearIDs
      .map(gearID => gearDataByID.get(gearID))
      .filter((gearData): gearData is GearData => !!gearData)
      .filter(gearData =>
        isAllFilter
          ? true
          : filters.some(
              filter => getGroupForCategory(gearData.category) === filter
            )
      )
      .sort(this.compareByNameAsc);
  }

  // 배낭 장비 표시 순서(배낭 상세·패킹·사용 기록·공유 배낭)는 기존 서버 쿼리의
  // orderBy('name','asc')를 그대로 유지한다. 청크 분할 후에는 청크마다 정렬이 따로 적용돼
  // 서버 정렬을 쓸 수 없으므로 병합 후 클라이언트에서 정렬한다(DM-25).
  // 비교는 Firestore 문자열 정렬(코드포인트 순)과 결과를 맞추기 위해 compareByCodePoint를 쓴다 —
  // localeCompare는 한글 로케일 규칙을 적용해 Firestore와 순서가 갈린다.
  // name이 없거나 빈 문자열인 문서는 뒤로 보낸다. 기존 orderBy('name')은 이런 문서를
  // 결과에서 아예 제외했지만, 목록에서 사라지는 것보다 뒤에 붙는 편이 낫다는 판단이다.
  private compareByNameAsc = (a: GearData, b: GearData): number => {
    const aName = a.name || '';
    const bName = b.name || '';

    if (!aName && !bName) {
      return 0;
    }

    if (!aName) {
      return 1;
    }

    if (!bName) {
      return -1;
    }

    const nameOrder = compareByCodePoint(aName, bName);

    // 이름이 같으면 Firestore orderBy 동률 규칙과 같이 문서 ID 오름차순으로 타이브레이크한다(DM-25).
    return nameOrder !== 0 ? nameOrder : compareByCodePoint(a.id, b.id);
  };

  // `in` 절 값 상한(DM-25)을 넘기지 않도록 ID를 청크로 나눠 병렬 조회한다.
  // 병합·가공은 호출측에서 한다.
  private async getDocsByIDs(
    collectionRef: CollectionReference<DocumentData, DocumentData>,
    ids: string[]
  ): Promise<QuerySnapshot<DocumentData, DocumentData>[]> {
    const chunks: string[][] = [];

    for (let i = 0; i < ids.length; i += IN_QUERY_CHUNK_SIZE) {
      chunks.push(ids.slice(i, i + IN_QUERY_CHUNK_SIZE));
    }

    return await Promise.all(
      chunks.map(chunk =>
        getDocs(query(collectionRef, where('__name__', 'in', chunk)))
      )
    );
  }

  private convertToArray(data: QuerySnapshot<DocumentData, DocumentData>) {
    const result: BagItem[] = [];
    data.forEach(doc => {
      const {
        name,
        weight,
        editDate,
        startDate,
        endDate,
        gears,
        packedGears,
        location,
        weather,
        activity,
      } = doc.data();

      result.push(
        new BagItem(
          doc.id,
          name,
          weight,
          dayjs(editDate),
          // 날짜 필드가 없으면 invalid Dayjs로 만들어 "날짜 없음"을 구분한다(GD-10 정렬·표시).
          startDate ? dayjs(startDate) : dayjs(''),
          endDate ? dayjs(endDate) : dayjs(''),
          gears ?? [],
          packedGears ?? [],
          location ?? null,
          weather ?? null,
          activity ?? null
        )
      );
    });
    return result;
  }

  public async add(name: string, startDate: Dayjs, endDate: Dayjs) {
    const docRef = await addDoc(collection(this.getStore(), 'bag'), {
      name,
      weight: 0,
      gears: [],
      editDate: new Date().toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      shared: false,
      userId: this.getUserID(),
    });

    await updateDoc(doc(this.getStore(), 'users', this.getUserID()), {
      bags: arrayUnion(docRef.id),
    });

    void app
      .getNotificationManager()
      ?.scheduleBagReminders(docRef.id, name, startDate, endDate);

    return docRef.id;
  }

  public async copy(
    id: string,
    name: string,
    startDate: Dayjs,
    endDate: Dayjs
  ) {
    const sourceRef = doc(this.getStore(), 'bag', id);
    const sourceSnap = await getDoc(sourceRef);

    if (!sourceSnap.exists()) {
      throw new Error('Bag document does not exist!');
    }

    const sourceData = sourceSnap.data();
    const gears: string[] = sourceData.gears || [];
    const weight = sourceData.weight ?? 0;

    const batch = writeBatch(this.getStore());
    const newBagRef = doc(collection(this.getStore(), 'bag'));

    batch.set(newBagRef, {
      name,
      weight,
      gears,
      editDate: new Date().toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      shared: false,
      userId: this.getUserID(),
    });

    for (const gearId of gears) {
      const gearRef = doc(
        this.getStore(),
        'users',
        this.getUserID(),
        'gears',
        gearId
      );
      batch.update(gearRef, {
        bags: arrayUnion(newBagRef.id),
      });
    }

    batch.update(doc(this.getStore(), 'users', this.getUserID()), {
      bags: arrayUnion(newBagRef.id),
    });

    await batch.commit();

    void app
      .getNotificationManager()
      ?.scheduleBagReminders(newBagRef.id, name, startDate, endDate);

    return newBagRef.id;
  }

  public async save(
    id: string,
    toAddGears: Gear[],
    toRemoveGears: Gear[],
    allGears: Gear[]
  ) {
    const bagRef = doc(this.getStore(), 'bag', id);

    try {
      await runTransaction(this.getStore(), async transaction => {
        // 1. 모든 읽기 작업을 먼저 수행
        const bagSnap = await transaction.get(bagRef);
        if (!bagSnap.exists()) {
          throw new Error('Bag document does not exist!');
        }

        // toAddGears 문서 읽기
        const addGearSnapPromises = toAddGears.map(gear => {
          const gearRef = doc(
            this.getStore(),
            'users',
            this.getUserID(),
            'gears',
            gear.getId()
          );
          return transaction.get(gearRef);
        });
        const addGearSnaps = await Promise.all(addGearSnapPromises);

        // toRemoveGears 문서 읽기
        const removeGearSnapPromises = toRemoveGears.map(gear => {
          const gearRef = doc(
            this.getStore(),
            'users',
            this.getUserID(),
            'gears',
            gear.getId()
          );
          return transaction.get(gearRef);
        });
        const removeGearSnaps = await Promise.all(removeGearSnapPromises);

        // 2. 데이터 처리
        const gears = bagSnap.data()?.gears || [];
        const gearsSet = new Set(gears);
        toAddGears.forEach(gear => gearsSet.add(gear.getId()));
        toRemoveGears.forEach(gear => gearsSet.delete(gear.getId()));

        // 3. 모든 쓰기 작업 수행
        // Update bag document
        transaction.update(bagRef, {
          gears: Array.from(gearsSet),
          weight: allGears.reduce(
            (acc, gear) => acc + parseInt(gear.getWeight() || '0'),
            0
          ),
        });

        // Update toAddGears documents
        addGearSnaps.forEach((gearSnap, index) => {
          if (gearSnap.exists()) {
            const gear = toAddGears[index];
            const gearRef = doc(
              this.getStore(),
              'users',
              this.getUserID(),
              'gears',
              gear.getId()
            );
            transaction.update(gearRef, {
              bags: arrayUnion(id),
            });
          }
        });

        // Update toRemoveGears documents
        removeGearSnaps.forEach((gearSnap, index) => {
          if (gearSnap.exists()) {
            const gear = toRemoveGears[index];
            const gearRef = doc(
              this.getStore(),
              'users',
              this.getUserID(),
              'gears',
              gear.getId()
            );
            transaction.update(gearRef, {
              bags: arrayRemove(id),
              used: arrayRemove(id),
              useless: arrayRemove(id),
            });
          }
        });
      });
    } catch (e) {
      console.error('Transaction failed:', e);
      throw e;
    }
  }

  public async delete(id: string) {
    try {
      const bagRef = doc(this.getStore(), 'bag', id);
      const bagSnap = await getDoc(bagRef);

      if (bagSnap.exists()) {
        const bagData = bagSnap.data();
        const gears: string[] = bagData.gears || [];

        if (gears.length > 0) {
          const batch = writeBatch(this.getStore());

          for (const gearId of gears) {
            const gearRef = doc(
              this.getStore(),
              'users',
              this.getUserID(),
              'gears',
              gearId
            );
            batch.update(gearRef, {
              bags: arrayRemove(id),
              useless: arrayRemove(id),
              used: arrayRemove(id),
            });
          }
          await batch.commit();
        }
      }
      await deleteDoc(bagRef);
      await updateDoc(doc(this.getStore(), 'users', this.getUserID()), {
        bags: arrayRemove(id),
      });

      void app.getNotificationManager()?.cancelBagReminders(id);
    } catch (e) {
      console.error('배낭 삭제 중 오류 발생:', e);
      throw e;
    }
  }

  public async addGear(bagId: string, gear: Gear) {
    const bagRef = doc(this.getStore(), 'bag', bagId);
    const gearRef = doc(
      this.getStore(),
      'users',
      this.getUserID(),
      'gears',
      gear.getId()
    );

    try {
      await runTransaction(this.getStore(), async transaction => {
        const bagSnap = await transaction.get(bagRef);
        const gearSnap = await transaction.get(gearRef);

        if (!bagSnap.exists()) {
          throw new Error('Bag document does not exist!');
        }

        if (!gearSnap.exists()) {
          throw new Error('Gear document does not exist!');
        }

        const currentWeight = bagSnap.data()?.weight || 0;
        const gearWeight = parseInt(gear.getWeight() || '0');

        transaction.update(bagRef, {
          gears: arrayUnion(gear.getId()),
          weight: currentWeight + gearWeight,
        });

        transaction.update(gearRef, {
          bags: arrayUnion(bagId),
        });
      });
    } catch (e) {
      console.error('배낭에 장비 추가 실패:', e);
      throw e;
    }
  }

  private getStore() {
    return this.firebase.getStore();
  }

  private getUserID() {
    return this.firebase.getUserId();
  }

  public async getBags(bagIDs: string[]) {
    if (bagIDs.length) {
      const snapshots = await this.getDocsByIDs(
        collection(this.getStore(), 'bag'),
        bagIDs
      );

      return snapshots.flatMap(snapshot => this.convertToArray(snapshot));
    } else {
      return [];
    }
  }

  public async updateBagsWeight(bags: string[], weightDiff: number) {
    const batch = writeBatch(this.getStore());

    for (const bagId of bags) {
      const bagRef = doc(this.getStore(), 'bag', bagId);
      const bagSnap = await getDoc(bagRef);

      if (bagSnap.exists()) {
        const currentWeight = bagSnap.data()?.weight || 0;
        const newWeight = currentWeight + weightDiff;
        batch.update(bagRef, { weight: newWeight });
      }
    }

    await batch.commit();
  }

  public async updateShared(id: string, userId: string, shared: boolean) {
    await updateDoc(doc(this.getStore(), 'bag', id), { shared, userId });
  }

  // 박지 후기 첨부 공개 플래그(CS-8, DM-20). 링크 공유 shared와 별개.
  public async updateReviewShared(
    id: string,
    userId: string,
    reviewShared: boolean
  ) {
    await updateDoc(doc(this.getStore(), 'bag', id), { reviewShared, userId });
  }

  public async updateName(id: string, name: string) {
    await updateDoc(doc(this.getStore(), 'bag', id), { name });
  }

  public async updateDates(id: string, startDate: string, endDate: string) {
    await updateDoc(doc(this.getStore(), 'bag', id), {
      startDate,
      endDate,
    });

    const bagSnap = await getDoc(doc(this.getStore(), 'bag', id));
    const name = bagSnap.data()?.name;

    if (typeof name === 'string') {
      void app
        .getNotificationManager()
        ?.scheduleBagReminders(id, name, dayjs(startDate), dayjs(endDate));
    }
  }

  public async updateMemo(id: string, memo: string) {
    await updateDoc(doc(this.getStore(), 'bag', id), { memo });
  }

  // 날씨 화면용 경량 조회: 문서 1회 읽기로 날짜·위치·날씨만.
  public async getBagWeatherData(id: string) {
    const data = (await getDoc(doc(this.getStore(), 'bag', id))).data() as
      | {
          startDate?: string;
          endDate?: string;
          location?: BagLocation;
          weather?: WeatherSnapshot;
        }
      | undefined;

    return {
      startDate: data?.startDate ?? null,
      endDate: data?.endDate ?? null,
      location: data?.location ?? null,
      weather: data?.weather ?? null,
    };
  }

  // 운동 기록 화면용 경량 조회(HA-3/HA-4): 문서 1회 읽기로 후보 조회에 필요한
  // 기간·여행지, 현재 연결 상태, 그리고 상세에서 "이 무게로 이만큼 걸었다"를 잇는 데
  // 쓰는 총 무게(g)를 가져온다. 배낭 상세 전체를 로드하지 않기 위한 경량 경로다.
  public async getBagActivityData(id: string) {
    const data = (await getDoc(doc(this.getStore(), 'bag', id))).data() as
      | {
          startDate?: string;
          endDate?: string;
          location?: BagLocation;
          weight?: number;
          activity?: BagActivitySummary;
        }
      | undefined;

    return {
      startDate: data?.startDate ?? null,
      endDate: data?.endDate ?? null,
      location: data?.location ?? null,
      weight: data?.weight ?? null,
      activity: data?.activity ?? null,
    };
  }

  // 운동 기록 연결(DM-22). 저장하는 건 허브 식별자와 표시용 요약뿐이며
  // 심박·경로 같은 원본 시계열은 절대 올리지 않는다(HA-5).
  public async updateActivity(id: string, activity: BagActivitySummary) {
    await updateDoc(doc(this.getStore(), 'bag', id), { activity });
  }

  // 연결 해제(HA-3). 빈 객체를 남기면 "연결됨"과 구분되지 않으므로 필드를 지운다.
  public async removeActivity(id: string) {
    await updateDoc(doc(this.getStore(), 'bag', id), {
      activity: deleteField(),
    });
  }

  // 여행지 저장(DST-6). 기존 문서를 먼저 읽어 좌표 변경 여부를 판단하고 한 번의 쓰기로 끝낸다.
  // 반환값은 호출자가 좌표 변경 여부와 저장 후 weather를 로컬 상태에 그대로 반영할 수 있게 한다.
  public async updateLocation(
    id: string,
    location: BagLocation
  ): Promise<{
    coordinatesChanged: boolean;
    weather: WeatherSnapshot | null;
  }> {
    const ref = doc(this.getStore(), 'bag', id);

    return await runTransaction(this.getStore(), async transaction => {
      const snapshot = await transaction.get(ref);
      const data = snapshot.data() as
        { location?: BagLocation; weather?: WeatherSnapshot } | undefined;

      // location/weather가 없는 기존 문서도 그대로 통과한다(좌표 변경 취급 → 아래 분기).
      const previousLocation = data?.location ?? null;
      const previousWeather = data?.weather ?? null;

      const coordinatesChanged =
        previousLocation === null ||
        previousLocation.latitude !== location.latitude ||
        previousLocation.longitude !== location.longitude;

      if (coordinatesChanged) {
        // 이전 위치의 날씨가 새 여행지 날씨처럼 보이지 않도록 location 저장과 캐시 제거를 같은 쓰기로 처리한다.
        // frozen 스냅샷도 예외 없이 제거하며 새 조회 결과가 저장되기 전까지 표시하지 않는다.
        transaction.update(ref, { location, weather: deleteField() });

        return { coordinatesChanged, weather: null };
      }

      if (previousWeather && previousWeather.locationName !== location.name) {
        const weather = {
          ...previousWeather,
          locationName: location.name,
        };

        // 좌표가 같으면 일별 캐시는 유지하고 표시명만 여행지 스냅샷과 동기화한다.
        transaction.update(ref, {
          location,
          'weather.locationName': location.name,
        });

        return { coordinatesChanged, weather };
      }

      // 박지 참조만 바뀌었거나 같은 여행지를 다시 선택한 경우에도 location 객체 전체를 교체해
      // 자유 위치의 campSpotId 제거와 동일 박지의 최신 이름·좌표 스냅샷 갱신을 보장한다.
      transaction.update(ref, { location });

      return { coordinatesChanged, weather: previousWeather };
    });
  }

  public async updateWeather(
    id: string,
    location: BagLocation,
    weather: WeatherSnapshot
  ): Promise<boolean> {
    const ref = doc(this.getStore(), 'bag', id);

    return await runTransaction(this.getStore(), async transaction => {
      const snapshot = await transaction.get(ref);
      const currentLocation = snapshot.data()?.location as
        BagLocation | undefined;

      if (
        !currentLocation ||
        currentLocation.latitude !== location.latitude ||
        currentLocation.longitude !== location.longitude ||
        currentLocation.name !== location.name
      ) {
        return false;
      }

      transaction.update(ref, { weather });

      return true;
    });
  }

  // 패킹 상태 필드(packedGears/packingStartedAt/packingCompletedAt)만 조회한다.
  public async getPackingState(id: string) {
    const bagSnap = await getDoc(doc(this.getStore(), 'bag', id));
    const data = bagSnap.data() as
      | {
          packedGears?: string[];
          packingStartedAt?: string;
          packingCompletedAt?: string;
        }
      | undefined;

    return {
      packedGears: data?.packedGears ?? [],
      packingStartedAt: data?.packingStartedAt,
      packingCompletedAt: data?.packingCompletedAt,
    };
  }

  // 패킹 진행 상태를 저장한다. packedGears 배열은 통째로 갱신하고,
  // 옵셔널 필드는 exactOptionalPropertyTypes를 위해 조건부 스프레드로만 넣는다.
  // packingCompletedAt 제거는 undefined 대입이 아니라 deleteField()로 처리한다.
  public async savePacking(
    id: string,
    packedGears: string[],
    options: {
      packingStartedAt?: string;
      packingCompletedAt?: string;
      removePackingCompletedAt?: boolean;
    } = {}
  ) {
    const { packingStartedAt, packingCompletedAt, removePackingCompletedAt } =
      options;

    await updateDoc(doc(this.getStore(), 'bag', id), {
      packedGears,
      ...(packingStartedAt !== undefined ? { packingStartedAt } : {}),
      ...(packingCompletedAt !== undefined ? { packingCompletedAt } : {}),
      ...(removePackingCompletedAt
        ? { packingCompletedAt: deleteField() }
        : {}),
    });
  }
}

export default BagStore;
