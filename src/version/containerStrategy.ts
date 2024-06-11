import { GenericStrategy } from "./genericStrategy";
import type { StrategyConfig } from "config";

export class ContainerStrategy extends GenericStrategy {
  constructor(public name: string, protected config: StrategyConfig) {
    super(name, config);
  }
}
