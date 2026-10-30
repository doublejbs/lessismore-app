import { makeAutoObservable } from 'mobx';
import { AssistantPendingAction, AssistantToolResult } from './AssistantApiTypes';
import AssistantActionName from './AssistantActionName';
import AssistantActionStatus from './AssistantActionStatus';
import { readString } from './AssistantActionInput';
import { ASSISTANT_TOOL_MESSAGE } from './AssistantToolMessage';


const ACTION_NAMES = new Set<string>(Object.values(AssistantActionName));

/**
 * 쓰기 도구 호출 하나(AS-5). 보이는 것은 적용 카드 한 장이고, 보이지 않는 것(여행이 없는데 온 후속 수정·
 * 모르는 도구)은 카드 없이 오류 결과만 들고 있다가 같은 턴의 결과와 함께 서버로 간다.
 */
class AssistantAction {
  public static from(pending: AssistantPendingAction) {
    return new AssistantAction(pending);
  }

  private status = AssistantActionStatus.Pending;
  private visible = true;
  private content: Record<string, unknown> | null = null;
  // 카드 상태 줄에 붙는 사유 — 실패면 `실패 — {사유}`, 부분 실패면 `적용됨 — {사유}`.
  private note = '';
  // `여행 만들기` 적용으로 생긴 여행 — 카드의 `여행 보기` 대상.
  private createdBagId: string | null = null;

  private constructor(private readonly pending: AssistantPendingAction) {
    makeAutoObservable<AssistantAction, 'pending'>(this, { pending: false });
  }

  public getId(): string {
    return this.pending.id;
  }

  public getRawName(): string {
    return this.pending.name;
  }

  // 모르는 도구면 null — 카드 없이 오류로 돌려준다.
  public getName(): AssistantActionName | null {
    return ACTION_NAMES.has(this.pending.name)
      ? (this.pending.name as AssistantActionName)
      : null;
  }

  public getInput(): Record<string, unknown> {
    return this.pending.input ?? {};
  }

  public getSummary(): string {
    return readString(this.getInput().summary);
  }

  public getStatus(): AssistantActionStatus {
    return this.status;
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public isUnresolved(): boolean {
    return (
      this.status === AssistantActionStatus.Pending ||
      this.status === AssistantActionStatus.Applying
    );
  }

  public getNote(): string {
    return this.note;
  }

  public getCreatedBagId(): string | null {
    return this.createdBagId;
  }

  public markApplying(): void {
    this.status = AssistantActionStatus.Applying;
  }

  public markApplied(
    content: Record<string, unknown>,
    note: string,
    createdBagId: string | null
  ): void {
    this.status = AssistantActionStatus.Applied;
    this.content = { status: 'applied', ...content };
    this.note = note;
    this.createdBagId = createdBagId;
  }

  public markSkipped(): void {
    this.status = AssistantActionStatus.Skipped;
    this.content = { status: 'skipped', reason: ASSISTANT_TOOL_MESSAGE.skipped };
  }

  // `message`는 모델에게, `note`는 카드 상태 줄에 쓴다.
  public markFailed(message: string, note: string): void {
    this.status = AssistantActionStatus.Failed;
    this.content = { status: 'error', message };
    this.note = note;
  }

  // 카드 없이 오류로 끝내는 호출(여행 없음·모르는 도구).
  public rejectSilently(message: string): void {
    this.visible = false;
    this.markFailed(message, '');
  }

  public toToolResult(): AssistantToolResult {
    return {
      id: this.pending.id,
      name: this.pending.name,
      content: this.content ?? { status: 'error', message: 'unresolved' },
      isError: this.status === AssistantActionStatus.Failed,
    };
  }
}

export default AssistantAction;
