import { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  InputAccessoryView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import StarRatingView from '@/components/camp-site/StarRatingView';
import CampSiteBagSelectSheetView from '@/components/camp-site/CampSiteBagSelectSheetView';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import LiquidFieldLabel from '@/components/liquid/LiquidFieldLabel';
import { takeCampReviewWrite } from '@/model/camp-review/CampReviewWriteHandoff';
import BagItem from '@/model/bag/BagItem';
import { CampReviewInput } from '@/model/camp-review/CampReviewTypes';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

const MAX_CONTENT_LENGTH = 1000;
// iOS 멀티라인 입력은 리턴키로 키보드를 못 닫으므로 키보드 위 '완료' 액세서리를 붙인다.
const CONTENT_ACCESSORY_ID = 'campReviewContentAccessory';

// 첨부 배낭의 표시/저장 스냅샷 — 실 배낭(BagItem) 선택분과 수정 시 기존 후기 스냅샷을 함께 다룬다.
interface AttachedBag {
  bagId: string;
  bagName: string;
  bagDate: string;
  bagWeight: string;
}

// BagItem을 첨부 스냅샷으로 변환한다. getWeight()는 number(kg)라 소수 2자리 문자열로 맞춘다.
const toAttachedBag = (bag: BagItem): AttachedBag => ({
  bagId: bag.getID(),
  bagName: bag.getName(),
  bagDate: bag.getDate(),
  bagWeight: bag.getWeight().toFixed(2),
});

// CS-8: 박지 후기 작성/수정 화면 — 네이티브 formSheet 라우트. 상태를 직접 소유한다.
const CampReviewWriteScreen = () => {
  const router = useRouter();
  // 마운트 시 핸드오프 파라미터를 1회 소비한다. 없으면 잘못된 진입이므로 즉시 닫는다.
  const paramsRef = useRef(takeCampReviewWrite());
  const params = paramsRef.current;
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';

  const existing = params?.existing ?? null;
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [content, setContent] = useState(existing?.content ?? '');
  const [attachedBag, setAttachedBag] = useState<AttachedBag | null>(
    // 수정 진입 시 기존 후기 스냅샷으로 우선 프리필한다(목록 로드 전에도 칩 표시).
    existing?.bagId
      ? {
          bagId: existing.bagId,
          bagName: existing.bagName ?? '',
          bagDate: existing.bagDate ?? '',
          bagWeight: existing.bagWeight ?? '',
        }
      : null
  );
  const [bags, setBags] = useState<BagItem[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 파라미터 없이 진입한 경우(딥링크 오조작 등) 즉시 닫는다.
  useEffect(() => {
    if (!params) {
      router.back();
    }
  }, [params, router]);

  // 배낭 목록을 로드하고, 수정 진입분은 실제 배낭 데이터로 스냅샷을 갱신한다.
  useEffect(() => {
    let active = true;

    const loadBags = async () => {
      try {
        const list = (await app.getBagStore()?.getList()) ?? [];

        if (!active) {
          return;
        }

        setBags(list);

        if (existing?.bagId) {
          const matched = list.find(bag => bag.getID() === existing.bagId);

          if (matched) {
            setAttachedBag(toAttachedBag(matched));
          }
        }
      } catch (error) {
        console.error('배낭 목록 로드 중 오류 발생:', error);
      }
    };

    void loadBags();

    return () => {
      active = false;
    };
  }, [existing]);

  const handleSelectBag = (bag: BagItem) => {
    setAttachedBag(toAttachedBag(bag));
    setSheetVisible(false);
  };

  const handleRemoveBag = () => {
    setAttachedBag(null);
  };

  const handleSubmit = async () => {
    if (submitting || !params) {
      return;
    }

    if (rating === 0) {
      return;
    }

    // 로그인 확인 — 미로그인이면 로그인 유도 후 중단한다.
    if (!app.getFirebase().isLoggedIn()) {
      app.getLogInAlertManager()?.show();

      return;
    }

    const userId = app.getFirebase().getUserId();
    const authorName = app.getFirebase().getNickname();
    const trimmedContent = content.trim();

    const input: CampReviewInput = {
      authorName,
      rating,
    };

    if (trimmedContent.length > 0) {
      input.content = trimmedContent;
    }

    if (attachedBag) {
      input.bagId = attachedBag.bagId;
      input.bagName = attachedBag.bagName;
      input.bagDate = attachedBag.bagDate;
      input.bagWeight = attachedBag.bagWeight;
    }

    setSubmitting(true);

    try {
      await app.getCampReviewStore()!.saveReview(params.spotId, userId, input);

      // 배낭을 첨부했으면 해당 배낭을 후기 공유 상태로 표시한다.
      if (attachedBag) {
        await app
          .getBagStore()!
          .updateReviewShared(attachedBag.bagId, userId, true);
      }

      // 저장 계측(CS-8) — click이 아닌 submit 이벤트라 logEvent로 직접 보낸다.
      app.getAnalyticsManager()?.logEvent('submit_camp_site_review', {
        rating,
        has_bag: attachedBag ? true : false,
      });

      params.onComplete();
      router.back();
    } catch (error) {
      console.error('후기 저장 중 오류 발생:', error);
      Alert.alert('오류', '후기 저장에 실패했어요. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const title = existing ? '내 후기 수정' : '후기 쓰기';
  const confirmDisabled = rating === 0 || submitting;

  // 본문(별점 + 후기 글 + 다녀온 배낭) — Android는 스크롤 컨테이너로 감싼다.
  const bodyContent = (
    <>
      <PretendardText weight='bold' style={styles.title}>
        {title}
      </PretendardText>

      <View style={styles.section}>
        <LiquidFieldLabel>별점</LiquidFieldLabel>
        <StarRatingView editable rating={rating} onChange={setRating} />
      </View>

      <View style={styles.section}>
        <LiquidFieldLabel>후기 글</LiquidFieldLabel>
        <TextInput
          style={styles.contentInput}
          placeholder='이 박지는 어땠나요? (선택)'
          placeholderTextColor={Liquid.inkMuted}
          value={content}
          onChangeText={setContent}
          maxLength={MAX_CONTENT_LENGTH}
          multiline
          textAlignVertical='top'
          inputAccessoryViewID={isAndroid ? undefined : CONTENT_ACCESSORY_ID}
          accessibilityLabel='후기 글'
        />
        <PretendardText style={styles.counter}>
          {content.length}/{MAX_CONTENT_LENGTH}
        </PretendardText>
      </View>

      <View style={styles.section}>
        <LiquidFieldLabel>다녀온 배낭</LiquidFieldLabel>
        {attachedBag ? (
          <View style={styles.bagChip}>
            <View style={styles.bagChipText}>
              <PretendardText
                weight='semibold'
                style={styles.bagChipName}
                numberOfLines={1}
              >
                {attachedBag.bagName}
              </PretendardText>
              <PretendardText style={styles.bagChipMeta} numberOfLines={1}>
                {[attachedBag.bagDate, `${attachedBag.bagWeight}kg`]
                  .filter(Boolean)
                  .join(' · ')}
              </PretendardText>
            </View>
            <TouchableOpacity
              onPress={handleRemoveBag}
              style={styles.bagChipRemove}
              activeOpacity={LiquidMotion.pressOpacity}
              accessibilityRole='button'
              accessibilityLabel='배낭 첨부 해제'
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name='close' size={20} color={Liquid.inkSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.bagSelectRow}
            onPress={() => setSheetVisible(true)}
            activeOpacity={LiquidMotion.pressOpacity}
            accessibilityRole='button'
            accessibilityLabel='배낭 선택'
          >
            <Ionicons
              name='briefcase-outline'
              size={20}
              color={Liquid.inkSecondary}
            />
            <PretendardText style={styles.bagSelectText}>
              배낭 선택
            </PretendardText>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <View
      style={[
        styles.container,
        isAndroid && styles.containerFill,
        {
          // Android formSheet는 제스처 바 인셋을 제대로 못 잡아 하단 패딩을 넉넉히 확보한다.
          paddingBottom: isAndroid
            ? Math.max(insets.bottom, 24)
            : Math.max(insets.bottom - 12, 12),
        },
      ]}
    >
      {isAndroid ? (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
          keyboardDismissMode='on-drag'
        >
          {bodyContent}
        </ScrollView>
      ) : (
        // iOS: 빈 영역을 탭하면 키보드를 닫는다(멀티라인 입력 대응).
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.body}>{bodyContent}</View>
        </TouchableWithoutFeedback>
      )}

      <View style={styles.buttonContainer}>
        <LiquidPillButton
          label='취소'
          variant='secondary'
          onPress={() => router.back()}
          style={styles.button}
        />
        {/* 저장 중에도 라벨을 유지하고 앞에 진행 표시만 붙인다 — 라벨이 사라지면
            무엇을 기다리는지 알 수 없다(공유 시트 BD-7과 같은 처리). */}
        <LiquidPillButton
          label='확인'
          variant='primary'
          onPress={handleSubmit}
          disabled={confirmDisabled}
          busy={submitting}
          leading={
            submitting ? <ActivityIndicator color={Liquid.surface} /> : null
          }
          style={styles.button}
        />
      </View>

      <CampSiteBagSelectSheetView
        visible={sheetVisible}
        bags={bags}
        spotName={params?.spotName ?? ''}
        onClose={() => setSheetVisible(false)}
        onSelect={handleSelectBag}
        onCreateNew={() => setSheetVisible(false)}
        hideCreateNew
        subtitleOverride='다녀온 배낭을 선택해요'
      />

      {/* iOS 키보드 위 '완료' 바 — 멀티라인 입력에서 키보드를 내린다. */}
      {!isAndroid && (
        <InputAccessoryView nativeID={CONTENT_ACCESSORY_ID}>
          <View style={styles.accessoryBar}>
            <TouchableOpacity
              onPress={() => Keyboard.dismiss()}
              accessibilityRole='button'
              accessibilityLabel='키보드 닫기'
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <PretendardText weight='semibold' style={styles.accessoryDone}>
                완료
              </PretendardText>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // 폼 시트는 종이 면이다 — 지면 위 카드가 아니라 입력이 곧 화면이라 카드를 겹치지 않는다
    // (입력·선택 면만 `surfaceSunken`으로 가라앉힌다).
    backgroundColor: Liquid.surface,
    // 네이티브 그래버가 시트 상단에 겹쳐 렌더되므로 그 아래로 제목이 오도록 여백을 준다.
    paddingTop: 52,
  },
  // Android는 고정 높이(0.9) 시트라 컨테이너를 채워 버튼을 하단에 고정한다.
  containerFill: {
    flex: 1,
  },
  bodyScroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: LiquidLayout.screenH,
    marginBottom: 20,
  },
  title: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
    marginBottom: 24,
  },
  // 라벨(`LiquidFieldLabel`)이 자기 아래 여백 10을 들고 있어 gap을 겹치지 않는다.
  section: {
    flexDirection: 'column',
    marginBottom: LiquidLayout.section,
  },
  /**
   * `PretendardText`를 쓸 수 없는 자리라 서체를 직접 건다(TextInput 예외).
   * 여러 줄 입력이라 모서리는 알약이 아니라 타일(20)이다.
   */
  contentInput: {
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surfaceSunken,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: LiquidType.body.fontSize,
    fontFamily: 'Pretendard-Medium',
    color: Liquid.ink,
    minHeight: 100,
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: 6,
    fontSize: LiquidType.caption.fontSize,
    lineHeight: LiquidType.caption.lineHeight,
    color: Liquid.inkMuted,
  },
  bagSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: LiquidLayout.pillHeight,
    paddingHorizontal: 16,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surfaceSunken,
  },
  bagSelectText: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.inkSecondary,
  },
  bagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surfaceSunken,
  },
  bagChipText: {
    flex: 1,
    gap: 2,
  },
  bagChipName: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
  },
  bagChipMeta: {
    fontSize: LiquidType.caption.fontSize,
    lineHeight: LiquidType.caption.lineHeight,
    color: Liquid.inkTertiary,
  },
  bagChipRemove: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: LiquidLayout.listGap,
    paddingHorizontal: LiquidLayout.screenH,
  },
  button: {
    flex: 1,
  },
  accessoryBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Liquid.surfaceSunken,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Liquid.hairline,
  },
  accessoryDone: {
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

export default CampReviewWriteScreen;
