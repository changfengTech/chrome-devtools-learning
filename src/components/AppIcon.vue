<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 });
const paths: Record<string, string> = {
  compass:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm4 5-2.5 5.5L8 16l2.5-5.5L16 8Z",
  layers: "m3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4",
  terminal: "M4 4h16v16H4V4Zm3 4 4 4-4 4m7 0h3",
  code: "m8 6-5 6 5 6m8-12 5 6-5 6m-3-15-2 18",
  network: "M5 5h4v4H5V5Zm10 10h4v4h-4v-4ZM7 9v8h8m-3-12h7v7m0-7-7 7",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  database:
    "M20 6c0 2-4 3-8 3S4 8 4 6s4-3 8-3 8 1 8 3Zm0 0v12c0 2-4 3-8 3s-8-1-8-3V6m0 6c0 2 4 3 8 3s8-1 8-3",
  chip: "M7 7h10v10H7V7Zm3 3h4v4h-4v-4ZM8 3v4m8-4v4M8 17v4m8-4v4M3 8h4m-4 8h4m10-8h4m-4 8h4",
  lighthouse: "m9 9-2 12h10L15 9H9Zm0-5h6v5H9V4Zm3-2v2M3 7l3 1m12 0 3-1M9 15h6",
  tools: "m14 5 5-2 2 5-6 6-5-5 4-4ZM9 10l-6 8 3 3 8-6",
  flag: "M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  chevron: "m9 5 7 7-7 7",
  search: "M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM16 16l5 5",
  check: "m5 12 4 4L19 6",
  external: "M14 3h7v7m0-7L10 14M10 4H4v16h16v-6",
  book: "M12 5c-4-3-8-2-9-1v15c3-2 6-1 9 1 3-2 6-3 9-1V4c-1-1-5-2-9 1Zm0 0v15",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v6l4 2",
  menu: "M4 6h16M4 12h16M4 18h16",
  download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  close: "m5 5 14 14M19 5 5 19",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 8v6m0-10v1",
};
</script>
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.book" />
  </svg>
</template>
