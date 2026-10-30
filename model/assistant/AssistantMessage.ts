import { makeAutoObservable } from 'mobx';
import AssistantAction from './AssistantAction';
import AssistantRole from './AssistantRole';
import AssistantSendState from './AssistantSendState';

let nextMessageId = 1;

/**
 * 대화 목록의 말풍선 하나(AS-3). 도우미 말풍선은 이번 턴의 쓰기 도구 호출(적용 카드)을 함께 든다.
 * 서버 기록(`history`)과는 별개의 표시용 모델이다 — 기록은 `Assistant`가 원형 그대로 들고 있다.
 */
class AssistantMessage {
  public static user(text: string) {
    return new AssistantMessage(AssistantRole.User, text, []);
  }

  public static assistant(text: string, actions: AssistantAction[]) {
    return new AssistantMessage(AssistantRole.Assistant, text, actions);
  }

  private readonly id = `assistant-message-${nextMessageId++}`;
  private sendState = AssistantSendState.Sent;
  // 쓰기 도구 결과를 서버에 넘겼는지 — 넘기기 전에 실패하면 다시 보낼 때 이 값을 본다.
  private resultsDelivered = false;

  private constructor(
    private readonly role: AssistantRole,
    private readonly text: string,
    private readonly actions: AssistantAction[]
  ) {
    makeAutoObservable(this);
  }

  public getId(): string {
    return this.id;
  }

  public getRole(): AssistantRole {
    return this.role;
  }

  public getText(): string {
    return this.text;
  }

  public getActions(): AssistantAction[] {
    return this.actions;
  }

  public getVisibleActions(): AssistantAction[] {
    return this.actions.filter(action => action.isVisible());
  }

  public getSendState(): AssistantSendState {
    return this.sendState;
  }

  public setSendState(value: AssistantSendState): void {
    this.sendState = value;
  }

  public hasUnresolvedActions(): boolean {
    return this.actions.some(action => action.isUnresolved());
  }

  public needsResultDelivery(): boolean {
    return (
      this.actions.length > 0 &&
      !this.resultsDelivered &&
      !this.hasUnresolvedActions()
    );
  }

  public markResultsDelivered(): void {
    this.resultsDelivered = true;
  }
}

export default AssistantMessage;
