import { makeAutoObservable } from 'mobx';
import { Platform, Share } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { releaseCapture } from 'react-native-view-shot';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import FilmCardElement from '@/model/bag-film-card/FilmCardElement';
import FilmCardRatio from '@/model/bag-film-card/FilmCardRatio';
import PhotoPickTarget from '@/model/bag-film-card/PhotoPickTarget';
import { PackingListItem } from '@/model/bag-film-card/PackingListItem';
import Gear from '@/model/gear/Gear';
import ToastManager from '@/model/toast/ToastManager';

// 아래 두 모듈은 웹 변형이 없어 동적으로만 불러온다(getMediaLibrary·getSharing 주석 참고).
type MediaLibraryModule = {
  requestPermissionsAsync: (writeOnly?: boolean) => Promise<{ status: string }>;
  Asset: { create: (filePath: string) => Promise<unknown> };
};

type SharingModule = {
  isAvailableAsync: () => Promise<boolean>;
  shareAsync: (url: string) => Promise<void>;
};

const GRANTED = 'granted';

// 브랜드에 한글 음절이 섞였는지 판정한다(BS-8). 패킹리스트 템플릿은 라틴·한글을 함께 담은
// D2Coding 하나만 쓰므로 뷰가 이 값을 보지 않는다(`PackingListItem` 주석 참고).
const KOREAN_PATTERN = /[가-힣]/; // l10n-ignore: 데이터 라벨의 한글 브랜드 판정 정규식

// 켜지지 않은 요소의 활성화 번호(BS-7). 0은 "꺼짐"을 뜻하며 정렬에 쓰이지 않는다.
const ELEMENT_OFF = 0;
// 진입 시 폴라로이드·패킹리스트이 둘 다 켜져 있어 번호 1·2를 먼저 쓰고, 다음 번호는 3부터다.
const FIRST_ELEMENT_SEQ = 1;

/**
 * 배낭 필름 카드(BS-1~BS-9) 도메인 모델.
 *
 * 카드에 얹는 값은 배낭 상세가 이미 로드해 둔 `BagDetail`에서만 읽는다 —
 * 이 화면 때문에 배낭·건강 허브를 다시 조회하지 않는다(BS-4).
 * 고른 사진과 캡처 결과는 저장하지 않는다(BS-4 데이터 항목).
 */
class BagFilmCard {
  public static from(bagDetail: BagDetail, toastManager: ToastManager) {
    return new BagFilmCard(bagDetail, toastManager);
  }

  // 캡처·네이티브 공유/저장 경로가 없는 웹에서는 동작하지 않는다(BS-1, 스펙 §5).
  private readonly enabled = Platform.OS !== 'web';
  private photoUri: string | null = null;
  /**
   * 폴라로이드 안에 들어가는 사진(BS-2·BS-3).
   *
   * `null`은 **사용자가 직접 고른 적이 없다**는 뜻이라 배경 사진을 그대로 따라간다 —
   * "직접 골랐는가"를 나타내는 별도 플래그를 두지 않는다. 한 번 직접 고르면 값이 남아
   * 배경을 바꿔도 그 선택이 유지된다.
   */
  private polaroidPhotoUri: string | null = null;
  // 내보내기 캔버스 비율(BS-7). 기본은 SNS 피드 규격.
  private ratio: FilmCardRatio = FilmCardRatio.Feed;
  /**
   * 사진 위에 얹은 요소의 **활성화 번호**(BS-7).
   *
   * 켤 때마다 커지는 번호를 넣어 `getActiveElements()`가 "나중에 켠 것이 위"로 정렬할 수
   * 있게 한다. 끄면 `ELEMENT_OFF`로 되돌리고, 다시 켤 때는 새 번호를 받는다 —
   * 번호가 달라지는 것 자체가 뷰에게 "이 요소는 새로 놓였으니 위치·배율·각도를 버려라"는 신호다
   * (위치 상태는 뷰의 훅이 들고 있다).
   * **진입 시 기본은 둘 다 켜짐**이다 — 이 화면이 무엇을 만들 수 있는지 바로 보이게 한다.
   * 서로 다른 모서리에서 시작하므로(BS-9) 둘 다 켜져 있어도 가리지 않는다.
   * 폴라로이드가 먼저 놓인 것으로 두어 겹칠 때는 패킹리스트이 위에 온다.
   */
  private elementSeqs: Record<FilmCardElement, number> = {
    [FilmCardElement.Polaroid]: FIRST_ELEMENT_SEQ,
    [FilmCardElement.PackingList]: FIRST_ELEMENT_SEQ + 1,
  };
  private nextElementSeq = FIRST_ELEMENT_SEQ + 2;
  // 캡처 중에는 카드 위의 안내(사진 고르기 플레이스홀더)를 감춘다.
  private capturing = false;
  private picking = false;
  private sharing = false;
  private saving = false;
  private mediaLibrary: MediaLibraryModule | null = null;
  private sharingModule: SharingModule | null = null;

