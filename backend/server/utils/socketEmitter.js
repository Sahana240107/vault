const emitNotification = (io, userId, notification) => {
  if (!io) return;
  try { io.to(`user:${userId.toString()}`).emit('new-notification', notification); }
  catch (err) { console.error('[socketEmitter]', err.message); }
};
module.exports = { emitNotification };
