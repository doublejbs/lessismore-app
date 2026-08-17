import { makeAutoObservable } from 'mobx';
import { Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import app from '../app/App';
import AlertManager from '../alert/AlertManager';
import ToastManager from '../toast/ToastManager';
import GearStore from '../store/GearStore';
import GearImageStorage from '../firebase/GearImageStorage';
import GearImageSheet from './GearImageSheet';
import GearImageSource from './GearImageSource';

// 웹에는 앱 설정 화면이 없다 — react-native-web의 Linking에는 openSettings 자체가 없어
// 호출하면 TypeError가 난다. 안내 문구만 남기고 이동 경로는 네이티브에서만 제시한다.
const CAN_OPEN_SETTINGS = Platform.OS !== 'web';

// 정사각 크롭 — 사진이 나타나는 세 표면(장비 상세·창고 목록·배낭 상세 행)이 모두 정사각이라
// 고르는 단계에서 잘라 받아야 의도한 구도가 유지된다. `aspect`는 Android 전용이고
// iOS 크롭 영역은 항상 정사각이라(BagFilmCard 주석 참고) 두 플랫폼 결과가 같다.
const CROP_ASPECT: [number, number] = [1, 1];

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: CROP_ASPECT,
  // 원본은 수 MB라 업로드가 느리고 Storage 용량만 먹는다. 썸네일·상세 표시에는 이 정도로 충분하다.
  quality: 0.8,
};

/**
 * 장비 상세의 내 사진 업로드(GD-13) 도메인 모델.
 *
 * 화면에 보이는 사진의 **단일 소스**다 — 진입 시 `Gear.getImageUrl()`로 한 번 씨를 받고,
 * 이후 업로드·삭제 결과를 여기서 들고 있어 Firestore를 다시 읽지 않고도 즉시 반영된다
 * (`Gear`는 불변이라 갱신하려면 상세 전체를 재조회해야 한다).
 *
 * **보유 장비(`isAdded`)에서만 만든다** — 저장할 문서(`users/{uid}/gears/{id}`)가 없는
 * 카탈로그 장비에는 업로드 UI 자체를 두지 않는다(GD-13).
 */
class GearImageUpload {
  /**
   * `GearImageStorage`는 App 싱글톤에 배선하지 않고 여기서 만든다 — 상태가 없는 얇은
   * Storage 접근자이고 소비처가 이 모델 하나뿐이라, 앱 전역 서비스로 올리면 초기화 순서만
   * 늘고 얻는 게 없다. 의존성을 팩토리에서 조립하는 것은 `WarehouseDetail.new()`가
   * `SearchDispatcher`·`Order`를 만드는 것과 같은 패턴이다.
   */
  public static from(gearId: string, imageUrl: string | undefined) {
    return new GearImageUpload(
      gearId,
      imageUrl,
      app.getGearStore()!,
      GearImageStorage.from(app.getFirebase()),
      app.getAlertManager()!,
      app.getToastManager()!
    );
  }

  private sheet: GearImageSheet = GearImageSheet.None;
  // 업로드·삭제가 도는 동안 true — 진행 인디케이터 노출과 중복 실행 차단을 함께 맡는다.
  private busy = false;
  // 피커가 열려 있는 동안의 재진입 가드. 화면에는 아무것도 띄우지 않으므로 busy와 분리한다.
  private picking = false;
  // 이미지 로드 실패 여부. 2024~2026 업로드분에는 참조가 끊긴 URL이 섞여 있어
  // (DataModel §1) URL이 있어도 그려지지 않을 수 있다.
  private loadFailed = false;

  private constructor(
    private readonly gearId: string,
    private imageUrl: string | undefined,
    private readonly gearStore: GearStore,
    private readonly gearImageStorage: GearImageStorage,
    private readonly alertManager: AlertManager,
    private readonly toastManager: ToastManager
  ) {
    makeAutoObservable(this);
  }