  private constructor(
    private readonly bagDetail: BagDetail,
    private readonly toastManager: ToastManager
  ) {
    makeAutoObservable(this);
  }

  // 캔버스를 채우는 배경 사진(BS-2).
  public getPhotoUri() {
    return this.photoUri;
  }

  /**
   * 폴라로이드 안에 그릴 사진(BS-3). **기본은 배경과 같은 사진**이라 한 번만 골라도
   * 카드가 완성되고, 직접 고른 적이 있으면 배경이 바뀌어도 그 사진이 유지된다(BS-2).
   */
  public getPolaroidPhotoUri() {
    return this.polaroidPhotoUri ?? this.photoUri;
  }

  /**
   * **배경** 사진을 골랐는지(BS-2). 폴라로이드 사진은 배경보다 먼저 고를 수 없으므로
   * (`pickPolaroidPhoto` 주석) 이 값이 곧 "카드에 사진이 있는가"이기도 하다.
   *
   * 캔버스 전체를 덮는 `사진 고르기` 안내의 노출 조건이자 캡처 전 재렌더 대기 조건이며,
   * 공유 애널리틱스의 `has_photo`도 이 값을 쓴다.
   */
  public hasPhoto() {
    return this.photoUri !== null;
  }

  public getRatio() {
    return this.ratio;
  }

  public isRatioSelected(value: FilmCardRatio) {
    return this.ratio === value;
  }

  // 캡처 중 비율이 바뀌면 화면과 결과물이 어긋나므로 진행 중에는 막는다.
  public selectRatio(value: FilmCardRatio) {
    if (this.isBusy()) {
      return;
    }

    this.ratio = value;
  }

  public isElementOn(element: FilmCardElement) {
    return this.elementSeqs[element] !== ELEMENT_OFF;
  }

  /**
   * 요소를 **켠 순서대로** 돌려준다(BS-7) — 겹치면 나중에 켠 것이 위에 오도록
   * 뷰가 이 순서 그대로 렌더한다. 꺼진 요소는 빠진다.
   */
  public getActiveElements(): FilmCardElement[] {
    return Object.values(FilmCardElement)
      .filter(element => this.isElementOn(element))
      .sort((left, right) => this.elementSeqs[left] - this.elementSeqs[right]);
  }

  /**
   * 요소가 켜진 시점의 활성화 번호(BS-7). 껐다 다시 켜면 값이 달라진다.
   *
   * 뷰는 이 값을 위치·배율·각도 초기화 키로 쓴다 — "껐다는 것은 지웠다는 뜻"이라
   * 다시 켠 요소는 요소별 **기본 배치**(BS-9 — 폴라로이드 좌측 상단, 패킹리스트 우측 하단)로 돌아온다.
   */
  public getElementKey(element: FilmCardElement) {
    return this.elementSeqs[element];
  }

  // 비율과 같은 규칙으로, 캡처·공유가 도는 동안에는 요소를 켜고 끌 수 없다(BS-7).
  public toggleElement(element: FilmCardElement) {
    if (this.isBusy()) {
      return;
    }

    const on = !this.isElementOn(element);

    this.elementSeqs[element] = on ? this.nextElementSeq : ELEMENT_OFF;

    if (on) {
      this.nextElementSeq += 1;
    }

    app.getAnalyticsManager()?.logClick('film_card_element', {
      element,
      on,
    });
  }

  private setPhotoUri(value: string | null) {
    this.photoUri = value;
  }

  private setPolaroidPhotoUri(value: string | null) {
    this.polaroidPhotoUri = value;
  }

