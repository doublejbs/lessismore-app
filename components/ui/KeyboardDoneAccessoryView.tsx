import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  readonly nativeID: string;
}

/**
 * iOS 키보드 위에 붙는 공용 '완료' 액세서리 바다(CM-2, CM-11).
 * 리턴키로 키보드를 닫을 수 없는 여러 줄 입력에 쓴다(단일 행은 returnKeyType='done'으로 닫는다). iOS 외 플랫폼에서는 렌더하지 않는다.
 * Fabric에서는 창에 붙는 순간 같은 nativeID의 첫 TextInput 하나에만 바인딩되므로 입력 하나에 바 하나씩, 그 입력보다 트리에서 뒤에 렌더한다.
 */
const KeyboardDoneAccessoryView: FC<Props> = ({ nativeID }) => {
  const l10n = app.getL10n();

  // react-native-web은 `InputAccessoryView`를 패키지 루트에서 export하지 않아 웹에서는 `undefined`다.
  // 이 가드를 제거하면 웹에서 `Element type is invalid`로 크래시하므로 유지한다.
  // Android에서는 RN 본체가 콘솔 경고 후 null을 반환하는데 그 경고도 이 가드가 막는다.
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={styles.bar}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => Keyboard.dismiss()}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('common.done')}
          accessibilityHint={l10n.t('common.keyboardClose')}
        >
          <PretendardText weight='semibold' style={styles.label}>
            {l10n.t('common.done')}
          </PretendardText>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
};

const styles = StyleSheet.create({
  // 순백 지면 + 상단 헤어라인 — 키보드와 콘텐츠 사이를 한 줄로 가른다.
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: Acg.paper,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  // HIG 44pt 터치 타깃은 hitSlop이 아니라 실제 높이로 확보한다.
  button: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  label: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(KeyboardDoneAccessoryView);
