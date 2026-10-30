import dayjs from 'dayjs';
import { makeAutoObservable } from 'mobx';
import app from '../app/App';
import LocalStorageManager from '../storage/LocalStorageManager';
import NetworkStatus from '../offline/NetworkStatus';
import AssistantAction from './AssistantAction';
import AssistantActionApplier from './AssistantActionApplier';
import AssistantActionName from './AssistantActionName';
import AssistantActionStatus from './AssistantActionStatus';
import AssistantApi from './AssistantApi';
import {
  AssistantRequest,
  AssistantResponse,
  AssistantToolResult,
} from './AssistantApiTypes';
import { AssistantApplyOutcome } from './AssistantApplyOutcome';
import AssistantBlockState from './AssistantBlockState';
import AssistantErrorKind from './AssistantErrorKind';
import AssistantMessage from './AssistantMessage';
import AssistantProvider from './AssistantProvider';
import AssistantRole from './AssistantRole';
import AssistantSendKind from './AssistantSendKind';
import AssistantSendState from './AssistantSendState';
import { AssistantTrip } from './AssistantTrip';
import { ASSISTANT_TOOL_MESSAGE } from './AssistantToolMessage';

// 사용자 발화 상한(AS-7). 넘으면 입력 바 대신 새 대화 안내.
const TURN_LIMIT = 30;
// 첫 진입 1회 안내(AS-10)를 본 기기 표시.
const INTRO_SEEN_KEY = 'assistant_intro_seen_v1';
// `userText` 상한(AS-1) — 입력 바 maxLength와 같다.
export const ASSISTANT_TEXT_MAX_LENGTH = 2000;


type AssistantRequestPayload =
  | { userText: string }
  | { toolResults: AssistantToolResult[] };

/**
 * `AI로 계획하기` 대화 한 번(AS-1·AS-3·AS-5·AS-7). 기록은 메모리에만 두고 화면을 닫으면 사라진다.
 *
 * - 기록(`history`)은 서버가 준 `appended`를 **가공 없이** 누적한다 — 공급자 원형이라 해석하지 않는다.
 * - `appended`를 받지 못한 요청은 기록에 아무것도 남기지 않는다(사용자 말풍선은 `보내지 못함`).
 * - 쓰기 도구는 카드로 확인받아 기존 스토어로 적용하고, 그 턴의 카드가 모두 처리되면 결과를 자동으로 보낸다.
 */
class Assistant {
  public static from(
    api: AssistantApi,
    applier: AssistantActionApplier,
    networkStatus: NetworkStatus
  ) {
    return new Assistant(api, applier, networkStatus);
  }

  private messages: AssistantMessage[] = [];
  private history: unknown[] = [];
  private provider: AssistantProvider | null = null;
  private remaining: number | null = null;
  private trip: AssistantTrip | null = null;
  private waiting = false;
  private draft = '';
  private sentTurns = 0;
  private limitReached = false;
  private providerChanged = false;
  private errorKind: AssistantErrorKind | null = null;
  // `다시 보내기` 대상 — 발화 하나 또는 결과를 못 넘긴 도우미 턴 하나.
  private retryUserMessage: AssistantMessage | null = null;
  private retryResultsMessage: AssistantMessage | null = null;
  // `새 대화` 때마다 올린다. 이전 대화의 늦은 응답·적용 결과를 버리는 데 쓴다.
  private generation = 0;

  private constructor(
    private readonly api: AssistantApi,
    private readonly applier: AssistantActionApplier,
    private readonly networkStatus: NetworkStatus
  ) {
    makeAutoObservable<Assistant, 'history' | 'api' | 'applier' | 'networkStatus'>(
      this,
      { history: false, api: false, applier: false, networkStatus: false }
    );
  }

  // ── 조회 ─────────────────────────────────────────────

  public getMessages(): AssistantMessage[] {
    return this.messages;
  }

  public isEmpty(): boolean {
    return this.messages.length === 0;
  }