  private setCapturing(value: boolean) {
    this.capturing = value;
  }

  public isCapturing() {
    return this.capturing;
  }

  private setSharing(value: boolean) {
    this.sharing = value;
  }

  public isSharing() {
    return this.sharing;
  }

  private setSaving(value: boolean) {
    this.saving = value;
  }

  public isSaving() {
    return this.saving;
  }

  private setPicking(value: boolean) {
    this.picking = value;
  }

  // 캡처·공유·저장이 도는 동안에는 CTA와 사진 영역을 잠가 중복 실행을 막는다(BS-5).
  public isBusy() {
    return this.sharing || this.saving;
  }

  // 좌·큰: 출발일. 시각은 넣지 않는다(BS-4).
  public getDateText() {
    return this.bagDetail.getStartDate().format('YY.MM.DD');
  }

  // 좌·작: 배낭 총 무게. getWeight()가 이미 kg이라 단위 환산 없이 소수 1자리로 자른다.
  public getWeightText() {
    return `${this.bagDetail.getWeight().toFixed(1)} KG`;
  }

  public hasActivity() {
    return this.bagDetail.getActivity() !== null;
  }

  // 우·큰: 이동 거리. 요약 스냅샷의 distance는 m 단위다(DM-22).
  public getDistanceText(): string | null {
    const activity = this.bagDetail.getActivity();

    if (!activity || activity.distance <= 0) {
      return null;
    }

    return `${(activity.distance / 1000).toFixed(1)} KM`;
  }

  // 배낭 이름(BS-4). 사용자 자유 입력이라 한글이 올 수 있고,
  // 길이 제한도 없어 표시 쪽에서 한 줄로 자른다.
  public getBagNameText(): string | null {
    const name = this.bagDetail.getName().trim();

    return name.length > 0 ? name : null;
  }

  /**
   * 스펙 라벨 본문(BS-8). `limit` 개까지만 싣고 나머지는 `getHiddenItemCount`가 센다.
   *
   * 정렬은 무게 내림차순이며 같은 무게는 원래 순서를 유지한다 —
   * `Array.prototype.sort`가 안정 정렬이라 비교 함수를 무게 차이로만 두면 된다.
   * `bagDetail`이 들고 있는 배열을 그대로 정렬하면 배낭 상세 화면의 순서까지 바뀌므로 복사해서 다룬다.
   */
  public getPackingListItems(limit: number): PackingListItem[] {
    return this.getGearsByWeightDesc()
      .slice(0, limit)
      .map(gear => {
        const brand = BagFilmCard.toLabelBrand(gear);

        return {
          brand,
          name: BagFilmCard.toLabelName(gear),
          // 패킹리스트 본문의 무게 표기는 소문자 g다(BS-8 데이터 표 — `1840g`).
          weightText: `${BagFilmCard.toGramWeight(gear)}g`,
          hasKoreanBrand: KOREAN_PATTERN.test(brand),
        };
      });
  }

  // `+N MORE`에 쓸 잘라낸 개수(BS-8). 다 실렸으면 0이다.
  public getHiddenItemCount(limit: number) {
    return Math.max(this.bagDetail.getCount() - limit, 0);
  }

  /**
   * 패킹리스트 푸터 `TOTAL WEIGHT`의 **값**(BS-8) — `6.61KG`.
   *
   * 라벨은 뷰가 따로 찍으므로 여기서는 값만 만든다. `getWeight()`가 이미 kg이라
   * 단위 환산 없이 소수 2자리로 자른다(폴라로이드의 `getWeightText()`는 소수 1자리 +
   * 공백 구분이라 형식이 다르다 — 둘을 합치지 말 것).
   * 잘라낸 항목과 무관하게 항상 배낭 전량 기준이다.
   */
  public getTotalWeightText() {
    return `${this.bagDetail.getWeight().toFixed(2)}KG`;
  }

  // 패킹리스트 푸터 `TOTAL ITEMS`의 **값**(BS-8) — `14`. 이것도 전량 기준이다.
  public getItemCountText() {
    return `${this.bagDetail.getCount()}`;
  }

