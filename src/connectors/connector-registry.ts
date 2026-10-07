import { WebsiteConnector } from './connector-interface';
import { GenericWebConnector } from './generic-connector';
import { GmailConnector } from './gmail-connector';

export class ConnectorRegistry {
  private static connectors: WebsiteConnector[] = [
    new GmailConnector() // Optional specialized connector
  ];
  private static defaultConnector: WebsiteConnector = new GenericWebConnector();

  public static register(connector: WebsiteConnector): void {
    this.connectors.unshift(connector);
  }

  public static getActiveConnector(): WebsiteConnector {
    for (const connector of this.connectors) {
      try {
        if (connector.detect()) {
          return connector;
        }
      } catch (e) {
        // Fallback to next connector
      }
    }
    return this.defaultConnector;
  }
}
