import { Dayjs } from 'dayjs';

// 이 대화에서 만든 여행(AS-5 `context.bagId`). 상단 대상 줄 `{이름} · {기간}`과 후속 수정 대상이다.
export interface AssistantTrip {
  bagId: string;
  name: string;
  startDate: Dayjs;
  endDate: Dayjs;
}
