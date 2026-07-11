/**
 * noble-probe.cjs — diagnostic: connect to the tower via UDT's Node BLE adapter
 * (the exact path RealTower uses) and log EVERY notification with a timestamp.
 *
 * Answers: does the Node/noble central receive the tower's periodic battery
 * notifications (the UDT controller app sees one every ~2s), or only event
 * notifications? Run with the tower on and NOT connected to any other central.
 *
 *   node examples/replay-e2e/noble-probe.cjs
 */
const {
  BluetoothAdapterFactory,
  BluetoothPlatform,
  UART_SERVICE_UUID,
  DIS_SERVICE_UUID,
  TOWER_DEVICE_NAME,
} = require('ultimatedarktower');

const ts = () => new Date().toISOString().slice(11, 23);

(async () => {
  const adapter = BluetoothAdapterFactory.create(BluetoothPlatform.NODE);
  let count = 0;
  adapter.onCharacteristicValueChanged((data) => {
    count++;
    console.log(`${ts()}  notif #${count}  len=${data.length}  ${Buffer.from(data).toString('hex')}`);
  });
  adapter.onDisconnect(() => console.log(`${ts()}  DISCONNECTED`));

  console.log(`${ts()}  scanning for "${TOWER_DEVICE_NAME}"…`);
  await adapter.connect(TOWER_DEVICE_NAME, [UART_SERVICE_UUID, DIS_SERVICE_UUID]);
  console.log(`${ts()}  connected — logging notifications for 25s (expect a battery beat ~every 2s)`);

  setTimeout(async () => {
    console.log(`${ts()}  total notifications in 25s: ${count}`);
    try { await adapter.disconnect(); } catch {}
    try { await adapter.cleanup(); } catch {}
    process.exit(0);
  }, 25000);
})().catch((err) => {
  console.error('probe error:', err);
  process.exit(1);
});
