// 쓰기 도구 이름(AS-5). 서버 `pendingActions[].name`과 글자 그대로 같다.
enum AssistantActionName {
  CreateTrip = 'create_trip',
  AddGears = 'add_gears',
  RemoveGears = 'remove_gears',
  UpdateTripInfo = 'update_trip_info',
  SetDestination = 'set_destination',
  UpdateMemo = 'update_memo',
}

export default AssistantActionName;
