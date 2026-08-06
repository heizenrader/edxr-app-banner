/** Package is "type": "module", so jest config uses the .cjs extension. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx", module: "commonjs" } }],
  },
};
