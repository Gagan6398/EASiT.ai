import type { Message, ConnectionStatus } from '../types.ts';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WEBSOCKET_URL = isLocal ? 'ws://localhost:8000/ws' : `${wsProtocol}//${window.location.host}/ws`;

type Listener<T> = (data: T) => void;

class WebSocketService {
    private ws: WebSocket | null = null;
    private messageListeners: Listener<any>[] = [];
    private statusListeners: Listener<ConnectionStatus>[] = [];
    private reconnectTimeout: any = null;
    private reconnectAttempts = 0;
    private maxReconnectDelay = 30000;
    private token: string | null = null;
    public status: ConnectionStatus = 'disconnected';

    connect(token: string) {
        this.token = token;
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

        this.updateStatus('connecting');
        try {
            this.ws = new WebSocket(WEBSOCKET_URL);
            this.ws.onopen = () => {
                this.updateStatus('connected');
                this.reconnectAttempts = 0;
                this.ws?.send(JSON.stringify({ type: 'auth', payload: { token } }));
            };
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.messageListeners.forEach(listener => listener(data));
                } catch (e) {}
            };
            this.ws.onclose = () => {
                this.ws = null;
                if (this.status !== 'disconnected') this.attemptReconnect();
            };
            this.ws.onerror = () => {};
        } catch (e) {
            this.updateStatus('disconnected');
        }
    }

    private attemptReconnect() {
        this.updateStatus('reconnecting');
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
        this.reconnectAttempts++;
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
            if (this.token) this.connect(this.token);
        }, delay);
    }

    disconnect() {
        this.updateStatus('disconnected');
        this.token = null;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    private updateStatus(newStatus: ConnectionStatus) {
        this.status = newStatus;
        this.statusListeners.forEach(listener => listener(newStatus));
    }

    sendMessage(type: string, payload: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, payload }));
        } else {
            throw new Error('Not connected to server');
        }
    }
    
    addMessageListener(callback: Listener<any>) { this.messageListeners.push(callback); }
    removeMessageListener(callback: Listener<any>) { this.messageListeners = this.messageListeners.filter(cb => cb !== callback); }
    addStatusListener(callback: Listener<ConnectionStatus>) {
        this.statusListeners.push(callback);
        callback(this.status);
    }
    removeStatusListener(callback: Listener<ConnectionStatus>) { this.statusListeners = this.statusListeners.filter(cb => cb !== callback); }
}

export const websocketService = new WebSocketService();