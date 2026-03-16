export default {
  "**/*.ts?(x)": () => ["tsc --noEmit", "vitest run"],
};
