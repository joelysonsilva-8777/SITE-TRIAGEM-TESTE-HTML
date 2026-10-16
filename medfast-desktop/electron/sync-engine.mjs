export class SyncEngine {
  constructor(database, cloud, onChange = () => {}) {
    this.local = database;
    this.cloud = cloud;
    this.onChange = onChange;
    this.state = 'waiting';
    this.message = '';
    this.running = false;
    this.failures = 0;
    this.nextAttempt = 0;
  }
  status() {
    return {
      ...this.local.status(),
      state: this.state,
      message: this.message,
      lastSync: this.local.getMeta('lastSync'),
      session: this.cloud.publicSession(),
    };
  }
  emit() {
    this.onChange(this.status());
  }
  async run(manual = false) {
    if (this.running) return;
    if (!this.cloud.publicSession()) {
      this.state = 'signed-out';
      this.message = 'Dados salvos no computador. Entre para sincronizar.';
      this.emit();
      return;
    }
    if (!manual && Date.now() < this.nextAttempt) return;
    this.running = true;
    this.state = 'syncing';
    this.message = '';
    this.emit();
    try {
      await this.cloud.authorize();
      if (manual) this.local.retryAll();
      // Send before pulling: a committed operation whose acknowledgement was lost must be recognized first.
      if (this.cloud.publicSession().role !== 'viewer') {
        for (const operation of this.local.pending()) {
          try {
            const result = await this.cloud.send(
              operation,
              this.local.getMeta('deviceId'),
            );
            if (result.conflict)
              this.local.conflict(operation, result.conflict);
            else this.local.acknowledge(operation, result.version);
          } catch (error) {
            this.local.retry(
              operation,
              error.message,
              error.status === 400 || error.status === 403,
            );
            throw error;
          }
          this.emit();
        }
      }
      this.local.receive(await this.cloud.pull());
      this.local.setMeta('lastSync', new Date().toISOString());
      const counts = this.local.status();
      this.state = counts.conflicts
        ? 'conflict'
        : counts.errors
          ? 'error'
          : counts.pending
            ? 'pending'
            : 'synced';
      this.message =
        this.cloud.publicSession().role === 'viewer' && counts.pending
          ? 'Conta de consulta: entre com uma conta de edição para enviar os registros pendentes.'
          : '';
      this.failures = 0;
      this.nextAttempt = 0;
    } catch (error) {
      this.state =
        error.status === 401 || error.status === 403
          ? 'auth-error'
          : error.status
            ? 'error'
            : 'offline';
      this.message = error.message;
      this.failures++;
      this.nextAttempt =
        Date.now() + Math.min(300000, 5000 * 2 ** Math.min(this.failures, 6));
    } finally {
      this.running = false;
      this.emit();
    }
  }
  start() {
    this.timer = setInterval(() => void this.run(), 30000);
    this.timer.unref?.();
    void this.run();
  }
  stop() {
    clearInterval(this.timer);
  }
}
