import { makeAutoObservable } from 'mobx';
import { Platform, Share } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { releaseCapture } from 'react-native-view-shot';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
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

/**
 * 배낭 필름 카드(BS-1~BS-6) 도메인 모델.
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

  public getPhotoUri() {
    return this.photoUri;
  }

  public hasPhoto() {
    return this.photoUri !== null;
  }

  private setPhotoUri(value: string | null) {
    this.photoUri = value;
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

  // 우·작: 평균 속도. 페이스가 아니라 시속으로 표기한다(BS-4).
  public getSpeedText(): string | null {
    const activity = this.bagDetail.getActivity();

    if (!activity || activity.distance <= 0 || activity.duration <= 0) {
      return null;
    }

    const speed = (activity.distance / activity.duration) * 3.6;

    return `${speed.toFixed(1)} KM/H`;
  }

  // 운동 기록이 없을 때 우측 열을 채우는 장소명. 데이터 그대로(한글 유지) 쓴다(BS-4).
  public getPlaceText(): string | null {
    const location = this.bagDetail.getBagWeather().getLocation();

    if (!location || location.name.trim().length === 0) {
      return null;
    }

    return location.name.trim();
  }

  // BS-2: 사진은 매번 갤러리에서 고른다. 권한 요청은 이 시점에만 한다.
  public async pickPhoto() {
    // 연타로 피커가 두 번 열리면 Android expo-image-picker가 두 번째 호출을 reject해
    // 정상적으로 피커를 보고 있는데도 실패 토스트가 뜬다. 재진입을 막는다.
    if (this.picking || this.isBusy()) {
      return;
    }

    this.setPicking(true);

    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        this.toastManager.show({
          message:
            '사진 접근 권한이 필요해요. 사진 없이도 카드를 만들 수 있어요',
        });

        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        // 카드의 사진 영역이 정사각이라 고르는 단계에서 1:1로 잘라 의도한 구도를 유지한다(BS-2).
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      const asset = result.assets?.[0];

      if (result.canceled || !asset) {
        return;
      }

      this.setPhotoUri(asset.uri);
      app.getAnalyticsManager()?.logClick('film_card_photo');
    } catch (error) {
      console.error('필름 카드 사진 선택 실패:', error);
      this.toastManager.show({ message: '사진을 불러오지 못했어요' });
    } finally {
      this.setPicking(false);
    }
  }

  // BS-5: OS 공유 시트로 이미지를 넘긴다. 앱 선택은 시스템에 맡긴다.
  public async share(capture: () => Promise<string>) {
    if (!this.enabled || this.isBusy()) {
      return;
    }

    app.getAnalyticsManager()?.logClick('film_card_share', {
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
            this.toastManager.show({ message: '공유할 수 없는 기기예요' });
          }
        } else {
          // iOS는 공유 시트가 닫힌 뒤에 resolve되므로, 이 await 이후 임시 파일을 지워도 안전하다.
          await Share.share({ url: fileUri });
        }
      } finally {
        BagFilmCard.releaseCapturedFile(capturedUri);
      }
    } catch (error) {
      console.error('필름 카드 공유 실패:', error);
      this.toastManager.show({ message: '공유하지 못했어요' });
    } finally {
      this.setSharing(false);
    }
  }

  // BS-5: 갤러리 저장. 읽기 권한은 필요 없어 쓰기 전용으로만 요청한다.
  public async save(capture: () => Promise<string>) {
    if (!this.enabled || this.isBusy()) {
      return;
    }

    app.getAnalyticsManager()?.logClick('film_card_save');
    this.setSaving(true);

    try {
      const mediaLibrary = this.getMediaLibrary();

      if (!mediaLibrary) {
        return;
      }

      const { status } = await mediaLibrary.requestPermissionsAsync(true);

      if (status !== GRANTED) {
        this.toastManager.show({ message: '사진 저장 권한이 필요해요' });

        return;
      }

      const capturedUri = await this.captureCard(capture);

      try {
        await mediaLibrary.Asset.create(BagFilmCard.toFileUri(capturedUri));
        this.toastManager.show({ message: '저장했어요' });
      } finally {
        BagFilmCard.releaseCapturedFile(capturedUri);
      }
    } catch (error) {
      console.error('필름 카드 저장 실패:', error);
      this.toastManager.show({ message: '저장하지 못했어요' });
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
      console.warn('필름 카드 임시 파일 해제 실패:', error);
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
