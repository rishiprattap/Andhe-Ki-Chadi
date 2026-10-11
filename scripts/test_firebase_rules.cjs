const fs = require('fs');
const path = require('path');
const targaryen = require('targaryen');

const rulesPath = path.join(__dirname, '..', 'database.rules.json');
const rulesJson = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

// Base initial database state
const initialData = {
  admins: {
    uid_admin_primary: {
      email: 'admin@smartcane.org',
      role: 'admin',
    },
  },
  device_accounts: {
    uid_esp8266_dev1: 'device001',
    uid_esp8266_dev2: 'device002',
  },
  devices: {
    device001: {
      status: {
        online: true,
      },
    },
  },
  alerts: {
    existing_alert_1: {
      deviceId: 'device001',
      type: 'SOS',
      timestamp: 1700000000,
      acknowledged: false,
      note: 'Emergency button pressed on cane',
    },
  },
};

let passed = 0;
let failed = 0;

function assertRule(testName, result, expectedPermitted) {
  const isPermitted = Boolean(result.permitted);
  if (isPermitted === expectedPermitted) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    console.error(`         Expected permitted=${expectedPermitted}, got permitted=${isPermitted}`);
    if (result.info) {
      console.error(`         Rule trace:`, result.info);
    }
    failed++;
  }
}

console.log('================================================================');
console.log('  FIREBASE REALTIME DATABASE SECURITY RULES TEST SUITE');
console.log('================================================================\n');

const db = targaryen.database(rulesJson, initialData);

// -----------------------------------------------------------------------------
// Test Group 1: Device Account Alert Creation & Boundary Checks
// -----------------------------------------------------------------------------
console.log('Test Group 1: Device Account Alert Lifecycle & Permissions');

// 1. Device can create its own alert for assigned deviceId
const newAlertPayload = {
  deviceId: 'device001',
  type: 'SOS',
  timestamp: 1700000100,
  acknowledged: false,
  note: 'Tactile SOS button pressed on D2',
};
const resDevCreate = db.as({ uid: 'uid_esp8266_dev1' }).write('/alerts/new_sos_event_1', newAlertPayload);
assertRule('Device account can create a new SOS alert for its assigned deviceId', resDevCreate, true);

// 2. Device cannot create alert for a different deviceId
const spoofedDeviceAlert = {
  deviceId: 'device002',
  type: 'SOS',
  timestamp: 1700000100,
  acknowledged: false,
};
const resDevSpoof = db.as({ uid: 'uid_esp8266_dev1' }).write('/alerts/new_sos_event_2', spoofedDeviceAlert);
assertRule('Device account CANNOT create an alert for another deviceId', resDevSpoof, false);

// 3. Device cannot overwrite an existing alert (!data.exists() rule)
const resDevOverwrite = db.as({ uid: 'uid_esp8266_dev1' }).write('/alerts/existing_alert_1', newAlertPayload);
assertRule('Device account CANNOT overwrite an existing alert', resDevOverwrite, false);

// 4. Device cannot create a pre-acknowledged alert
const preAckAlert = {
  deviceId: 'device001',
  type: 'SOS',
  timestamp: 1700000100,
  acknowledged: true,
  acknowledgedAt: 1700000100,
};
const resDevPreAck = db.as({ uid: 'uid_esp8266_dev1' }).write('/alerts/new_sos_event_3', preAckAlert);
assertRule('Device account CANNOT create a pre-acknowledged alert', resDevPreAck, false);

// 5. Device cannot read alerts (Device cannot access other user/alert telemetry)
const resDevRead = db.as({ uid: 'uid_esp8266_dev1' }).read('/alerts');
assertRule('Device account CANNOT read the alerts collection', resDevRead, false);

// 6. Device cannot acknowledge alerts
const resDevAck = db.as({ uid: 'uid_esp8266_dev1' }).write('/alerts/existing_alert_1', {
  deviceId: 'device001',
  type: 'SOS',
  timestamp: 1700000000,
  acknowledged: true,
  acknowledgedAt: 1700000050,
});
assertRule('Device account CANNOT acknowledge an alert', resDevAck, false);

// -----------------------------------------------------------------------------
// Test Group 2: Administrator Account Alert Management & Acknowledging
// -----------------------------------------------------------------------------
console.log('\nTest Group 2: Administrator Capabilities & Boundaries');

// 7. Administrator can read all emergency alerts
const resAdminRead = db.as({ uid: 'uid_admin_primary' }).read('/alerts');
assertRule('Administrator can read the alerts collection for monitoring', resAdminRead, true);

// 8. Administrator can acknowledge an existing alert
const adminAckPayload = {
  deviceId: 'device001',
  type: 'SOS',
  timestamp: 1700000000,
  acknowledged: true,
  acknowledgedAt: 1700000060,
  acknowledgedBy: 'Supervisor Alice',
  note: 'Emergency button pressed on cane',
};
const resAdminAck = db.as({ uid: 'uid_admin_primary' }).write('/alerts/existing_alert_1', adminAckPayload);
assertRule('Administrator can acknowledge an existing alert', resAdminAck, true);

