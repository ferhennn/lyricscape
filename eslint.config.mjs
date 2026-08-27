import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    // React Three Fiber is built on mutating three.js objects inside the render
    // loop (useFrame). The React-Compiler-era hook rules (immutability, manual
    // memoization, ref access) treat that idiomatic pattern as a violation, so
    // they are relaxed for the WebGL layer only.
    files: ["src/components/three/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-render": "off",
    },
  },
]);

export default eslintConfig;
