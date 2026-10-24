// The existing Node handlers stay shared with local development. Listening on a
// TCP port is replaced by request dispatch in the Workers entrypoint.
export function createServer(handler) {
  const listeners = new Map();
  return {
    handler,
    listeners,
    on(event, listener) {
      const list = listeners.get(event) || [];
      list.push(listener);
      listeners.set(event, list);
      return this;
    },
    close() {}, closeAllConnections() {}, listening: false,
  };
}
