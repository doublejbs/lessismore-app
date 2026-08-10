import { FC, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import app from '@/model/app/App';
import { useRouter } from 'expo-router';
import Layout from '../Layout';
import PretendardText from '@/components/PretendardText';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import { TERMS_OF_SERVICE_TEXT } from '@/constants/LegalTexts';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

// 체크 원 지름 — 26은 시각 크기이고 터치 타깃은 행 전체(최소 44)다.
const CHECK_SIZE = 26;

const TermsAgreementView: FC = () => {
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [personalInfoAgreed, setPersonalInfoAgreed] = useState(false);
  const [over14Agreed, setOver14Agreed] = useState(false);
  const [smsAgreed, setSmsAgreed] = useState(false);
  const firebase = app.getFirebase();
  const router = useRouter();

  const allRequiredChecked =
    termsAgreed && privacyAgreed && personalInfoAgreed && over14Agreed;

  const handleSubmit = async () => {
    if (!allRequiredChecked) {
      Alert.alert(
        '동의 필요',
        '필수 항목을 모두 동의해야 서비스를 이용할 수 있습니다.'
      );
      return;
    }

    try {
      await firebase.termsAgreed(
        marketingAgreed,
        smsAgreed,
        termsAgreed,
        privacyAgreed,
        personalInfoAgreed,
        over14Agreed
      );
      // 약관 동의 후 앱 첫 화면으로 — 창고가 아니라 홈이다(HM-0).
      router.replace('/');
    } catch (error) {
      console.error('약관 동의 저장 오류:', error);
      Alert.alert(
        '오류',
        '약관 동의 정보를 저장하는 중 오류가 발생했습니다. 다시 시도해주세요.'
      );
    }
  };

  // 체크박스 렌더링 함수. 체크 원만 상태를 말하고 라벨 굵기는 고정한다 —
  // 굵기가 튀면 카드가 줄줄이 놓인 목록의 리듬이 깨진다.
  const renderCheckbox = (
    isChecked: boolean,
    onChange: (checked: boolean) => void,
    label: string,
    isRequired: boolean = false
  ) => {
    return (
      <TouchableOpacity
        style={styles.checkRow}
        onPress={() => onChange(!isChecked)}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='checkbox'
        accessibilityState={{ checked: isChecked }}
      >
        <View
          style={[
            styles.check,
            isChecked ? styles.checkFill : styles.checkOutline,
          ]}
        >
          {isChecked ? (
            <Ionicons name='checkmark' size={16} color={Liquid.lime} />
          ) : null}
        </View>
        <PretendardText style={styles.checkLabel} weight='medium'>
          {label}
          {isRequired ? (
            <PretendardText style={styles.requiredMark}> (필수)</PretendardText>
          ) : null}
        </PretendardText>
      </TouchableOpacity>
    );
  };

  // 전체 동의 체크박스 핸들러
  const handleCheckAllRequired = (checked: boolean) => {
    setTermsAgreed(checked);
    setPrivacyAgreed(checked);
    setPersonalInfoAgreed(checked);
    setOver14Agreed(checked);
  };
  const handleCheckAll = (checked: boolean) => {
    setTermsAgreed(checked);
    setPrivacyAgreed(checked);
    setPersonalInfoAgreed(checked);
    setOver14Agreed(checked);
    setMarketingAgreed(checked);
    setSmsAgreed(checked);
  };
  const allChecked = allRequiredChecked && marketingAgreed && smsAgreed;

  return (
    <Layout
      paddingHorizontal={LiquidLayout.screenH}
      background={<LiquidBackdrop screen='none' glowPosition='topLeft' />}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.titleBlock}>
          <PretendardText style={styles.title} weight='bold'>
            약관 동의
          </PretendardText>
          <PretendardText style={styles.subtitle}>
            필수 항목에 동의하면 시작할 수 있어요
          </PretendardText>
        </View>

        <LiquidCard style={styles.itemCard}>
          {renderCheckbox(termsAgreed, setTermsAgreed, '이용약관 동의', true)}

          <ScrollView style={styles.legalBox}>
            <PretendardText style={styles.legalText}>
              {TERMS_OF_SERVICE_TEXT}
            </PretendardText>
          </ScrollView>
        </LiquidCard>

        <LiquidCard style={styles.itemCard}>
          {renderCheckbox(
            privacyAgreed,
            setPrivacyAgreed,
            '개인정보 처리방침 동의',
            true
          )}

          <ScrollView style={styles.legalBox}>
            <PretendardText style={styles.legalText}>
              {`Useless(이하 '회사'라 한다)는 개인정보 보호법 제30조에 따라 정보 주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리지침을 수립, 공개합니다.

제1조 (개인정보의 처리목적)
회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.

1. 홈페이지 회원 가입 및 관리
회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별․인증, 회원자격 유지․관리, 제한적 본인확인제 시행에 따른 본인확인, 서비스 부정 이용 방지, 만 14세 미만 아동의 개인정보처리 시 법정대리인의 동의 여부 확인, 각종 고지․통지, 고충 처리 등을 목적으로 개인정보를 처리합니다.

(이하 개인정보 처리방침 계속...)

제13조(개인정보 처리방침 시행 및 변경)
이 개인정보 처리방침은 2025. 4. 1. 부터 적용됩니다.
`}
            </PretendardText>
          </ScrollView>
        </LiquidCard>

        <LiquidCard style={styles.itemCard}>
          {renderCheckbox(
            personalInfoAgreed,
            setPersonalInfoAgreed,
            '개인정보 수집 및 이용 동의',
            true
          )}
          <ScrollView style={styles.legalBoxShort}>
            <PretendardText style={styles.legalText}>
              {`1. 개인정보 수집목적 및 이용목적
(1) 홈페이지 회원 가입 및 관리 회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별․인증, 회원자격 유지․관리, 제한적 본인확인제 시행에 따른 본인확인, 서비스 부정 이용 방지, 만 14세 미만 아동의 개인정보 처리시 법정대리인의 동의 여부 확인, 각종 고지․통지, 고충 처리 등의 목적

2. 수집하는 개인정보 항목
이메일, Google UID, 휴대폰번호

3. 개인정보 보유 및 이용기간
회원탈퇴 시까지 (단, 관계 법령에 보존 근거가 있는 경우 해당 기간 시까지 보유)
`}
            </PretendardText>
          </ScrollView>
        </LiquidCard>

        <LiquidCard style={styles.itemCard}>
          {renderCheckbox(
            over14Agreed,
            setOver14Agreed,
            '만 14세 이상입니다.',
            true
          )}
        </LiquidCard>

        <LiquidCard style={styles.itemCard}>
          {renderCheckbox(smsAgreed, setSmsAgreed, 'SMS 수신 동의')}
        </LiquidCard>

        <LiquidCard style={styles.itemCard}>
          {renderCheckbox(
            marketingAgreed,
            setMarketingAgreed,
            '마케팅 활용 동의 및 광고 수신 동의'
          )}
          <ScrollView style={styles.legalBoxShort}>
            <PretendardText style={styles.legalText}>
              서비스와 관련된 신상품 소식, 이벤트 안내, 고객 혜택 등 다양한
              정보를 제공합니다.
            </PretendardText>
          </ScrollView>
        </LiquidCard>
      </ScrollView>

      <View style={styles.footer}>
        {/* 필수 전체 동의 — 이 화면의 주 결정이라 흰 카드로 세운다. */}
        <LiquidCard>
          {renderCheckbox(
            allRequiredChecked,
            handleCheckAllRequired,
            '필수 항목 전체 동의',
            true
          )}
        </LiquidCard>

        {/* 선택 항목까지 포함하는 보조 동의라 한 단계 가라앉힌다. */}
        <LiquidCard tone='quiet'>
          {renderCheckbox(
            allChecked,
            handleCheckAll,
            '전체 동의 (필수 및 선택 모두)',
            false
          )}
        </LiquidCard>

        <LiquidPillButton
          variant='primary'
          block
          label='동의하고 계속하기'
          onPress={handleSubmit}
          disabled={!allRequiredChecked}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: 24,
  },
  titleBlock: {
    paddingTop: 18,
    paddingBottom: LiquidLayout.cardPad,
  },
  title: {
    fontSize: LiquidType.title1.fontSize,
    lineHeight: LiquidType.title1.lineHeight,
    letterSpacing: LiquidType.title1.letterSpacing,
    color: Liquid.ink,
  },
  subtitle: {
    marginTop: 6,
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
  },
  itemCard: {
    marginBottom: LiquidLayout.listGap,
  },
  // 고정 높이를 주지 않는다 — Dynamic Type에서 라벨이 잘린다. minHeight로 44pt를 만든다.
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: LiquidLayout.touchMin,
  },
  check: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: CHECK_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 빈 원도 항상 보인다 — 고를 수 있는 항목임을 드러낸다.
  checkOutline: {
    borderWidth: 1.5,
    borderColor: Liquid.inkFaint,
  },
  checkFill: {
    backgroundColor: Liquid.ink,
  },
  checkLabel: {
    flex: 1,
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
  },
  requiredMark: {
    fontSize: LiquidType.caption.fontSize,
    color: Liquid.inkTertiary,
  },
  // 카드 안 타일 — 전문은 구획이 아니라 카드 안의 한 덩어리다.
  legalBox: {
    maxHeight: 150,
    marginTop: 12,
    padding: 12,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surfaceSunken,
  },
  legalBoxShort: {
    maxHeight: 100,
    marginTop: 12,
    padding: 12,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surfaceSunken,
  },
  legalText: {
    fontSize: LiquidType.caption.fontSize,
    // 좁은 타일 안에서 여러 조항을 잇는 전문이라 caption(17)보다 줄간을 벌린다.
    lineHeight: 19,
    color: Liquid.inkSecondary,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 8,
    gap: LiquidLayout.listGap,
  },
});

export default observer(TermsAgreementView);
