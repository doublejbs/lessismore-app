import { Dayjs } from 'dayjs';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import Group from '@/model/group/Group';

/**
 * 연결할 때 배낭을 그룹 일정으로 맞추는 변경분 (GRP-5).
 * 기간은 배낭 저장 형식(ISO 문자열, DM-5)으로 담는다. 바꿀 것이 없는 쪽은 null이다.
 */
export interface BagScheduleChange {
  dates: { startDate: string; endDate: string } | null;
  // 그룹 여행지가 **등록 박지**일 때만 채운다 — 자유 위치는 좌표를 저장하지 않는다(GRP-2).
  location: BagLocation | null;
}

/**
 * 일정 맞춤을 실제로 쓰는 쪽. 배낭 상세는 자기 상태·날씨 모델까지 함께 맞춰야 해서 스스로 쓰고,
 * 그룹 상세는 배낭 모델이 없어 저장 경로(`StoredBagScheduleWriter`)를 쓴다 — 쓰기 경로는 둘 다 기존 것이다.
 */
export interface BagScheduleWriter {
  applySchedule(change: BagScheduleChange): Promise<void>;
}

// 연결하려는 배낭의 현재 기간·여행지. 일정 맞춤이 필요한지 판단하는 데만 쓴다.
export interface GroupBagLinkSubject {
  bagId: string;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  location: BagLocation | null;
}

export interface GroupBagLinkRequest {
  group: Group;
  subject: GroupBagLinkSubject;
  writer: BagScheduleWriter;
  // 연결이 성공했을 때(분석 이벤트 등). 연결을 부른 화면마다 다르다.
  onLinked: () => void;
  // 연결 상태가 바뀌었을 수 있을 때 — 성공·실패 모두 부른다. 화면은 다시 읽어 실제 상태를 그린다.
  onChanged: () => Promise<void>;
}
