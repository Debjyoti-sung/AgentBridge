import { ModelProvider } from './model-provider';
import { BrowserLocalProvider } from './browser-local-provider';

export class ModelRegistry {
  private static activeProvider: ModelProvider = new BrowserLocalProvider();

  public static getActiveProvider(): ModelProvider {
    return this.activeProvider;
  }

  public static setProvider(provider: ModelProvider): void {
    this.activeProvider = provider;
  }
}