  /**
   * 화면에 그릴 사진 URL. 로드에 실패한 URL은 **없는 것과 똑같이** 사진 없음으로 떨어뜨려
   * 깨진 아이콘 대신 `사진 추가` 영역이 보이게 한다(GD-13).
   * 없음은 `Gear.getImageUrl()`과 같은 undefined로 통일한다 — 경계마다 null/undefined를
   * 변환하면 어느 쪽이 참인지 헷갈린다.
   */
  public getVisibleImageUrl(): string | undefined {
    if (this.loadFailed) {
      return undefined;
    }

    return this.imageUrl;
  }

  public isBusy() {
    return this.busy;
  }

  public isSheetVisible() {
    return this.sheet !== GearImageSheet.None;
  }

  public isSourceSheet() {
    return this.sheet === GearImageSheet.Source;
  }

  // 사진이 없을 때의 진입점(`사진 추가`) — 출처 선택 시트를 연다.
  public openSourceSheet() {
    if (this.busy) {
      return;
    }

    this.setSheet(GearImageSheet.Source);
  }

  // 사진을 탭했을 때의 진입점 — 교체·삭제 시트를 연다.
  public openActionSheet() {
    if (this.busy) {
      return;
    }

    this.setSheet(GearImageSheet.Action);
  }

  public closeSheet() {
    this.setSheet(GearImageSheet.None);
  }

  // 교체는 같은 시트에서 출처 선택으로 이어진다(GearImageSheet 주석 — 시트가 하나인 이유).
  public replaceImage() {
    this.setSheet(GearImageSheet.Source);
  }

  /**
   * 참조가 끊긴 레거시 URL이면 로드가 실패한다(DataModel §1).
   * 실패를 화면에 드러내지 않고 사진 없음 상태로 되돌린다(GD-13).
   */
  public markImageLoadFailed() {
    this.setLoadFailed(true);
  }

  /**
   * 앨범·카메라에서 사진을 골라 올린다(GD-13).
   *
   * 권한 거부는 **사용자의 선택**이라 실패로 다루되 에러 문구는 띄우지 않는다 —
   * 무엇이 필요한지 알리는 알럿과 설정 이동 경로만 제시한다.
   */
  public async pickImage(source: GearImageSource) {
    // 연타로 피커가 두 번 열리면 Android expo-image-picker가 두 번째 호출을 reject해
    // 정상적으로 피커를 보고 있는데도 실패 토스트가 뜬다(BagFilmCard와 같은 가드).
    if (this.picking || this.busy) {
      return;
    }

    this.closeSheet();
    this.setPicking(true);

    try {
      const permission = await this.requestPermission(source);

      if (!permission) {
        this.showPermissionAlert(source);

        return;
      }

      const result =
        source === GearImageSource.Camera
          ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
          : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      const asset = result.assets?.[0];

      if (result.canceled || !asset) {
        return;
      }

      await this.uploadImage(asset.uri, source);
    } catch (error) {
      console.error('장비 사진 선택 실패:', error);
      this.toastManager.show({ message: '사진을 불러오지 못했어요' });
    } finally {
      this.setPicking(false);
    }
  }

  // 삭제는 되돌릴 수 없으므로 확인 다이얼로그를 거친다(GD-13).
  public confirmDelete() {
    this.closeSheet();

    if (!this.imageUrl) {
      return;
    }

    this.alertManager.show({
      message: '사진을 삭제할까요?',
      confirmText: '삭제하기',
      failureMessage: '삭제하지 못했어요. 다시 시도해주세요.',
      onConfirm: async () => {
        await this.deleteImage();
      },
    });
  }

  private async requestPermission(source: GearImageSource) {
    const response =
      source === GearImageSource.Camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    return response.granted;
  }

  private showPermissionAlert(source: GearImageSource) {
    const target = source === GearImageSource.Camera ? '카메라' : '사진 접근';

    this.alertManager.show({
      message: `${target} 권한이 필요해요. 설정에서 권한을 허용해 주세요.`,
      confirmText: CAN_OPEN_SETTINGS ? '설정 열기' : '확인',
      onConfirm: async () => {
        if (!CAN_OPEN_SETTINGS) {
          return;
        }

        try {
          await Linking.openSettings();
        } catch (error) {
          console.error('설정 열기 실패:', error);
        }
      },
    });
  }

