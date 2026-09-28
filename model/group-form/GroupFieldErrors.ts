import { makeAutoObservable } from 'mobx';
import GroupError from '@/model/group/GroupError';
import GroupValidationError from '@/model/group/GroupValidationError';

/**
 * 그룹 폼의 필드 오류 배선 (GRP-2 · GRP-7).
 *
 * 만들기·수정 화면이 필드 enum만 다른 같은 코드를 들고 있었다 — 실패 코드가 어느 필드를
 * 가리키는지, 첫 오류 필드가 무엇인지, 입력을 고치면 어떻게 지워지는지를 한 곳에 둔다.
 * 오류가 없는 필드는 `null`이고, 필드를 가리키지 않는 코드(정원·권한 등)는 화면 전체의
 * 실패라 여기에 남기지 않는다.
 */
class GroupFieldErrors<Field extends string> {
  private readonly errors = new Map<Field, GroupValidationError>();

  public static from<Field extends string>(
    fieldByCode: Partial<Record<GroupValidationError, Field>>
  ): GroupFieldErrors<Field> {
    return new GroupFieldErrors(fieldByCode);
  }

  private constructor(
    private readonly fieldByCode: Partial<Record<GroupValidationError, Field>>
  ) {
    makeAutoObservable(this);
  }

  public get(field: Field): GroupValidationError | null {
    return this.errors.get(field) ?? null;
  }

  // 스크롤을 옮길 대상. 선언 순서가 아니라 오류가 담긴 순서다.
  public getFirstField(): Field | null {
    return this.errors.keys().next().value ?? null;
  }

  public clear(): void {
    this.errors.clear();
  }

  // 그 칸을 고치는 동안에는 오류 문구를 내린다.
  public clearField(field: Field): void {
    this.errors.delete(field);
  }

  public capture(error: unknown): void {
    if (!(error instanceof GroupError)) {
      return;
    }

    const field = this.fieldByCode[error.code];

    if (field) {
      this.errors.set(field, error.code);
    }
  }
}

export default GroupFieldErrors;
