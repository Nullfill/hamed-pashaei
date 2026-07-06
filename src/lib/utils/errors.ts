export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ProviderConfigError extends AppError {
  constructor(message = "تنظیمات Provider کامل نیست. Environment Variableهای لازم را تنظیم کنید.") {
    super(message, 500);
    this.name = "ProviderConfigError";
  }
}

export class ProviderFetchError extends AppError {
  constructor(message = "دریافت داده از منبع قدیمی ناموفق بود.") {
    super(message, 502);
    this.name = "ProviderFetchError";
  }
}

export function toPublicError(error: unknown): { message: string; status: number } {
  if (error instanceof AppError) {
    return { message: error.message, status: error.status };
  }

  return { message: "خطای پیش بینی نشده رخ داد.", status: 500 };
}
