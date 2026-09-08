/// <reference types="vite/client" />
import schema from "./component/schema.js";

const modules = import.meta.glob("./component/**/*.ts");
export function register(
  t: {
    registerComponent: (
      name: string,
      componentSchema: typeof schema,
      componentModules: typeof modules,
    ) => void;
  },
  name = "credits",
) {
  t.registerComponent(name, schema, modules);
}
export default { register, schema, modules };
