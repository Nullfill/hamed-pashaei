import "server-only";

export function cleanEnvironmentValue(value: string | undefined): string | undefined {
  const cleaned = value
    ?.trim()
    .replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, (_, doubleQuoted, singleQuoted) =>
      doubleQuoted ?? singleQuoted ?? "",
    )
    .trim();
  return cleaned || undefined;
}

export function getDatabaseUrl(): string | undefined {
  return cleanEnvironmentValue(process.env.DATABASE_URL);
}
