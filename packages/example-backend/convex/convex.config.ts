import { defineApp } from "convex/server";
import credits from "../../convex-credits/src/component/convex.config.js";

const app = defineApp();
app.use(credits);
export default app;
