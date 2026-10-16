const { contextBridge, ipcRenderer } = require('electron');
const invoke = (channel, ...args) =>
  ipcRenderer.invoke(channel, ...args).then((result) => {
    if (!result.ok) throw new Error(result.error);
    return result.value;
  });
contextBridge.exposeInMainWorld('clara', {
  load: () => invoke('clara:load'),
  command: (method, args) => invoke('clara:command', method, args),
  login: (email, password) => invoke('clara:login', email, password),
  logout: () => invoke('clara:logout'),
  sync: () => invoke('clara:sync'),
  resolve: (key, choice) => invoke('clara:resolve', key, choice),
  saveDraft: (id, value) => invoke('clara:draft', id, value),
  backup: (password) => invoke('clara:backup', password),
  restore: (password) => invoke('clara:restore', password),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('clara:state', listener);
    return () => ipcRenderer.removeListener('clara:state', listener);
  },
});
