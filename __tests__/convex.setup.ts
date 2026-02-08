/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");

export function createConvexTest() {
  return convexTest(schema, modules);
}
