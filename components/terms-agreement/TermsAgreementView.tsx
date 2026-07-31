import { FC, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import { useRouter } from 'expo-router';
import Layout from '../Layout';
import PretendardText from '@/components/PretendardText';
import { TERMS_OF_SERVICE_TEXT } from '@/constants/LegalTexts';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';

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

  // 체크박스 렌더링 함수
  const renderCheckbox = (
    isChecked: boolean,
    onChange: (checked: boolean) => void,
    label: string,
    isRequired: boolean = false
  ) => {
    return (
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => onChange(!isChecked)}
      >
        <View style={styles.checkboxWrapper}>
          <View
            style={[
              styles.checkbox,
              isChecked ? styles.checkboxChecked : styles.checkboxUnchecked,
            ]}
          >
            {isChecked && (
              <PretendardText style={styles.checkmark} weight="bold">
                ✓
              </PretendardText>
            )}
          </View>
        </View>
        <PretendardText
          style={styles.checkboxLabel}
          weight={isChecked ? 'bold' : 'regular'}
        >
          {label}
          {isRequired && ' (필수)'}
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
    <Layout>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <PretendardText style={styles.title} weight="bold">
          약관 동의
        </PretendardText>
        <View style={styles.sectionContainer}>
          {renderCheckbox(termsAgreed, setTermsAgreed, '이용약관 동의', true)}

          <ScrollView style={styles.termsTextContainer}>
            <PretendardText style={styles.termsText}>
              {TERMS_OF_SERVICE_TEXT}
            </PretendardText>
          </ScrollView>
        </View>

        <View style={styles.sectionContainer}>
          {renderCheckbox(
            privacyAgreed,
            setPrivacyAgreed,
            '개인정보 처리방침 동의',
            true
          )}

          <ScrollView style={styles.termsTextContainer}>
            <PretendardText style={styles.termsText}>
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
        </View>

        <View style={styles.sectionContainer}>
          {renderCheckbox(
            personalInfoAgreed,
            setPersonalInfoAgreed,
            '개인정보 수집 및 이용 동의',
            true
          )}
          <ScrollView style={styles.shortTextContainer}>
            <PretendardText style={styles.termsText}>
              {`1. 개인정보 수집목적 및 이용목적
(1) 홈페이지 회원 가입 및 관리 회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별․인증, 회원자격 유지․관리, 제한적 본인확인제 시행에 따른 본인확인, 서비스 부정 이용 방지, 만 14세 미만 아동의 개인정보 처리시 법정대리인의 동의 여부 확인, 각종 고지․통지, 고충 처리 등의 목적

2. 수집하는 개인정보 항목
이메일, Google UID, 휴대폰번호

3. 개인정보 보유 및 이용기간
회원탈퇴 시까지 (단, 관계 법령에 보존 근거가 있는 경우 해당 기간 시까지 보유)
`}
            </PretendardText>
          </ScrollView>
        </View>

        <View style={styles.sectionContainer}>
          {renderCheckbox(
            over14Agreed,
            setOver14Agreed,
            '만 14세 이상입니다.',
            true
          )}
        </View>

        <View style={styles.sectionContainer}>
          {renderCheckbox(smsAgreed, setSmsAgreed, 'SMS 수신 동의')}
        </View>

        <View style={styles.sectionContainer}>
          {renderCheckbox(
            marketingAgreed,
            setMarketingAgreed,
            '마케팅 활용 동의 및 광고 수신 동의'
          )}
          <ScrollView style={styles.shortTextContainer}>
            <PretendardText style={styles.termsText}>
              서비스와 관련된 신상품 소식, 이벤트 안내, 고객 혜택 등 다양한 정보를
              제공합니다.
            </PretendardText>
          </ScrollView>
        </View>
      </ScrollView>
      {/* 필수 전체 동의 체크박스 */}
      <View style={styles.requiredCheckboxContainer}>
        {renderCheckbox(
          allRequiredChecked,
          handleCheckAllRequired,
          '필수 항목 전체 동의',
          true
        )}
      </View>

      {/* 전체 동의 체크박스 (맨 아래) */}
      <View style={styles.allCheckboxContainer}>
        {renderCheckbox(
          allChecked,
          handleCheckAll,
          '전체 동의 (필수 및 선택 모두)',
          false
        )}
      </View>
      <TouchableOpacity
        onPress={handleSubmit}
        style={[
          styles.submitButton,
          allRequiredChecked
            ? styles.submitButtonEnabled
            : styles.submitButtonDisabled,
        ]}
        disabled={!allRequiredChecked}
      >
        <PretendardText style={styles.submitButtonText} weight="semibold">
          동의하고 계속하기
        </PretendardText>
      </TouchableOpacity>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  contentContainer: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    marginBottom: Spacing.screenH,
    color: Color.textPrimary,
  },
  sectionContainer: {
    marginBottom: Spacing.screenH,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkboxWrapper: {
    marginRight: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.listThumb,
    borderWidth: 2,
    borderColor: Color.iconMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Color.textPrimary,
    borderColor: Color.textPrimary,
  },
  checkboxUnchecked: {
    backgroundColor: Color.background,
    borderColor: Color.iconMuted,
  },
  checkmark: {
    color: Color.background,
    fontSize: 16,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 16,
    color: Color.textPrimary,
  },
  termsTextContainer: {
    maxHeight: 150,
    padding: 10,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.card,
    marginLeft: 30,
    marginTop: 10,
  },
  shortTextContainer: {
    maxHeight: 100,
    padding: 10,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.card,
    marginLeft: 30,
    marginTop: 10,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
    color: Color.textTertiary,
  },
  requiredCheckboxContainer: {
    backgroundColor: Color.surfaceMuted,
    borderWidth: 1.5,
    borderColor: Color.borderLight,
    borderRadius: Radius.card,
    padding: 16,
    marginTop: Spacing.section,
    marginBottom: 10,
  },
  allCheckboxContainer: {
    backgroundColor: Color.surfaceMuted,
    borderWidth: 1.5,
    borderColor: Color.borderLight,
    borderRadius: Radius.card,
    padding: 16,
    marginBottom: Spacing.screenH,
  },
  submitButton: {
    padding: 15,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonEnabled: {
    backgroundColor: Color.textPrimary,
  },
  submitButtonDisabled: {
    backgroundColor: Color.textSecondary,
  },
  submitButtonText: {
    color: Color.background,
    fontSize: 16,
  },
});

export default observer(TermsAgreementView);
