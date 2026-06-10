import React, { FC, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import { useRouter } from 'expo-router';
import Layout from '../Layout';

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
      router.replace('/(tabs)');
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
            {isChecked && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </View>
        <Text
          style={[styles.checkboxLabel, isChecked && styles.checkboxLabelBold]}
        >
          {label}
          {isRequired && ' (필수)'}
        </Text>
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
        <Text style={styles.title}>약관 동의</Text>
        <View style={styles.sectionContainer}>
          {renderCheckbox(termsAgreed, setTermsAgreed, '이용약관 동의', true)}

          <ScrollView style={styles.termsTextContainer}>
            <Text style={styles.termsText}>
              {`
제1조 목적
본 이용약관은 "Useless"(이하 "사이트")의 서비스의 이용조건과 운영에 관한 제반 사항 규정을 목적으로 합니다.

제2조 용어의 정의
본 약관에서 사용되는 주요한 용어의 정의는 다음과 같습니다.
① 회원 : 사이트의 약관에 동의하고 개인정보를 제공하여 회원등록을 한 자로서, 사이트와의 이용계약을 체결하고 사이트를 이용하는 이용자를 말합니다.
② 이용계약 : 사이트 이용과 관련하여 사이트와 회원간에 체결 하는 계약을 말합니다.
③ 회원 아이디(이하 "ID") : 회원의 식별과 회원의 서비스 이용을 위하여 회원별로 부여하는 고유한 문자와 숫자의 조합을 말합니다.
④ 비밀번호 : 회원이 부여받은 ID와 일치된 회원임을 확인하고 회원의 권익 보호를 위하여 회원이 선정한 문자와 숫자의 조합을 말합니다.
⑤ 운영자 : 서비스에 홈페이지를 개설하여 운영하는 운영자를 말합니다.
⑥ 해지 : 회원이 이용계약을 해약하는 것을 말합니다.

제3조 약관 외 준칙
운영자는 필요한 경우 별도로 운영정책을 공지 안내할 수 있으며, 본 약관과 운영정책이 중첩될 경우 운영정책이 우선 적용됩니다.

제4조 이용계약 체결
① 이용계약은 회원으로 등록하여 사이트를 이용하려는 자의 본 약관 내용에 대한 동의와 가입신청에 대하여 운영자의 이용승낙으로 성립합니다.
② 회원으로 등록하여 서비스를 이용하려는 자는 사이트 가입신청 시 본 약관을 읽고 아래에 있는 "동의합니다"를 선택하는 것으로 본 약관에 대한 동의 의사 표시를 합니다.

제5조 서비스 이용 신청
① 회원으로 등록하여 사이트를 이용하려는 이용자는 사이트에서 요청하는 제반정보(이용자ID,비밀번호, 닉네임 등)를 제공해야 합니다.
② 타인의 정보를 도용하거나 허위의 정보를 등록하는 등 본인의 진정한 정보를 등록하지 않은 회원은 사이트 이용과 관련하여 아무런 권리를 주장할 수 없으며, 관계 법령에 따라 처벌받을 수 있습니다.

제6조 개인정보처리방침
사이트 및 운영자는 회원가입 시 제공한 개인정보 중 비밀번호를 가지고 있지 않으며 이와 관련된 부분은 사이트의 개인정보처리방침을 따릅니다.

(이하 약관 내용 계속...)

부칙 이 약관은 사이트 개설일부터 시행합니다.
`}
            </Text>
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
            <Text style={styles.termsText}>
              {`Useless(이하 '회사'라 한다)는 개인정보 보호법 제30조에 따라 정보 주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리지침을 수립, 공개합니다.

제1조 (개인정보의 처리목적)
회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.

1. 홈페이지 회원 가입 및 관리
회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별․인증, 회원자격 유지․관리, 제한적 본인확인제 시행에 따른 본인확인, 서비스 부정 이용 방지, 만 14세 미만 아동의 개인정보처리 시 법정대리인의 동의 여부 확인, 각종 고지․통지, 고충 처리 등을 목적으로 개인정보를 처리합니다.

(이하 개인정보 처리방침 계속...)

제13조(개인정보 처리방침 시행 및 변경)
이 개인정보 처리방침은 2025. 4. 1. 부터 적용됩니다.
`}
            </Text>
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
            <Text style={styles.termsText}>
              {`1. 개인정보 수집목적 및 이용목적
(1) 홈페이지 회원 가입 및 관리 회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별․인증, 회원자격 유지․관리, 제한적 본인확인제 시행에 따른 본인확인, 서비스 부정 이용 방지, 만 14세 미만 아동의 개인정보 처리시 법정대리인의 동의 여부 확인, 각종 고지․통지, 고충 처리 등의 목적

2. 수집하는 개인정보 항목
이메일, Google UID, 휴대폰번호

3. 개인정보 보유 및 이용기간
회원탈퇴 시까지 (단, 관계 법령에 보존 근거가 있는 경우 해당 기간 시까지 보유)
`}
            </Text>
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
            <Text style={styles.termsText}>
              서비스와 관련된 신상품 소식, 이벤트 안내, 고객 혜택 등 다양한
              정보를 제공합니다.
            </Text>
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
        <Text style={styles.submitButtonText}>동의하고 계속하기</Text>
      </TouchableOpacity>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
  },
  sectionContainer: {
    marginBottom: 20,
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
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#000',
  },
  checkboxUnchecked: {
    backgroundColor: '#fff',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  checkboxLabelBold: {
    fontWeight: 'bold',
  },
  termsTextContainer: {
    maxHeight: 150,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    marginLeft: 30,
    marginTop: 10,
  },
  shortTextContainer: {
    maxHeight: 100,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    marginLeft: 30,
    marginTop: 10,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  requiredCheckboxContainer: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    marginBottom: 10,
  },
  allCheckboxContainer: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  submitButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonEnabled: {
    backgroundColor: '#000',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default observer(TermsAgreementView);
