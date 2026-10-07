import { ProtocolMessage } from '../shared/protocol';

export type MessageHandler = (msg: ProtocolMessage) => void;

export class WebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private handlers = new Map<string, MessageHandler[]>();
  private statusListeners: Array<(status: 'connected' | 'connecting' | 'disconnected') => void> = [];
  public currentStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  private wasConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(url: string = 'ws://localhost:8765/ws/extension') {
    this.url = url;
  }

  public onStatus(listener: (status: 'connected' | 'connecting' | 'disconnected') => void) {
    this.statusListeners.push(listener);
    listener(this.currentStatus);
  }

  private setStatus(status: 'connected' | 'connecting' | 'disconnected') {
    this.currentStatus = status;
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (err) {
        console.warn('[WebSocketClient] Listener error:', err);
      }
    }
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');
    console.log('[AgentBridge] Connecting to WebSocket:', this.url);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[AgentBridge] WebSocket connected successfully');
        this.wasConnected = true;
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        this.send({
          type: 'client.hello',
          request_id: `hello_${Date.now()}`,
          payload: { client: 'agentbridge-chrome-extension', version: '1.0.0' },
          timestamp: Date.now()
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data: ProtocolMessage = JSON.parse(event.data);
          this.dispatch(data);
        } catch (e) {
          console.warn('[AgentBridge] Failed to parse message:', event.data, e);
        }
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        // Only schedule reconnect if connection was previously established and dropped
        if (this.wasConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts - 1), 8000);
          console.log(`[AgentBridge] WebSocket disconnected. Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          this.scheduleReconnect(delay);
        } else {
          if (this.wasConnected) {
            console.log('[AgentBridge] Reconnect attempts exhausted. Running in standalone local mode.');
          } else {
            console.log('[AgentBridge] Backend server offline. Running in standalone local mode.');
          }
          this.wasConnected = false;
          this.reconnectAttempts = 0;
        }
      };

      this.ws.onerror = (_err) => {
        // Log info/warn instead of error so Chrome Extension does not log as runtime error
        console.log('[AgentBridge] WebSocket backend server is offline or unreachable at', this.url);
        this.setStatus('disconnected');
      };
    } catch (err) {
      console.warn('[AgentBridge] WebSocket initialization error:', err);
      this.setStatus('disconnected');
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.wasConnected = false;
    this.reconnectAttempts = 0;
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private scheduleReconnect(delay: number = 3000) {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  public send(msg: ProtocolMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('[AgentBridge] Cannot send, WebSocket not open:', msg.type);
    }
  }

  public on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  private dispatch(msg: ProtocolMessage) {
    const list = this.handlers.get(msg.type) || [];
    for (const h of list) {
      try {
        h(msg);
      } catch (err) {
        console.warn('[AgentBridge] Handler error for message type:', msg.type, err);
      }
    }
  }
}
