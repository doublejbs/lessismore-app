import dayjs, { Dayjs } from 'dayjs';

class BagTemplate {
  public constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly weight: number,
    private readonly gears: string[],
    private readonly createdAt: Dayjs,
    private readonly editDate: Dayjs
  ) {}

  public static from(
    id: string,
    data: {
      name: string;
      weight: number;
      gears: string[];
      createdAt: string;
      editDate: string;
    }
  ) {
    return new BagTemplate(
      id,
      data.name,
      data.weight,
      data.gears,
      dayjs(data.createdAt),
      dayjs(data.editDate)
    );
  }

  public getID() {
    return this.id;
  }

  public getName() {
    return this.name;
  }

  public getWeight() {
    return Number((this.weight / 1000).toFixed(2));
  }

  public getWeightGram() {
    return this.weight;
  }

  public getGearCount() {
    return this.gears.length;
  }

  public getGearIDs() {
    return [...this.gears];
  }

  public getCreatedAt() {
    return this.createdAt;
  }

  public getEditDate() {
    return this.editDate;
  }
}

export default BagTemplate;