  // 배낭 전량을 무게 내림차순으로 정렬한다(BS-8). 필터가 걸리는 `mapGears()`는 쓰지 않는다 —
  // 카드에는 배낭에 담긴 장비가 전부 나와야 한다.
  private getGearsByWeightDesc() {
    return [...this.bagDetail.getGears()].sort(
      (left, right) =>
        BagFilmCard.toGramWeight(right) - BagFilmCard.toGramWeight(left)
    );
  }

  /**
   * 라벨의 브랜드는 영문 캐논컬(`getCompany()`)을 우선하고, 비었을 때만 한글로 떨어뜨린다.
   *
   * 이것은 `CLAUDE.md`의 "표시에는 항상 `getDisplayName()`" 규약에 대한 **의도적 예외**다(BS-8).
   * 여기는 앱 UI가 아니라 **영문 올캡스 라벨이라는 디자인 의도가 있는 내보내기 캔버스**라
   * 캐논컬 값을 우선한다. 규약 위반으로 오해해 `getDisplayCompany()`로 되돌리지 말 것.
   */
  private static toLabelBrand(gear: Gear) {
    const company = gear.getCompany().trim();
    const brand = company.length > 0 ? company : gear.getCompanyKorean().trim();

    return brand.toUpperCase();
  }

  // 장비명도 같은 이유로 영문 캐논컬(`getName()`) 우선이다 — 위 `toLabelBrand` 주석 참고.
  private static toLabelName(gear: Gear) {
    const name = gear.getName().trim();

    return name.length > 0 ? name : gear.getDisplayName().trim();
  }

  // `Gear.getWeight()`는 그램 단위 **문자열**이라 숫자로 쓰려면 캐스팅해야 한다(BS-8).
  // 무게가 비어 있는 장비가 정렬 순서를 흐트러뜨리지 않도록 NaN은 0으로 눕힌다.
  private static toGramWeight(gear: Gear) {
    const weight = Number(gear.getWeight());

    return Number.isFinite(weight) ? weight : 0;
  }

  /**
   * BS-2: **배경** 사진을 고른다. 사진은 매번 갤러리에서 고르며 권한 요청은 이 시점에만 한다.
   *
   * 폴라로이드 사진을 직접 고른 적이 없으면 `getPolaroidPhotoUri()`가 이 값으로 떨어지므로
   * 폴라로이드도 함께 바뀐다 — 직접 고른 뒤에는 배경만 바뀐다(BS-2).
   */
  public async pickPhoto() {
    await this.pickPhotoInto(PhotoPickTarget.Background, uri =>
      this.setPhotoUri(uri)
    );
  }

  /**
   * BS-3: **폴라로이드 안** 사진만 바꾼다. 이후로는 배경을 바꿔도 이 사진이 유지된다(BS-2).
   *
   * 배경을 아직 고르지 않았다면 배경부터 고르게 한다 — 사진이 없는 동안에는 캔버스 전체가
   * `사진 고르기` 안내이고 **어디를 탭하든 배경 피커가 열려야** 하기 때문이다(BS-2).
   * 그래야 폴라로이드만 채워진 채 배경이 비는 어중간한 상태도 생기지 않는다.
   */
  /**
   * 폴라로이드를 탭했을 때(BS-9) — **인화물 안 사진만** 바꾼다.
   *
   * 배경 사진이 아직 없어도 배경 피커로 넘기지 않는다. 요소를 탭하면 **그 요소에만**
   * 적용되는 것이 예측 가능하고, 배경은 배경(요소가 없는 자리)을 탭하거나 우측 상단
   * 아이콘으로 고르면 된다. 그 결과 "폴라로이드 사진만 있고 배경은 비어 있는" 상태가
   * 만들어질 수 있는데, 이것도 유효한 카드다(§6).
   */
  public async pickPolaroidPhoto() {
    await this.pickPhotoInto(PhotoPickTarget.Polaroid, uri =>
      this.setPolaroidPhotoUri(uri)
    );
  }

