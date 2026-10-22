export interface LessonProgress {
  readAt?: string;
  practiceAt?: string;
  challengeAt?: string;
  challengeAssisted?: boolean;
  note: string;
  hints: number;
}
export interface ChapterProgress {
  note: string;
  scores: number[];
  assisted: boolean;
  completedAt?: string;
}
export interface LearningState {
  version: 1;
  records: Record<string, LessonProgress>;
  chapters?: Record<string, ChapterProgress>;
}
export const emptyState = (): LearningState => ({ version: 1, records: {} });

export function parseProgress(
  input: string,
  knownIds: readonly string[],
): LearningState {
  if (input.length > 500_000)
    throw new Error("记录文件过大，请选择本应用导出的 JSON。");
  const value = JSON.parse(input);
  if (
    !value ||
    value.version !== 1 ||
    !value.records ||
    typeof value.records !== "object" ||
    Array.isArray(value.records)
  ) {
    throw new Error("记录格式或版本不受支持。");
  }
  const records: Record<string, LessonProgress> = {};
  for (const [id, raw] of Object.entries(value.records)) {
    if (
      !knownIds.includes(id) ||
      !raw ||
      typeof raw !== "object" ||
      Array.isArray(raw)
    )
      throw new Error("记录包含未知课程或无效内容。");
    const item = raw as Record<string, unknown>;
    if (
      typeof item.note !== "string" ||
      item.note.length > 4000 ||
      !Number.isInteger(item.hints) ||
      Number(item.hints) < 0 ||
      Number(item.hints) > 3
    ) {
      throw new Error("笔记或提示记录格式不正确。");
    }
    const record: LessonProgress = {
      note: item.note,
      hints: Number(item.hints),
    };
    for (const key of ["readAt", "practiceAt", "challengeAt"] as const) {
      const date = item[key];
      if (date !== undefined) {
        if (
          typeof date !== "string" ||
          !/^\d{4}-\d{2}-\d{2}T/.test(date) ||
          !Number.isFinite(Date.parse(date))
        )
          throw new Error("完成时间格式不正确。");
        record[key] = date;
      }
    }
    if (item.challengeAssisted !== undefined) {
      if (typeof item.challengeAssisted !== "boolean")
        throw new Error("辅助记录格式不正确。");
      record.challengeAssisted = item.challengeAssisted;
    }
    records[id] = record;
  }
  if (value.chapters !== undefined) {
    if (
      !value.chapters ||
      typeof value.chapters !== "object" ||
      Array.isArray(value.chapters)
    )
      throw new Error("章末记录格式不正确。");
    const chapters: Record<string, ChapterProgress> = {};
    for (const [id, raw] of Object.entries(value.chapters)) {
      const c = raw as ChapterProgress;
      if (
        !["network", "application", "performance"].includes(id) ||
        !c ||
        typeof c.note !== "string" ||
        c.note.length > 4000 ||
        typeof c.assisted !== "boolean" ||
        !Array.isArray(c.scores) ||
        c.scores.length !== 5 ||
        c.scores.some(
          (score) => !Number.isInteger(score) || score < 0 || score > 2,
        )
      )
        throw new Error("章末自评记录格式不正确。");
      if (
        c.completedAt !== undefined &&
        (typeof c.completedAt !== "string" ||
          !/^\d{4}-\d{2}-\d{2}T/.test(c.completedAt) ||
          !Number.isFinite(Date.parse(c.completedAt)))
      )
        throw new Error("章末完成时间无效。");
      chapters[id] = {
        note: c.note,
        scores: c.scores,
        assisted: c.assisted,
        ...(c.completedAt ? { completedAt: c.completedAt } : {}),
      };
    }
    return { version: 1, records, chapters };
  }
  return { version: 1, records };
}
