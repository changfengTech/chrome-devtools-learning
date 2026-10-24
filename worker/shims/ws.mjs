export class WebSocketServer {
  clients = new Set();
  handleUpgrade(request, socket, head, callback) {
    const ws = socket.webSocket;
    this.clients.add(ws);
    ws.on('close', () => this.clients.delete(ws));
    callback(ws);
  }
}
