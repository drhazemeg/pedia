// packages/db/src/schema/index.ts

export * from "./auth";
export * from "./clinic";
export * from "./enums";
export * from "./shared";
export * from "./template";
// `./types` is type-only. Do NOT re-export it from a runtime barrel —
// it forces `import "./types"` at module load for no runtime benefit,
// and it collides with the enum-derived types already exported by `./enums`.