  public getTrip(): AssistantTrip | null {
    return this.trip;
  }

  public getRemaining(): number | null {
    return this.remaining;
  }

  public isWaiting(): boolean {
    return this.waiting;
  }

  public getDraft(): string {
    return this.draft;
  }

  public getErrorKind(): AssistantErrorKind | null {
    return this.errorKind;
  }

  public canRetry(): boolean {
    return (
      !this.waiting &&
      (this.retryUserMessage !== null || this.retryResultsMessage !== null)
    );
  }

  public getBlockState(): AssistantBlockState {
    if (this.providerChanged) {
      return AssistantBlockState.ProviderChanged;
    }

    if (this.limitReached) {
      return AssistantBlockState.Limit;
    }

    if (this.sentTurns >= TURN_LIMIT) {
      return AssistantBlockState.TurnLimit;
    }

    if (this.networkStatus.isOffline()) {
      return AssistantBlockState.Offline;
    }

    return AssistantBlockState.None;
  }

  // 미결 카드가 있으면 새 메시지를 막는다(AS-5).
  public hasUnresolvedActions(): boolean {
    return this.messages.some(message => message.hasUnresolvedActions());
  }

  public isApplying(): boolean {
    return this.messages.some(message =>
      message
        .getActions()
        .some(action => action.getStatus() === AssistantActionStatus.Applying)
    );
  }

  // 입력 바를 쓸 수 있는지 — 응답 대기·미결 카드·결과 재전송 대기 중엔 잠근다(AS-3).
  public canCompose(): boolean {
    return (
      !this.waiting &&
      this.getBlockState() === AssistantBlockState.None &&
      !this.hasUnresolvedActions() &&
      this.retryResultsMessage === null
    );
  }

  public canSendDraft(): boolean {
    return this.canCompose() && this.draft.trim().length > 0;
  }

  /**
   * 라임 `적용`을 받을 카드(AS-3). 미결 카드는 늘 마지막 턴에만 있으므로(결과를 다 넘겨야 다음 턴이 온다)
   * 그 턴의 **위쪽 미결 카드부터** 준다 — `여행 만들기`가 같은 턴의 후속 수정보다 먼저 처리돼야 한다.
   */
  public getPrimaryActionId(): string | null {
    for (let i = this.messages.length - 1; i >= 0; i -= 1) {
      const pending = this.messages[i]
        .getVisibleActions()
        .find(action => action.getStatus() === AssistantActionStatus.Pending);

      if (pending) {
        return pending.getId();
      }
    }

    return null;
  }

  // 같은 턴의 `여행 만들기`가 아직 처리되지 않았으면 뒤 카드(후속 수정)는 누를 수 없다 — 대상 여행이 없다.
  public isActionBlocked(action: AssistantAction): boolean {
    if (action.getName() === AssistantActionName.CreateTrip) {
      return false;
    }

    const message = this.messages.find(item =>
      item.getActions().includes(action)
    );

    return (
      message
        ?.getActions()
        .some(
          item =>
            item.getName() === AssistantActionName.CreateTrip &&
            item.isUnresolved()
        ) ?? false
    );
  }

  public getLastAssistantMessage(): AssistantMessage | null {
    for (let i = this.messages.length - 1; i >= 0; i -= 1) {
      if (this.messages[i].getRole() === AssistantRole.Assistant) {
        return this.messages[i];
      }
    }

    return null;
  }

  // ── 첫 진입 안내(AS-10) ───────────────────────────────

  public async shouldShowIntro(): Promise<boolean> {
    return (await LocalStorageManager.get<boolean>(INTRO_SEEN_KEY)) !== true;
  }

  public async markIntroSeen(): Promise<void> {
    await LocalStorageManager.set(INTRO_SEEN_KEY, true);
  }

  // ── 발화 ─────────────────────────────────────────────

  public setDraft(value: string): void {
    this.draft = value;
  }

