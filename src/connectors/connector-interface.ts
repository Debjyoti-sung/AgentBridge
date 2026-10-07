import {
  BrowserAction,
  ActionResult,
  VerificationResult,
  SemanticElement,
  SemanticAction
} from '../shared/protocol';

export interface WebsiteConnector {
  name: string;
  detect(): boolean;
  getSemanticObjects?(): SemanticElement[];
  getActions?(): SemanticAction[];
  execute?(action: BrowserAction): Promise<ActionResult | null>;
  verify?(action: BrowserAction, result: any): Promise<VerificationResult | null>;
}
