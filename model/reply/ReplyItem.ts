import { Dayjs } from 'dayjs';

class ReplyItem {
  public static new(
    id: string,
    content: string,
    createDate: Dayjs,
    authorId: string
  ) {
    return new ReplyItem(id, content, createDate, authorId);
  }

  private constructor(
    private readonly id: string,
    private readonly content: string,
    private readonly createDate: Dayjs,
    // 차단 필터용(CM-17) — 장비 상세 리뷰 미리보기에서 차단한 사람의 리뷰를 숨긴다.
    private readonly authorId: string
  ) {}

  public getAuthorId() {
    return this.authorId;
  }

  public getID() {
    return this.id;
  }

  public getContent() {
    return this.content;
  }

  public getCreateDate() {
    return this.createDate.format('YYYY.MM.DD');
  }
}

export default ReplyItem;
