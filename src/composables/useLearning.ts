import { computed, ref } from "vue";
import { lessons } from "../data/curriculum";
import {
  emptyState,
  parseProgress,
  type LessonProgress,
  type ChapterProgress,
} from "../lib/progress";

const key = "devtools-lab.learning.v1";
const notice = ref("");
function load() {
  try {
    return parseProgress(
      localStorage.getItem(key) || JSON.stringify(emptyState()),
      lessons.map((item) => item.id),
    );
  } catch {
    notice.value =
      "本机记录不可用，已以空进度打开；原记录尚未覆盖。你可以重新导入备份。";
    return emptyState();
  }
}
const state = ref(load());
const record = (id: string): LessonProgress =>
  state.value.records[id] || { note: "", hints: 0 };

export function useLearning() {
  function update(id: string, patch: Partial<LessonProgress>) {
    if (
      !lessons.some((lesson) => lesson.id === id && lesson.status === "ready")
    )
      return;
    state.value = {
      ...state.value,
      version: 1,
      records: { ...state.value.records, [id]: { ...record(id), ...patch } },
    };
    try {
      localStorage.setItem(key, JSON.stringify(state.value));
    } catch {
      notice.value = "浏览器未能保存进度。当前记录仍在页面中，请导出备份。";
    }
  }
  function chapterRecord(id: string): ChapterProgress {
    return (
      state.value.chapters?.[id] || {
        note: "",
        scores: [0, 0, 0, 0, 0],
        assisted: false,
      }
    );
  }
  function updateChapter(id: string, patch: Partial<ChapterProgress>) {
    if (!["network", "application"].includes(id)) return;
    state.value = {
      ...state.value,
      chapters: {
        ...state.value.chapters,
        [id]: {
          ...chapterRecord(id),
          ...patch,
          ...(patch.note !== undefined || patch.scores !== undefined
            ? { completedAt: undefined }
            : {}),
        },
      },
    };
    try {
      localStorage.setItem(key, JSON.stringify(state.value));
    } catch {
      notice.value = "章末记录暂未保存，请导出备份。";
    }
  }
  function exportRecords() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state.value, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `devtools-learning-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importRecords(file: File) {
    try {
      if (file.size > 500_000)
        throw new Error("文件过大，请选择本应用导出的 JSON。");
      const parsed = parseProgress(
        await file.text(),
        lessons.map((item) => item.id),
      );
      localStorage.setItem(key, JSON.stringify(parsed));
      state.value = parsed;
      notice.value = "已导入学习记录。";
    } catch (error) {
      notice.value =
        error instanceof Error
          ? `导入未完成：${error.message} 原记录保留。`
          : "导入未完成，原记录保留。";
    }
  }
  return {
    state,
    notice,
    record,
    update,
    chapterRecord,
    updateChapter,
    exportRecords,
    importRecords,
    readCount: computed(
      () =>
        Object.values(state.value.records).filter((item) => item.readAt).length,
    ),
    practiceCount: computed(
      () =>
        Object.values(state.value.records).filter((item) => item.practiceAt)
          .length,
    ),
    passedCount: computed(
      () =>
        Object.values(state.value.records).filter((item) => item.challengeAt)
          .length,
    ),
  };
}
