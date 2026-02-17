export interface NetworkMonitorCallbacks {
  onOnline: () => void;
  onOffline: () => void;
}

export class NetworkMonitor {
  private _online: boolean;
  private handleOnline: () => void;
  private handleOffline: () => void;

  constructor(private callbacks: NetworkMonitorCallbacks) {
    this._online =
      typeof navigator !== 'undefined' ? navigator.onLine : true;

    this.handleOnline = () => {
      this._online = true;
      this.callbacks.onOnline();
    };

    this.handleOffline = () => {
      this._online = false;
      this.callbacks.onOffline();
    };
  }

  get isOnline(): boolean {
    return this._online;
  }

  start(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  stop(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }

  destroy(): void {
    this.stop();
  }
}
