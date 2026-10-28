import { makeAutoObservable } from 'mobx';
import { RouteReplayRequest } from './RouteReplayRequest';

/**
 * 3D 리플레이 진입 데이터 전달(RR-1 · §4). **메모리뿐이다** — 서버·기기 저장소에 쓰지 않는다.
 * 진입 화면이 `open`으로 담고 `/route-replay`를 열면, 리플레이 화면이 한 번 읽고 닫힐 때 `clear`한다.
 */
class RouteReplayStore {
  private request: RouteReplayRequest | null = null;

  public static new() {
    return new RouteReplayStore();
  }

  private constructor() {
    makeAutoObservable(this);
  }

  public open(request: RouteReplayRequest) {
    this.request = request;
  }

  public getRequest(): RouteReplayRequest | null {
    return this.request;
  }

  public clear() {
    this.request = null;
  }
}

export default RouteReplayStore;
