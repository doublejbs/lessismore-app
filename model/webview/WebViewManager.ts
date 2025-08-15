import { Router } from 'expo-router';

interface WebViewMessage {
  type: string;
  data?: any;
}

interface WebViewMessageEvent {
  nativeEvent: {
    data: string;
  };
}

class WebViewManager {
  private static instance: WebViewManager;

  private constructor(private readonly router: Router) {}

  public static getInstance(router: Router): WebViewManager {
    if (!WebViewManager.instance) {
      WebViewManager.instance = new WebViewManager(router);
    }
    return WebViewManager.instance;
  }

  /**
   * WebView에서 보낸 메시지를 처리하는 메소드
   * @param event - WebView onMessage 이벤트 객체
   */
  public handleMessage = (event: WebViewMessageEvent): void => {
    try {
      const messageData = JSON.parse(event.nativeEvent.data);
      const message: WebViewMessage = messageData;

      console.log('WebView 메시지 수신:', message);

      switch (message.type) {
        case 'CLOSE_WEBVIEW':
          this.handleCloseWebView(message.data);
          break;
        case 'NAVIGATE':
          this.handleNavigate(message.data);
          break;
        case 'UPDATE_DATA':
          this.handleUpdateData(message.data);
          break;
        case 'PAGE_LOADED':
          this.handlePageLoaded(message.data);
          break;
        case 'ERROR':
          this.handleError(message.data);
          break;
        default:
          console.log('알 수 없는 메시지 타입:', message.type);
          break;
      }
    } catch (error) {
      console.error('WebView 메시지 파싱 오류:', error);
    }
  };

  /**
   * WebView 닫기 요청 처리
   */
  private handleCloseWebView = (data?: any): void => {
    this.router.back();
  };

  /**
   * 네비게이션 요청 처리
   */
  private handleNavigate = (data?: any): void => {
    this.router.push(data.url);
  };

  /**
   * 데이터 업데이트 요청 처리
   */
  private handleUpdateData = (data?: any): void => {
    // TODO: 실제 구현 필요
    console.log('데이터 업데이트 요청:', data);
  };

  /**
   * 페이지 로드 완료 처리
   */
  private handlePageLoaded = (data?: any): void => {
    console.log('WebView 페이지 로드 완료:', data);
  };

  /**
   * 에러 처리
   */
  private handleError = (data?: any): void => {
    // TODO: 실제 구현 필요
    console.error('WebView 에러:', data);
  };
}

export default WebViewManager;