// 9. Administrator CANNOT alter immutable fields (deviceId) during acknowledgement
const adminTamperDevice = {
  ...adminAckPayload,
  deviceId: 'device002', // Tampered device ID
};
const resAdminTamperDev = db.as({ uid: 'uid_admin_primary' }).write('/alerts/existing_alert_1', adminTamperDevice);
assertRule('Administrator CANNOT modify deviceId while acknowledging an alert', resAdminTamperDev, false);

// 10. Administrator CANNOT alter timestamp during acknowledgement
const adminTamperTime = {
  ...adminAckPayload,
  timestamp: 1800000000, // Tampered timestamp
};
const resAdminTamperTime = db.as({ uid: 'uid_admin_primary' }).write('/alerts/existing_alert_1', adminTamperTime);
assertRule('Administrator CANNOT modify timestamp while acknowledging an alert', resAdminTamperTime, false);

// 11. Administrator CANNOT create arbitrary new alerts impersonating the cane hardware
const resAdminCreate = db.as({ uid: 'uid_admin_primary' }).write('/alerts/fake_admin_alert', newAlertPayload);
assertRule('Administrator CANNOT create arbitrary new alerts impersonating device', resAdminCreate, false);

// -----------------------------------------------------------------------------
// Test Group 3: Unauthorized Access Restrictions & No Self-Bootstrap
// -----------------------------------------------------------------------------
console.log('\nTest Group 3: Unauthorized Users Restrictions & Anti-Tamper Security');

// 12. Unauthenticated user cannot read alerts
const resAnonRead = db.as(null).read('/alerts');
assertRule('Unauthenticated user CANNOT read alerts', resAnonRead, false);

// 13. Unauthenticated user cannot write alerts
const resAnonWrite = db.as(null).write('/alerts/anon_alert', newAlertPayload);
assertRule('Unauthenticated user CANNOT write alerts', resAnonWrite, false);

// 14. Unauthorized authenticated user cannot read alerts
const resUnauthRead = db.as({ uid: 'unauthorized_attacker' }).read('/alerts');
assertRule('Unauthorized authenticated user CANNOT read alerts', resUnauthRead, false);

// 15. Unauthorized user cannot create or modify alerts
const resUnauthWrite = db.as({ uid: 'unauthorized_attacker' }).write('/alerts/hack_alert', newAlertPayload);
assertRule('Unauthorized authenticated user CANNOT write alerts', resUnauthWrite, false);

// 16. Self-registration as administrator is STRICTLY FORBIDDEN (Requirement 2)
// Even if /admins was completely empty, an unauthorized user cannot grant themselves admin
const emptyDb = targaryen.database(rulesJson, {});
const resSelfRegisterEmpty = emptyDb.as({ uid: 'malicious_user' }).write('/admins/malicious_user', {
  role: 'admin',
  email: 'attacker@evil.com',
});
assertRule('User CANNOT self-register as first admin on empty database (Req 2 verified)', resSelfRegisterEmpty, false);

const resSelfRegisterPopulated = db.as({ uid: 'malicious_user' }).write('/admins/malicious_user', {
  role: 'admin',
  email: 'attacker@evil.com',
});
assertRule('User CANNOT register themselves as admin on populated database (Req 2 verified)', resSelfRegisterPopulated, false);

// 17. Only existing admin can add new admin
const resAdminAddsAdmin = db.as({ uid: 'uid_admin_primary' }).write('/admins/new_supervisor_uid', {
  role: 'admin',
  email: 'supervisor2@smartcane.org',
});
assertRule('Existing administrator CAN register a new supervisor', resAdminAddsAdmin, true);

// -----------------------------------------------------------------------------
// Test Group 4: Device Accounts & Status Isolation
// -----------------------------------------------------------------------------
console.log('\nTest Group 4: Hardware Telemetry & Device Mapping Security');

// 18. Device can update its own status
const resDevStatusOwn = db.as({ uid: 'uid_esp8266_dev1' }).write('/devices/device001/status', {
  online: true,
  lastSeen: 1700000000,
  ip: '192.168.1.145',
});
assertRule('Device can update its own status in /devices/<deviceId>/status', resDevStatusOwn, true);

// 19. Device CANNOT update status of a different device
const resDevStatusOther = db.as({ uid: 'uid_esp8266_dev1' }).write('/devices/device002/status', {
  online: true,
});
assertRule('Device CANNOT update status of a different device', resDevStatusOther, false);

// 20. Unauthorized user CANNOT update device status
const resUnauthDevStatus = db.as({ uid: 'unauthorized_attacker' }).write('/devices/device001/status', {
  online: false,
});
assertRule('Unauthorized user CANNOT update device status', resUnauthDevStatus, false);

// 21. Device account mapping /device_accounts can only be read/managed by admins
const resDevMapAdminRead = db.as({ uid: 'uid_admin_primary' }).read('/device_accounts');
assertRule('Admin can read /device_accounts', resDevMapAdminRead, true);

const resDevMapUnauthRead = db.as({ uid: 'unauthorized_attacker' }).read('/device_accounts');
assertRule('Unauthorized user CANNOT read /device_accounts', resDevMapUnauthRead, false);

console.log('\n================================================================');
console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Firebase security rule test scenarios verified successfully!');
}
