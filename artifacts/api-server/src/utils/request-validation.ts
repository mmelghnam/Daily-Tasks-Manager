export class BadRequestError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

function isDateOnlyString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function assertDateOnlyInput(
  value: unknown,
  field: string,
  options: { optional?: boolean; nullable?: boolean } = {},
) {
  if (value === undefined && options.optional) return;
  if (value === null && options.nullable) return;
  if (!isDateOnlyString(value)) {
    throw new BadRequestError(`${field} must use YYYY-MM-DD`);
  }
}

export function parseDateOnlyQuery(value: unknown, field: string): Date | undefined {
  if (value === undefined) return undefined;
  assertDateOnlyInput(value, field);
  return new Date(`${value}T00:00:00.000Z`);
}