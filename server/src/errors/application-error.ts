export class ApplicationError extends Error {
  public constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace(this, new.target);
  }
}
