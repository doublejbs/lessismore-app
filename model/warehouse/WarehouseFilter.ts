import { makeAutoObservable } from 'mobx';
import GearFilter from '../gear/GearFilter';
import { getGearFilterName } from '../gear/GearFilterName';
import { getAppTranslation } from '../l10n/L10nRegistry';

class WarehouseFilter {
  public static from(filter: GearFilter, name: string, labelKey?: string) {
    return new WarehouseFilter(filter, name, labelKey);
  }

  private selected = false;
  private count = 0;

  private constructor(
    private readonly filter: GearFilter,
    private readonly name: string,
    private readonly labelKey?: string
  ) {
    makeAutoObservable(this);
  }

  public getName() {
    return this.name;
  }

  // 화면 표시 전용 라벨. getName()은 캐논컬 값 또는 요약 키로 보존해
  // 비교·저장·참조 키에 번역 문자열이 흘러가지 않게 한다.
  public getLabel() {
    return this.labelKey
      ? getAppTranslation(this.labelKey)
      : getGearFilterName(this.filter);
  }

  public select() {
    this.selected = true;
  }

  public deselect() {
    this.selected = false;
  }

  public isSelected() {
    return this.selected;
  }

  public getFilter() {
    return this.filter;
  }

  public isSame(filter: GearFilter) {
    return this.filter === filter;
  }

  private setCount(value: number) {
    this.count = value;
  }

  public getCount() {
    return this.count;
  }

  public plusCount() {
    this.setCount(this.count + 1);
  }

  public minusCount() {
    this.setCount(this.count - 1);
  }

  public resetCount() {
    this.setCount(0);
  }
}

export default WarehouseFilter;