  /**
   * 업로드 순서: **Storage 성공 → Firestore 갱신 → 이전 파일 정리**(GD-13, DM-9).
   *
   * 문서를 먼저 갱신하면 업로드가 실패했을 때 `imageUrl`이 존재하지 않는 파일을 가리킨다.
   * 실패하면 기존 상태를 그대로 두고 토스트로만 알린다.
   */
  private async uploadImage(localUri: string, source: GearImageSource) {
    const previousUrl = this.imageUrl;

    // AN-3: 신규 업로드와 교체를 mode로 가른다(click_gear_save의 create|edit와 같은 방식).
    // 성공이 아니라 **시도** 시점에 보내야 실패율을 볼 수 있다.
    app.getAnalyticsManager()?.logClick('gear_photo_upload', {
      source,
      mode: previousUrl ? 'replace' : 'create',
    });

    this.setBusy(true);

    try {
      const uploadedUrl = await this.gearImageStorage.uploadImage(localUri);

      try {
        await this.gearStore.saveImageUrl(this.gearId, uploadedUrl);
      } catch (error) {
        // 문서 갱신이 실패하면 방금 올린 파일은 아무도 참조하지 않는다 — 회수 경로가
        // 없으므로(DM-9) 여기서 지우고 실패로 넘긴다.
        await this.deleteStorageFile(uploadedUrl);

        throw error;
      }

      this.setImageUrl(uploadedUrl);
      this.setLoadFailed(false);

      // 교체면 이전 파일을 함께 지운다(DM-9). 화면 상태는 이미 새 사진으로 확정됐으니
      // 정리 실패가 사용자에게 보이는 실패가 되지는 않는다.
      if (previousUrl) {
        await this.deleteStorageFile(previousUrl);
      }
    } catch (error) {
      console.error('장비 사진 업로드 실패:', error);
      this.toastManager.show({ message: '사진을 올리지 못했어요' });
    } finally {
      this.setBusy(false);
    }
  }

  /**
   * 삭제 순서: **Firestore 참조 제거 → Storage 파일 삭제**(GD-13, DM-9).
   *
   * 업로드와 순서가 반대인 이유는 실패했을 때 남는 상태가 다르기 때문이다 — 파일을 먼저
   * 지우면 중간 실패 시 문서가 없는 파일을 가리키는 깨진 참조가 남지만, 참조를 먼저 끊으면
   * 최악이라도 참조 없는 파일이 남을 뿐 화면은 멀쩡하다.
   */
  private async deleteImage() {
    const targetUrl = this.imageUrl;

    if (!targetUrl || this.busy) {
      return;
    }

    // AN-3: 확인 다이얼로그를 지난 삭제 확정만 센다(click_gear_delete와 같은 기준).
    app.getAnalyticsManager()?.logClick('gear_photo_delete');

    this.setBusy(true);

    try {
      await this.gearStore.removeImageUrl(this.gearId);
      this.setImageUrl(undefined);
      this.setLoadFailed(false);
      await this.deleteStorageFile(targetUrl);
    } catch (error) {
      console.error('장비 사진 삭제 실패:', error);
      this.toastManager.show({ message: '사진을 지우지 못했어요' });
    } finally {
      this.setBusy(false);
    }
  }

  // 파일 정리는 화면 결과를 바꾸지 않는다 — 실패해도 조용히 넘긴다(DM-9).
  private async deleteStorageFile(url: string) {
    try {
      await this.gearImageStorage.deleteImage(url);
    } catch (error) {
      console.error('장비 사진 파일 삭제 실패:', error);
    }
  }

  private setSheet(value: GearImageSheet) {
    this.sheet = value;
  }

  private setBusy(value: boolean) {
    this.busy = value;
  }

  private setPicking(value: boolean) {
    this.picking = value;
  }

  private setLoadFailed(value: boolean) {
    this.loadFailed = value;
  }

  private setImageUrl(value: string | undefined) {
    this.imageUrl = value;
  }
}

export default GearImageUpload;