  // 입력 바의 보내기(`text`) 또는 제안 칩(`suggestion` — 문장을 그대로 보낸다).
  public async send(kind: AssistantSendKind, suggestion?: string): Promise<void> {
    const text = (suggestion ?? this.draft)
      .trim()
      .slice(0, ASSISTANT_TEXT_MAX_LENGTH);

    if (!text || !this.canCompose()) {
      return;
    }

    const message = AssistantMessage.user(text);

    this.messages.push(message);

    if (kind === AssistantSendKind.Text) {
      this.draft = '';
    }

    app
      .getAnalyticsManager()
      ?.logClick('assistant_send', { kind, turn: this.sentTurns + 1 });

    await this.requestText(message);
  }

  // `다시 보내기` — 직전 실패 요청을 같은 기록으로 다시 보낸다.
  public async retry(): Promise<void> {
    if (!this.canRetry()) {
      return;
    }

    if (this.retryResultsMessage) {
      await this.requestResults(this.retryResultsMessage);

      return;
    }

    if (this.retryUserMessage) {
      await this.requestText(this.retryUserMessage);
    }
  }

  // ── 적용 카드 ─────────────────────────────────────────

  public async apply(action: AssistantAction): Promise<void> {
    if (
      action.getStatus() !== AssistantActionStatus.Pending ||
      this.isApplying() ||
      this.isActionBlocked(action)
    ) {
      return;
    }

    const generation = this.generation;

    action.markApplying();

    const outcome = await this.applier.apply(action, this.trip);

    if (generation !== this.generation) {
      return;
    }

    this.finishApply(action, outcome);
    await this.deliverResults();
  }

  public async skip(action: AssistantAction): Promise<void> {
    if (action.getStatus() !== AssistantActionStatus.Pending) {
      return;
    }

    action.markSkipped();
    this.logApply(action, 'skipped');
    await this.deliverResults();
  }

  // ── 새 대화 ─────────────────────────────────────────
  // 기록·카드·여행 연결을 비운다. 오늘 남은 횟수와 한도 도달은 날짜 기준이라 유지한다(AS-9).
  public reset(): void {
    // 적용 중에 비우면 쓰기는 계속되고 여행만 대화와 끊긴다 — 헤더 버튼과 같은 가드를 모델에서도 둔다.
    if (this.isApplying()) {
      return;
    }

    this.generation += 1;
    this.messages = [];
    this.history = [];
    this.provider = null;
    this.trip = null;
    this.waiting = false;
    this.draft = '';
    this.sentTurns = 0;
    this.providerChanged = false;
    this.clearError();
  }

  // ── 내부 ─────────────────────────────────────────────

  private async requestText(message: AssistantMessage): Promise<void> {
    const generation = this.generation;

    this.startRequest();
    message.setSendState(AssistantSendState.Sending);

    try {
      const response = await this.api.send(
        this.buildRequest({ userText: message.getText() })
      );

      if (generation !== this.generation) {
        return;
      }

      this.finishText(message, response);
    } catch (error) {
      if (generation !== this.generation) {
        return;
      }

      message.setSendState(AssistantSendState.Failed);
      this.handleError(error, message, null);

      return;
    }

    await this.deliverResults();
  }

  private async requestResults(message: AssistantMessage): Promise<void> {
    const generation = this.generation;
    const toolResults = message.getActions().map(action => action.toToolResult());

    this.startRequest();

    try {
      const response = await this.api.send(this.buildRequest({ toolResults }));

      if (generation !== this.generation) {
        return;
      }

      message.markResultsDelivered();
      this.applyResponse(response);
    } catch (error) {
      if (generation !== this.generation) {
        return;
      }

      this.handleError(error, null, message);

      return;
    }

    await this.deliverResults();
  }

  // 마지막 턴의 카드가 모두 처리됐으면 결과를 보낸다(AS-3 "자동으로 결과를 서버에 보내 대화를 잇는다").
  private async deliverResults(): Promise<void> {
    if (this.waiting || this.retryResultsMessage) {
      return;
    }

    const message = this.messages.find(item => item.needsResultDelivery());

    if (message) {
      await this.requestResults(message);
    }
  }

