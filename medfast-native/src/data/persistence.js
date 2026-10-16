// Serial writes prevent an earlier snapshot from overwriting a newer one.
function createPersistence(storage, onError = () => {}, onSaved = () => {}) {
  let tail = Promise.resolve();
  return {
    write(key, value) {
      tail = tail
        .then(() => storage.setItem(key, value))
        .then(onSaved)
        .catch(onError);
      return tail;
    },
    flush() {
      return tail;
    },
  };
}
module.exports = { createPersistence };