  /**
   * 배경·폴라로이드 사진 선택의 공통 경로(BS-2) — 권한·재진입 가드·크롭·토스트·애널리틱스가
   * 같고 **고른 사진을 어디에 담느냐만** 다르다.
   */
  private async pickPhotoInto(
    target: PhotoPickTarget,
    apply: (uri: string) => void
  ) {
    // 연타로 피커가 두 번 열리면 Android expo-image-picker가 두 번째 호출을 reject해
    // 정상적으로 피커를 보고 있는데도 실패 토스트가 뜬다. 재진입을 막는다.
    if (this.picking || this.isBusy()) {
      return;
    }

    this.setPicking(true);

    try {
      // Android는 사진 라이브러리 권한을 요청하지 않는다 — 시스템 **사진 선택 도구**(Photo Picker)가
      // 고른 항목만 넘겨주므로 권한이 필요 없다. Google Play 사진·동영상 권한 정책상
      // READ_MEDIA_IMAGES/VIDEO 선언을 걷었기 때문에(2026-08-18) 요청하면 즉시 거부로 떨어진다.
      if (Platform.OS !== 'android') {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== GRANTED) {
          this.toastManager.show({
            message:
              app.getL10n().t('bagFilmCard.photoPermission'),
          });

          return;
        }
      }

      /**
       * **크롭 편집은 폴라로이드에만 건다**(BS-2).
       *
       * 폴라로이드 안 사진 영역은 실제로 정사각이라 고르는 단계에서 1:1로 잘라야 의도한
       * 구도가 유지된다. 반면 배경은 4:5·9:16 캔버스를 `cover`로 채우므로, 1:1로 자른 뒤
       * 다시 `cover`로 잘리면 **두 번 손실**이 난다.
       *
       * 배경을 비율대로 자르게 하고 싶어도 **iOS에서는 불가능하다** — `expo-image-picker`의
       * `aspect`는 Android 전용이고 iOS의 크롭 영역은 **항상 정사각**이다(패키지 타입 문서
       * 명시). 그래서 배경은 편집을 아예 끄고 원본을 받는다.
       */
      const isPolaroid = target === PhotoPickTarget.Polaroid;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: isPolaroid,
        ...(isPolaroid ? { aspect: [1, 1] as [number, number] } : {}),
        quality: 1,
      });

      const asset = result.assets?.[0];

      if (result.canceled || !asset) {
        return;
      }

      apply(asset.uri);
      app.getAnalyticsManager()?.logClick('film_card_photo', { target });
    } catch (error) {
      console.error('필름 카드 사진 선택 실패:', error); // l10n-ignore: 개발자 로그
      this.toastManager.show({ message: app.getL10n().t('bagFilmCard.photoLoadFailed') });
    } finally {
      this.setPicking(false);
    }
  }

  // BS-5: OS 공유 시트로 이미지를 넘긴다. 앱 선택은 시스템에 맡긴다.
  public async share(capture: () => Promise<string>) {
    if (!this.enabled || this.isBusy()) {
      return;
    }

    // 어떤 요소 조합이 실제로 공유되는지가 이 기능의 다음 판단 근거라 두 불리언을 함께 담는다(BS-6).
    app.getAnalyticsManager()?.logClick('film_card_share', {
      has_polaroid: this.isElementOn(FilmCardElement.Polaroid),
      has_packing_list: this.isElementOn(FilmCardElement.PackingList),
      has_activity: this.hasActivity(),
      has_photo: this.hasPhoto(),
    });
    this.setSharing(true);

    try {
      const capturedUri = await this.captureCard(capture);

      try {
        const fileUri = BagFilmCard.toFileUri(capturedUri);
        const sharing = this.getSharing();

        if (Platform.OS === 'android') {
          if (sharing && (await sharing.isAvailableAsync())) {
            await sharing.shareAsync(fileUri);
          } else {
            this.toastManager.show({ message: app.getL10n().t('bagFilmCard.deviceShareUnavailable') });
          }
        } else {
          // iOS는 공유 시트가 닫힌 뒤에 resolve되므로, 이 await 이후 임시 파일을 지워도 안전하다.
          await Share.share({ url: fileUri });
        }
      } finally {
        BagFilmCard.releaseCapturedFile(capturedUri);
      }
    } catch (error) {
      console.error('필름 카드 공유 실패:', error); // l10n-ignore: 개발자 로그
      this.toastManager.show({ message: app.getL10n().t('bagFilmCard.shareFailed') });
    } finally {
      this.setSharing(false);
    }
  }

  // BS-5: 갤러리 저장. 읽기 권한은 필요 없어 쓰기 전용으로만 요청한다.
  public async save(capture: () => Promise<string>) {
    if (!this.enabled || this.isBusy()) {
      return;
    }

    app.getAnalyticsManager()?.logClick('film_card_save', {
      has_polaroid: this.isElementOn(FilmCardElement.Polaroid),
      has_packing_list: this.isElementOn(FilmCardElement.PackingList),
    });
    this.setSaving(true);

    try {
      const mediaLibrary = this.getMediaLibrary();

      if (!mediaLibrary) {
        return;
      }

      const { status } = await mediaLibrary.requestPermissionsAsync(true);

      if (status !== GRANTED) {
        this.toastManager.show({ message: app.getL10n().t('bagFilmCard.savePermission') });

        return;
      }

      const capturedUri = await this.captureCard(capture);

      try {
        await mediaLibrary.Asset.create(BagFilmCard.toFileUri(capturedUri));
        this.toastManager.show({ message: app.getL10n().t('bagFilmCard.saved') });
      } finally {
        BagFilmCard.releaseCapturedFile(capturedUri);
      }
    } catch (error) {
      console.error('필름 카드 저장 실패:', error); // l10n-ignore: 개발자 로그
      this.toastManager.show({ message: app.getL10n().t('bagFilmCard.saveFailed') });
    } finally {
      this.setSaving(false);
    }
  }

  // 네이티브가 돌려준 원본 경로를 그대로 반환한다 — 정규화한 `file://` URI는
  // releaseCapture의 tmp 디렉토리 접두사 검사(RNViewShot.mm)를 통과하지 못해 파일이 남는다.
  private async captureCard(capture: () => Promise<string>) {
    // 플레이스홀더가 떠 있을 때만 그것을 감춘 프레임을 기다린다. 사진을 이미 고른 경우
    // 캡처로 달라지는 화면이 없어 대기가 불필요하다.
    const needsRepaint = !this.hasPhoto();

    this.setCapturing(true);

    try {
      if (needsRepaint) {
        await BagFilmCard.waitForNextPaint();
      }

      return await capture();
    } finally {
      this.setCapturing(false);
    }
  }

  // 고정 지연은 저사양 기기에서 부족해 안내 문구가 이미지에 박힐 수 있다.
  // 다음 프레임이 그려질 때까지(rAF 2회) 기다려 커밋을 보장한다.
  private static async waitForNextPaint() {
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  // 캡처 결과는 남기지 않는다(스펙 §4) — 1080px PNG가 tmp에 쌓이지 않도록 즉시 해제한다.
  private static releaseCapturedFile(uri: string) {
    try {
      releaseCapture(uri);
    } catch (error) {
    console.warn('필름 카드 임시 파일 해제 실패:', error); // l10n-ignore: 개발자 로그
    }
  }

  // iOS 네이티브는 스킴 없는 파일 경로를 돌려줘 공유·저장 API가 그대로는 받지 못한다.
  private static toFileUri(uri: string) {
    if (uri.startsWith('file://') || uri.startsWith('content://')) {
      return uri;
    }

    return `file://${uri}`;
  }

  /**
   * `expo-media-library`는 웹 변형이 없어 `build/index.js`가 모듈 평가 시점에
   * `class Asset extends ExpoMediaLibraryNext.Asset`을 실행한다(내부 `requireNativeModule`).
   * 정적 import면 `web.output: "static"` 내보내기가 이 라우트를 평가하다 깨지므로
   * 네이티브에서 실제 사용할 때만 불러온다(NotificationManager와 동일한 패턴).
   */
  private getMediaLibrary(): MediaLibraryModule | null {
    if (!this.enabled) {
      return null;
    }

    if (this.mediaLibrary) {
      return this.mediaLibrary;
    }

    this.mediaLibrary = require('expo-media-library') as MediaLibraryModule;

    return this.mediaLibrary;
  }

  // expo-sharing 자체는 웹 변형(SharingNativeModule.web)이 있어 정적 import도 안전하지만,
  // 네이티브 전용 모듈을 한 곳에서 같은 방식으로 다루도록 위와 같은 지연 로딩을 쓴다.
  private getSharing(): SharingModule | null {
    if (!this.enabled) {
      return null;
    }

    if (this.sharingModule) {
      return this.sharingModule;
    }

    this.sharingModule = require('expo-sharing') as SharingModule;

    return this.sharingModule;
  }
}

export default BagFilmCard;
