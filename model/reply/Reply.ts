class Reply {
  public static of(gearId: string) {
    return new Reply(gearId);
  }

  private constructor(private readonly gearId: string) {}

  public getGearId() {
    return this.gearId;
  }
}

export default Reply;
