import raw from "./curriculum.json";

export interface Lesson {
  id: string;
  chapter: string;
  title: string;
  goal: string;
  demo: string;
  lab: string;
  challenge: string;
  status: string;
  minutes: number;
}

export const lessons: Lesson[] = raw;
export const chapters = [
  {
    id: "intro",
    title: "排查入门",
    subtitle: "先建立排查地图",
    icon: "compass",
  },
  {
    id: "elements",
    title: "Elements",
    subtitle: "理解页面与样式",
    icon: "layers",
  },
  {
    id: "console",
    title: "Console",
    subtitle: "观察、提问与验证",
    icon: "terminal",
  },
  {
    id: "sources",
    title: "Sources",
    subtitle: "追到出错的那一行",
    icon: "code",
  },
  {
    id: "network",
    title: "Network",
    subtitle: "读懂每一次请求",
    icon: "network",
  },
  {
    id: "performance",
    title: "Performance",
    subtitle: "找到慢的真正原因",
    icon: "activity",
  },
  {
    id: "application",
    title: "Application",
    subtitle: "检查状态与缓存",
    icon: "database",
  },
  { id: "memory", title: "Memory", subtitle: "沿着引用找到保留", icon: "chip" },
  {
    id: "lighthouse",
    title: "Lighthouse",
    subtitle: "从审计走到改进",
    icon: "lighthouse",
  },
  { id: "tools", title: "辅助工具", subtitle: "让排查更有章法", icon: "tools" },
  {
    id: "capstone",
    title: "综合实战",
    subtitle: "自己选择排查路径",
    icon: "flag",
  },
  {
    id: "topics",
    title: "专题拓展",
    subtitle: "扩展你的工具箱",
    icon: "spark",
  },
];

export function getLesson(id: string) {
  return lessons.find((item) => item.id === id);
}
