import { Dayjs } from 'dayjs';

class ReplyItem {
  public static new(id: string, content: string, createDate: Dayjs) {
    return new ReplyItem(id, content, createDate);
  }

  private constructor(
    private readonly id: string,
    private readonly content: string,
    private readonly createDate: Dayjs
  ) {}

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
