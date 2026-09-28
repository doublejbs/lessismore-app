import { FC, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';

interface Props {
  label: string;
  // 라벨 행 우측 글자수 카운터. 상한이 있는 입력에만 넘긴다.
  counterText?: string | undefined;
  errorText?: string | null | undefined;
  children: ReactNode;
}

/**
 * 그룹 폼의 필드 한 칸 (GRP-2 · GRP-7).
 * 라벨 행 + 입력 + 오류 문구의 배치를 만들기·수정 화면이 함께 쓴다.
 */
const GroupFormFieldView: FC<Props> = ({
  label,
  counterText,
  errorText,
  children,
}) => {
  return (
    <View style={styles.field}>
      <View style={styles.header}>
        <PretendardText style={styles.label} weight='semibold'>
          {label}
        </PretendardText>
        {counterText ? (
          <PretendardText style={styles.counter}>{counterText}</PretendardText>
        ) : null}
      </View>
      {children}
      {errorText ? (
        <PretendardText style={styles.error}>{errorText}</PretendardText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  field: { gap: 8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { ...AcgType.meta, color: Acg.ink },
  counter: { ...AcgType.meta, color: Acg.textMuted },
  error: { ...AcgType.meta, color: Acg.error },
});

export default GroupFormFieldView;