  private startRequest(): void {
    this.waiting = true;
    this.clearError();
  }

  private finishText(message: AssistantMessage, response: AssistantResponse): void {
    message.setSendState(AssistantSendState.Sent);
    this.sentTurns += 1;
    this.applyResponse(response);
  }

  private applyResponse(response: AssistantResponse): void {
    this.waiting = false;
    this.history = [
      ...this.history,
      ...(Array.isArray(response.appended) ? response.appended : []),
    ];

    if (response.provider) {
      this.provider = response.provider;
    }

    if (typeof response.remaining === 'number') {
      this.remaining = Math.max(response.remaining, 0);

      if (this.remaining === 0) {
        this.markLimitReached();
      }
    }

    const actions = (
      Array.isArray(response.pendingActions) ? response.pendingActions : []
    ).map(pending => AssistantAction.from(pending));
    const hasCreateTrip = actions.some(
      action => action.getName() === AssistantActionName.CreateTrip
    );

    // 여행이 없는데 온 후속 수정(같은 턴에 여행 만들기도 없을 때)·모르는 도구는 카드 없이 오류로 돌려준다(AS-5).
    actions.forEach(action => {
      const name = action.getName();

      if (!name) {
        action.rejectSilently(ASSISTANT_TOOL_MESSAGE.unknownTool);
      } else if (
        name !== AssistantActionName.CreateTrip &&
        !this.trip &&
        !hasCreateTrip
      ) {
        action.rejectSilently(ASSISTANT_TOOL_MESSAGE.noTrip);
      }
    });

    const text = typeof response.text === 'string' ? response.text.trim() : '';

    if (text || actions.length > 0) {
      this.messages.push(AssistantMessage.assistant(text, actions));
    }
  }

  private finishApply(action: AssistantAction, outcome: AssistantApplyOutcome): void {
    if (outcome.ok) {
      action.markApplied(outcome.content, outcome.note, outcome.createdBagId);

      if (outcome.trip) {
        this.trip = outcome.trip;
      }

      this.logApply(action, 'applied');

      return;
    }

    action.markFailed(outcome.message, outcome.note);
    this.logApply(action, 'error');
  }

  private handleError(
    error: unknown,
    userMessage: AssistantMessage | null,
    resultsMessage: AssistantMessage | null
  ): void {
    const kind = AssistantApi.toErrorKind(error, this.networkStatus.isOffline());

    this.waiting = false;
    console.warn('AI 도우미 호출 실패', kind, error); // l10n-ignore: console 개발자 로그

    if (kind === AssistantErrorKind.Limit) {
      this.remaining = 0;
      this.markLimitReached();

      return;
    }

    if (kind === AssistantErrorKind.ProviderChanged) {
      this.providerChanged = true;

      return;
    }

    this.errorKind = kind;
    this.retryUserMessage = userMessage;
    this.retryResultsMessage = resultsMessage;
  }

  private clearError(): void {
    this.errorKind = null;
    this.retryUserMessage = null;
    this.retryResultsMessage = null;
  }

  private markLimitReached(): void {
    if (this.limitReached) {
      return;
    }

    this.limitReached = true;
    app.getAnalyticsManager()?.logClick('assistant_limit', { action: 'shown' });
  }

  private logApply(action: AssistantAction, result: string): void {
    app
      .getAnalyticsManager()
      ?.logClick('assistant_apply', { tool: action.getRawName(), result });
  }

  private buildRequest(payload: AssistantRequestPayload): AssistantRequest {
    return {
      ...(this.provider ? { provider: this.provider } : {}),
      history: this.history,
      ...payload,
      locale: app.getL10n().language,
      today: dayjs().format('YYYY-MM-DD'),
      context: this.trip ? { bagId: this.trip.bagId } : {},
    };
  }
}

export default Assistant;
