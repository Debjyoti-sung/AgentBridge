export interface ModelProvider {
  name: string;
  isReady(): boolean;
  initialize(): Promise<boolean>;
  classifyAmbiguousElement(elementInfo: { tag: string; text: string; attributes: Record<string, string> }): Promise<{ role: string; confidence: number }>;
  summarize(items: any[], instructions?: string): Promise<string>;
  mapIntentToAction(intent: string, candidates: Array<{ id: string; label: string; type: string }>): Promise<{ actionName: string; targetId?: string; confidence: number }>;
}
