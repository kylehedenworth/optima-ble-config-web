/**
 * EdenWorth Farmo configuration tool -- v2 protocol only.
 *
 * Speaks the lib/farmo_bluetooth GATT service (0xCC30-0xCC37) used by
 * ew_water_rat_v3 and ew_farmo_analog_nrf91. The legacy per-setting
 * characteristics (0xCC01-0xCC0B, 0xCC20-0xCC22) are NOT supported here --
 * use ew_farmo_tool.html for older firmware.
 *
 * The service UUID is the same in both generations, so a legacy device will
 * connect and then fail to expose 0xCC30. That is detected and reported.
 */

// DOM objects
const deviceTypeSelect = document.getElementById('deviceType');
const configForm = document.getElementById('configForm');
const statusElement = document.getElementById('bluetoothStatus');

const connectBtn = document.getElementById('bluetoothConnectBtn');
const disconnectBtn = document.getElementById('bluetoothDisconnectBtn');
const readBtn = document.getElementById('bluetoothReadBtn');
const writeBtn = document.getElementById('bluetoothWriteBtn');

// Action buttons
const rebootBtn = document.getElementById('rebootBtn');
const factoryResetBtn = document.getElementById('factoryResetBtn');

const statusRefreshBtn = document.getElementById('statusRefreshBtn');
const statusInfoDiv = document.getElementById('statusInfoDiv');

const logArea = document.getElementById('deviceLogOutput');
const transferLogsBtn = document.getElementById('transferLogsBtn');
const stopLogsBtn = document.getElementById('stopLogsBtn');
const eraseLogsBtn = document.getElementById('eraseLogsBtn');
const saveLogsBtn = document.getElementById('saveLogsBtn');
const logContent = document.getElementById('logContent');

const comLogClearBtn = document.getElementById('comLogClearBtn');

const firmwareStateBtn = document.getElementById('firmwareStateBtn');
const firmwareUploadBtn = document.getElementById('firmwareUploadBtn');
const firmwareInfoDiv = document.getElementById('firmwareInfoDiv');
const firmwareFile = document.getElementById('firmwareFile');

function getElementById_ext(base, key) {
    return document.getElementById(base + '_' + key);
}

/************************************************************************
 *     Protocol constants -- lib/farmo_bluetooth
 ************************************************************************/

const SERVICE_UUID = "0000fe40-cc7a-482a-984a-7f2ed5b3e58b";
const DEVICE_INFO_SERVICE_UUID = "0000180a-0000-1000-8000-00805f9b34fb";
const FIRMWARE_REVISION_CHAR_UUID = "00002a26-0000-1000-8000-00805f9b34fb";

const CHARACTERISTIC_UUIDS = {
    CONFIG:  "0000cc30-0000-1000-8000-00805f9b34fb",
    NETWORK: "0000cc31-0000-1000-8000-00805f9b34fb",
    COMMAND: "0000cc32-0000-1000-8000-00805f9b34fb",
    EVENT:   "0000cc33-0000-1000-8000-00805f9b34fb",
    STATUS:  "0000cc34-0000-1000-8000-00805f9b34fb",
    LOG:     "0000cc35-0000-1000-8000-00805f9b34fb",
    RESET:   "0000cc36-0000-1000-8000-00805f9b34fb",
    REBOOT:  "0000cc37-0000-1000-8000-00805f9b34fb"
};

/* EVENT (0xCC33) byte 0 -- enum farmo_bt_evt */
const EVT_STATE  = 0x01;
const EVT_SENSOR = 0x02;
const EVT_DEBUG  = 0x03;

/**
 * enum farmo_bt_dev_state. Faults are >= FARMO_BT_STATE_ERR_BASE.
 * 0x00 and 0x01 are command replies rather than lifecycle states.
 */
const DEV_STATE_ERROR = 0x00;
const DEV_STATE_ACK   = 0x01;
const DEV_STATE_ERR_BASE = 0x20;

const DEV_STATES = {
    0x00: "ERROR - command not accepted",
    0x01: "ACK",
    0x02: "Offline",
    0x03: "Starting...",
    0x04: "Connecting...",
    0x05: "Connected",
    0x06: "Message ok",
    0x07: "Cloud auth",
    0x08: "GPS searching...",
    0x09: "GPS fixed",
    0x0A: "GPS SNR ok",
    0x0B: "Provisioning",
    0x0C: "Rebooting",
    0x20: "Modem fault",
    0x21: "SIM card fault",
    0x22: "Attach failed",
    0x23: "Message failed",
    0x24: "GPS timeout",
    0x25: "GPS SNR low",
    0x26: "Sensor fault",
    0x27: "Factory test fault"
};

/* enum farmo_bt_sensor. Everything but SDI12_RAW carries one be32. */
const SENSORS = {
    0x01: { name: "Tilt",       fmt: "be32", unit: "x10 deg" },
    0x02: { name: "Analog",     fmt: "be32", unit: "mV" },
    0x03: { name: "Pulse",      fmt: "be32", unit: "count" },
    0x04: { name: "Digital 0",  fmt: "be32", unit: "count" },
    0x05: { name: "Digital 1",  fmt: "be32", unit: "count" },
    0x06: { name: "Temp",       fmt: "be32", unit: "" },
    0x07: { name: "SDI-12",     fmt: "be32", unit: "measurements" },
    0x08: { name: "SDI-12 raw", fmt: "ascii", unit: "" },
    0x09: { name: "Radar",      fmt: "be32", unit: "mm" }
};

/* COMMAND (0xCC32) codes. [0] = cmd, [1..] = optional data. */
const CMD_SEND_MESSAGE  = 1;
const CMD_READ_SENSOR   = 2;      /* farmo: optional raw SDI-12 string */
const CMD_COMMISSION    = 3;
const CMD_DECOMMISSION  = 4;
const CMD_FACTORY_SKIP  = 42;
const CMD_FACTORY_REDO  = 43;
const CMD_SELECT_NBIOT  = 50;
const CMD_SELECT_NTN    = 51;
const CMD_CLEAR_LOG     = 102;
/* Longest command argument the app will keep -- FA_CMD_DATA_MAX in
 * farmo_analog.h, which includes the terminator. */
const CMD_DATA_MAX      = 32;

const CMD_GPS_START     = 201;
const CMD_GPS_STOP      = 202;
const CMD_SIM_INFO      = 203;
const CMD_CELL_STATS    = 204;

/* Object sizes. CONFIG is 16 bytes on WR3 and 28 on the analog app; the
 * first 16 are the shared layout, so the tail is decoded only when present. */
const CFG_LEN_BASE  = 16;
const CFG_LEN_ANALO = 28;
/* Bytes 28..36 were added for batmon. A device built before them reports 28
 * bytes and must still decode everything up to CFG_LEN_ANALO. */
const CFG_LEN_BATMON = 37;
const PROFILE_COUNT = 2;
const PROFILE_LEN     = 32;
const PROFILE_APN_OFF = 8;
const PROFILE_APN_LEN = 24;      /* NUL-padded, 23 usable */
const NET_LEN = PROFILE_COUNT * PROFILE_LEN;
const WR_STATUS_LEN = 13;

// Bluetooth variables
let bluetoothDevice = null;
let bluetoothServer = null;
let deviceService = null;
let deviceInfoService = null;
let firmwareCharacteristic = null;
let isConnected = false;
let deviceCharacteristics = {};

/* CONFIG length reported by the device on the last read. Written back at the
 * same length so a device is never given a short or over-long object. */
let configLenSeen = 0;

/************************************************************************
 *     Parameter definitions
 ************************************************************************/

const readOnlyParameters = {
    firmwareVersion: {
        type: "text",
        label: "Firmware Version",
        default: "",
        readOnly: true
    },
    commissioned: {
        type: "boolean",
        label: "Commissioned State",
        default: false,
        readOnly: true
    }
};

const intervalSettings = {
    heartbeatInterval: {
        type: "number",
        label: "Heartbeat Interval (hours)",
        default: 0,
        min: 1,
        max: 24
    },
    sensorInterval: {
        type: "number",
        label: "Sensor Interval (minutes)",
        default: 0,
        min: 0,
        max: 60
    }
};

/* WS, WSRG, RPC and MDS run the sensor loop on a minute heartbeat */
const minuteHeartbeatInterval = {
    heartbeatInterval: {
        type: "number",
        label: "Heartbeat Interval (minutes)",
        default: 0,
        min: 5,
        max: 1440
    }
};

/* CONFIG bytes 8..15, both apps */
const tiltSettings = {
    tiltAngle: {
        type: "number",
        label: "Tilt Angle (1/10th degrees)",
        default: 0,
        min: 0,
        max: 1800
    },
    tiltOffset: {
        type: "number",
        label: "Tilt Offset (1/10th degrees)",
        default: 0,
        min: -1800,
        max: 1800
    }
};

/* CONFIG bytes 8..11, radar WLM only. The analog app calls this field
 * tank_depth; it is the slot ew_water_rat_v3 uses for tilt_offset. See
 * config_get()/config_set() in farmo_analog_bluetooth.c. Limits match
 * TANK_DEPTH_MM_MIN/MAX in farmo_analog_config.h; the device rejects anything
 * outside them and keeps its previous value. */
const tankDepthSetting = {
    tankDepth: {
        type: "number",
        label: "Tank Depth (mm)",
        default: 3000,
        min: 100,
        max: 30000
    }
};

/* Batmon reuses CONFIG bytes 8..11, 12..15 and 23. It has no tilt, no tank and
 * no pulse input. See config_get()/config_set() in farmo_analog_bluetooth.c. */
const batmonSettings = {
    batmonProfile: {
        type: "select",
        label: "Current sense profile",
        options: [
            { value: 0, display: "0 - 10 A" },
            { value: 1, display: "1 - 20 A" },
            { value: 2, display: "2 - 50 A" }
        ],
        default: 0
    },
    batmonCalScale: {
        type: "number",
        label: "Calibration scale (x1000)",
        default: 1000,
        min: 1,
        max: 1000000
    },
    batmonCalOffset: {
        type: "number",
        label: "Calibration offset (raw)",
        default: 0,
        min: -1000000,
        max: 1000000
    }
};

/* CONFIG byte 16, analog app only */
const transmitDelaySetting = {
    transmitDelay: {
        type: "number",
        label: "Transmit Delay (minutes)",
        default: 0,
        min: 0,
        max: 255
    }
};

/* CONFIG bytes 17..22, analog app only */
const thresholdSettings = {
    thresholdUpper: {
        type: "number",
        label: "Threshold Upper",
        default: 0,
        min: -32768,
        max: 32767
    },
    thresholdLower: {
        type: "number",
        label: "Threshold Lower",
        default: 0,
        min: -32768,
        max: 32767
    },
    thresholdHysteresis: {
        type: "number",
        label: "Threshold Hysteresis",
        default: 0,
        min: 0,
        max: 32767
    }
};

/* CONFIG byte 23, analog app only */
const pulseEventSettings = {
    pulseEvent: {
        type: "boolean",
        label: "Pulse Event",
        default: false
    }
};

/* CONFIG bytes 24..27, analog app only */
const dropSettings = {
    dropMode: {
        type: "select",
        label: "Drop Mode",
        options: [
            { value: 0, display: "Disabled" },
            { value: 1, display: "Cumulative" },
            { value: 2, display: "Constant" }
        ],
        default: 0
    },
    dropThreshold: {
        type: "number",
        label: "Drop Threshold (mV)",
        default: 0,
        min: -32768,
        max: 32767
    },
    dropSamples: {
        type: "number",
        label: "Drop Samples",
        default: 0,
        min: 1,
        max: 10
    }
};

/* Carrier table, matches ew_carrier_type_t */
const CARRIER_OPTIONS = [
    { value: 0, display: "Global" },
    { value: 1, display: "Australia" },
    { value: 2, display: "NTN (Skylo)" }
];

/**
 * NETWORK (0xCC31) is one 32-byte block per profile, each with its own APN,
 * so the form fields are generated per profile rather than written out twice.
 */
function profileParameters(count) {
    const params = {};
    for (let i = 0; i < count; i++) {
        const n = i + 1;
        params['apn' + i]      = { type: "text",    label: `P${n} APN`, default: "", maxLength: PROFILE_APN_LEN - 1 };
        params['carrier' + i]  = { type: "select",  label: `P${n} Carrier`, options: CARRIER_OPTIONS, default: i === 1 ? 2 : 1 };
        params['psm' + i]      = { type: "boolean", label: `P${n} PSM allowed`, default: true };
        params['nbiot' + i]    = { type: "boolean", label: `P${n} NB-IoT allowed`, default: true };
        params['timeout' + i]  = { type: "number",  label: `P${n} Connect timeout (s)`, default: 1200, min: 0, max: 65535 };
        params['failHrs' + i]  = { type: "number",  label: `P${n} Fail window (hrs)`, default: 48, min: 0, max: 255 };
        params['retryHrs' + i] = { type: "number",  label: `P${n} Retry window (hrs)`, default: 0, min: 0, max: 255 };
    }
    return params;
}

const profileSettings = profileParameters(PROFILE_COUNT);

/**
 * Raw SDI-12 command. Rides CMD_READ_SENSOR with the command string as the
 * data tail; the sensor's reply comes back as an SDI12_RAW sensor event.
 * Only offered on variants built with CONFIG_ANALO_SDI12 -- elsewhere the app
 * ignores the string and just forces a sample.
 */
const sdi12Action = {
    label: "Send SDI-12",
    code: CMD_READ_SENSOR,
    input: {
        key: 'sdi12Cmd',
        prompt: 'Raw SDI-12 command, e.g. 0M! then 0D0!',
        placeholder: '0M!',
        maxLength: CMD_DATA_MAX - 1,
        required: true
    }
};

/* Commands offered for every device. One flat namespace -- the modem debug
 * codes are ordinary commands and answer with a debug event like any other.
 * Per-type extras come from `actions`. */
const commonActions = [
    { label: "Send Message", code: CMD_SEND_MESSAGE },
    { label: "Read Sensor",  code: CMD_READ_SENSOR },
    { label: "Commission",   code: CMD_COMMISSION },
    { label: "Decommission", code: CMD_DECOMMISSION },
    { label: "SIM Info",     code: CMD_SIM_INFO },
    { label: "Cell Info",    code: CMD_CELL_STATS },
    { label: "Select NB-IoT",code: CMD_SELECT_NBIOT },
    { label: "Select NTN",   code: CMD_SELECT_NTN },
    { label: "Skip factory test", code: CMD_FACTORY_SKIP,
      confirm: 'Mark factory testing as done? Takes effect on the next reboot.' },
    { label: "Redo factory test", code: CMD_FACTORY_REDO,
      confirm: 'Clear the factory-tested flag? The device will run factory testing on its next reboot.' },
];

/* `cfgLen` is what the app's config_get() returns -- see the CFG_LEN in each
 * app's *_bluetooth.c. Used only as the fallback when the device has not been
 * read yet; a real read always wins. */
const analogParameters = {
    ...readOnlyParameters,
    ...intervalSettings,
    ...transmitDelaySetting,
    ...thresholdSettings,
    ...dropSettings,
    ...profileSettings
};

const deviceConfigurations = {
    "WLM": {
        name: "Water Level Monitor",
        cfgLen: CFG_LEN_ANALO,
        parameters: analogParameters
    },
    "WLMR": {
        name: "Water Level Monitor (Radar)",
        cfgLen: CFG_LEN_ANALO,
        parameters: {
            ...readOnlyParameters,
            ...intervalSettings,
            ...tankDepthSetting,
            ...transmitDelaySetting,
            /* Thresholds are distance in mm, not mV, and the sense is inverted
             * against the analog WLM: a large distance is a low water level.
             * Drop detection is a battery-voltage detector and is left out --
             * conf_radar.conf ships with CONFIG_VDROP_MODE=0. */
            thresholdUpper: {
                ...thresholdSettings.thresholdUpper,
                label: "Threshold Upper (mm)"
            },
            thresholdLower: {
                ...thresholdSettings.thresholdLower,
                label: "Threshold Lower (mm)"
            },
            thresholdHysteresis: {
                ...thresholdSettings.thresholdHysteresis,
                label: "Threshold Hysteresis (mm)"
            },
            ...profileSettings
        }
    },
    "BATM": {
        name: "Battery Monitor",
        cfgLen: CFG_LEN_BATMON,
        parameters: {
            ...readOnlyParameters,
            heartbeatInterval: intervalSettings.heartbeatInterval,
            /* This variant builds with CONFIG_SENSE_SECONDS, so the sense
             * interval is seconds, not minutes. */
            sensorInterval: {
                ...intervalSettings.sensorInterval,
                label: "Sensor Interval (seconds)",
                min: 1,
                max: 255
            },
            ...batmonSettings,
            ...transmitDelaySetting,
            ...profileSettings
        }
    },
    "WPS": {
        name: "WPS Pressure",
        cfgLen: CFG_LEN_ANALO,
        parameters: analogParameters
    },
    "EFS": {
        name: "E-Fence",
        cfgLen: CFG_LEN_ANALO,
        parameters: analogParameters
    },
    "PC": {
        name: "People Counter",
        cfgLen: CFG_LEN_ANALO,
        parameters: {
            ...readOnlyParameters,
            ...intervalSettings,
            ...transmitDelaySetting,
            ...pulseEventSettings,
            ...profileSettings
        }
    },
    "GS": {
        name: "Gate Sensor",
        cfgLen: CFG_LEN_ANALO,
        parameters: {
            ...readOnlyParameters,
            heartbeatInterval: intervalSettings.heartbeatInterval,
            sensorInterval: {
                ...intervalSettings.sensorInterval,
                label: "Sensor Interval - Count Changed (seconds)"
            },
            ...transmitDelaySetting,
            ...pulseEventSettings,
            ...profileSettings
        }
    },
    "RG": {
        name: "Rain Gauge",
        cfgLen: CFG_LEN_ANALO,
        parameters: {
            ...readOnlyParameters,
            heartbeatInterval: intervalSettings.heartbeatInterval,
            sensorInterval: {
                ...intervalSettings.sensorInterval,
                label: "Sensor Interval - Count Changed (seconds)"
            },
            ...transmitDelaySetting,
            ...pulseEventSettings,
            ...profileSettings
        }
    },
    "MDS": {
        name: "MDS",
        cfgLen: CFG_LEN_ANALO,
        parameters: {
            ...readOnlyParameters,
            heartbeatInterval: minuteHeartbeatInterval.heartbeatInterval,
            ...transmitDelaySetting,
            ...profileSettings
        },
        actions: [ sdi12Action ]
    },
    "WS": {
        name: "Weather Station",
        cfgLen: CFG_LEN_ANALO,
        parameters: {
            ...readOnlyParameters,
            heartbeatInterval: minuteHeartbeatInterval.heartbeatInterval,
            ...transmitDelaySetting,
            ...profileSettings
        },
        actions: [ sdi12Action ]
    },
    "WSRG": {
        name: "Weather Station with Rain Gauge",
        cfgLen: CFG_LEN_ANALO,
        parameters: {
            ...readOnlyParameters,
            heartbeatInterval: minuteHeartbeatInterval.heartbeatInterval,
            ...transmitDelaySetting,
            ...pulseEventSettings,
            ...profileSettings
        },
        actions: [ sdi12Action ]
    },
    "RPC": {
        name: "RPC",
        cfgLen: CFG_LEN_ANALO,
        parameters: {
            ...readOnlyParameters,
            heartbeatInterval: minuteHeartbeatInterval.heartbeatInterval,
            ...transmitDelaySetting,
            ...profileSettings
        }
    },
    "WR3": {
        name: "WR v3",
        cfgLen: CFG_LEN_BASE,
        parameters: {
            ...readOnlyParameters,
            ...intervalSettings,
            gpsInterval: {
                type: "number", label: "GPS Interval (heart-beats)", default: 0, min: 0, max: 24
            },
            ...tiltSettings,
            ...profileSettings
        },
        actions: [
            { label: "GPS Start",     code: CMD_GPS_START },
            { label: "GPS Stop",      code: CMD_GPS_STOP },
        ],
        status: 'waterRat'
    }
};

/* Global configuration storage resource */
let GlobalConfig = {};

/* Selected device type */
let DeviceType;

/* Last argument entered per action, offered as the prompt default next time */
let actionInputValues = {};

/************************************************************************
 *     Helpers
 ************************************************************************/

function getAvailableDeviceTypes() {
    const devices = {};
    for (const [id, config] of Object.entries(deviceConfigurations)) {
        devices[id] = config.name;
    }
    return devices;
}

/**
 * Determine device type from Bluetooth device name.
 * WR3 is matched before WR so a v3 Water Rat does not fall through to the
 * bare WR pattern.
 */
function getDeviceTypeFromBluetoothName(deviceName) {
    if (!deviceName) return null;

    const normalizedName = deviceName.toUpperCase();

    const namePatterns = [
        { pattern: /WR3/i,      deviceType: 'WR3' },
        { pattern: /BATM/i,     deviceType: 'BATM' },
        { pattern: /WLMR/i,     deviceType: 'WLMR' },   // Before WLM
        { pattern: /WLM/i,      deviceType: 'WLM' },
        { pattern: /WPS/i,      deviceType: 'WPS' },
        { pattern: /EFS/i,      deviceType: 'EFS' },
        { pattern: /RPC/i,      deviceType: 'RPC' },
        { pattern: /PC/i,       deviceType: 'PC' },
        { pattern: /GS/i,       deviceType: 'GS' },
        { pattern: /RG/i,       deviceType: 'RG' },
        { pattern: /MDS/i,      deviceType: 'MDS' },
        { pattern: /WS(?!R)/i,  deviceType: 'WS' },  // Match WS but not WSRG
        { pattern: /WSR/i,      deviceType: 'WSRG' },
        { pattern: /WR/i,       deviceType: 'WR3' },
    ];

    for (const { pattern, deviceType } of namePatterns) {
        if (pattern.test(normalizedName)) {
            return deviceType;
        }
    }

    const deviceTypes = Object.keys(deviceConfigurations);
    for (const deviceType of deviceTypes) {
        if (normalizedName.includes(deviceType)) {
            return deviceType;
        }
    }

    return null;
}

/**
 * Whether the selected variant puts its tank depth in the tilt_offset slot.
 * Driven off the parameter list so a new radar variant only has to include
 * tankDepthSetting.
 */
function variantUsesTankDepth() {
    return 'tankDepth' in getDeviceTypeParameters(DeviceType);
}

/** Whether the selected variant puts batmon fields in the shared slots. */
function variantUsesBatmon() {
    return 'batmonProfile' in getDeviceTypeParameters(DeviceType);
}

function getDeviceTypeParameters(deviceType) {
    const config = deviceConfigurations[deviceType] || null;
    if (!config) return {};
    return config.parameters;
}

function validateParameterValue(value, paramDef) {
    const result = { isValid: true, message: '' };

    if (paramDef.type === 'number') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
            result.isValid = false;
            result.message = 'Value must be a number';
        } else if ('min' in paramDef && numValue < paramDef.min) {
            result.isValid = false;
            result.message = `Value must be at least ${paramDef.min}`;
        } else if ('max' in paramDef && numValue > paramDef.max) {
            result.isValid = false;
            result.message = `Value must be at most ${paramDef.max}`;
        }
    } else if (paramDef.type === 'text' && 'maxLength' in paramDef) {
        if (String(value).length > paramDef.maxLength) {
            result.isValid = false;
            result.message = `At most ${paramDef.maxLength} characters`;
        }
    } else if (paramDef.type === 'select' && paramDef.options) {
        if (Array.isArray(paramDef.options)) {
            for (const option of paramDef.options) {
                if (option.value === value) {
                    result.isValid = true;
                    return result;
                }
            }
        }
        result.isValid = false;
        result.message = `Value must be one of: ${paramDef.options.map(a => a.display).join(', ')}`;
    }

    return result;
}

function configToJSON(deviceId, config) {
    return JSON.stringify({
        deviceType: deviceId,
        settings: config,
        timestamp: new Date().toISOString()
    }, null, 2);
}

function parseConfigJSON(jsonStr) {
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse configuration JSON:", e);
        return null;
    }
}

/** Read a NUL-padded fixed-width string out of a DataView. */
function readFixedString(view, offset, maxLen) {
    const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, maxLen);
    let end = bytes.indexOf(0);
    if (end < 0) end = maxLen;
    return new TextDecoder().decode(bytes.subarray(0, end));
}

/** Write a NUL-padded fixed-width string; anything longer is cut. */
function writeFixedString(bytes, offset, maxLen, str) {
    const encoded = new TextEncoder().encode(str || '');
    const n = Math.min(encoded.length, maxLen - 1);
    bytes.set(encoded.subarray(0, n), offset);
    for (let i = offset + n; i < offset + maxLen; i++) {
        bytes[i] = 0;
    }
}

/************************************************************************
 *     UI
 ************************************************************************/

function initDeviceTypeDropdown() {
    const devices = getAvailableDeviceTypes();

    deviceTypeSelect.innerHTML = '<option value="">-- Select Device --</option>';

    for (const [id, name] of Object.entries(devices)) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        deviceTypeSelect.appendChild(option);
    }
}

function updateDeviceTypeSelect(newType) {
    console.log("Update device type select:", newType);
    DeviceType = newType;
    deviceTypeSelect.value = newType;
}

function deviceTypeSelectUpdated() {
    if (DeviceType != deviceTypeSelect.value) {
        DeviceType = deviceTypeSelect.value;
        renderConfigForm();
    }
}

function autoDetectUpdated() {
    deviceTypeSelect.disabled = autoDetectCheckbox.checked;
}

/**
 * Render the action buttons for the selected device: common actions plus any
 * per-type extras. Rebuilt on device-type change and connection-state change.
 */
function renderCustomActions() {
    const box = document.getElementById('deviceCustomActions');
    box.innerHTML = '';
    const cfg = deviceConfigurations[DeviceType];
    if (!cfg) return;   // no device selected
    const actions = [...commonActions, ...(cfg.actions || [])];
    for (const a of actions) {
        const btn = document.createElement('button');
        btn.textContent = a.label;
        btn.disabled = !isConnected;
        btn.title = a.input ? a.input.prompt : (a.confirm || '');
        btn.onclick = () => {
            if (a.confirm && !confirm(a.confirm)) {
                return;
            }
            return a.input ? promptAndSend(a) : sendCommand(a.code, null, a.label);
        };
        box.appendChild(btn);
    }
}

/**
 * Ask for an action's argument, then send it. The last value is offered as the
 * default so a repeated exchange (0M! then 0D0!) is a small edit.
 */
function promptAndSend(a) {
    const inp = a.input;
    const entered = prompt(inp.prompt || a.label,
                           actionInputValues[inp.key] || inp.placeholder || '');
    if (entered === null) {
        return;     // cancelled
    }

    const data = entered.trim();

    if (inp.required && !data) {
        /* Sending the bare code would silently mean something else --
         * CMD_READ_SENSOR with no tail just reads the sensor. */
        logMessage(`${a.label}: no command entered`);
        return;
    }
    if (inp.maxLength && data.length > inp.maxLength) {
        /* The device would cut it without saying so */
        logMessage(`${a.label}: at most ${inp.maxLength} characters`);
        return;
    }

    actionInputValues[inp.key] = data;
    sendCommand(a.code, data, a.label);
}

function renderConfigForm() {
    let prefix = 'device';

    configForm.innerHTML = ``;

    if (!DeviceType) {
        configForm.classList.add('hidden');
        return;
    } else {
        configForm.classList.remove('hidden');
    }

    const table = document.createElement('table');
    table.className = 'config-table';

    const tbody = document.createElement('tbody');

    for (const [key, param] of Object.entries( getDeviceTypeParameters(DeviceType) )) {
        const row = document.createElement('tr');
        const fieldId = `${prefix}_${key}`;

        const labelCell = document.createElement('td');
        labelCell.textContent = param.label;
        row.appendChild(labelCell);

        const inputCell = document.createElement('td');
        let input;

        switch (param.type) {
            case 'number':
                input = document.createElement('input');
                input.type = 'number';
                input.id = fieldId;
                input.name = key;
                input.dataset.section = prefix;
                input.value = param.default;

                if ('min' in param) input.min = param.min;
                if ('max' in param) input.max = param.max;

                if ('readOnly' in param && param.readOnly) {
                    input.readOnly = true;
                    input.classList.add('read-only');
                }
                break;

            case 'boolean':
                input = document.createElement('input');
                input.type = 'checkbox';
                input.id = fieldId;
                input.name = key;
                input.dataset.section = prefix;
                input.checked = param.default;

                if ('readOnly' in param && param.readOnly) {
                    input.disabled = true;
                    input.classList.add('read-only');
                }
                break;

            case 'select':
                input = document.createElement('select');
                input.id = fieldId;
                input.name = key;
                input.dataset.section = prefix;

                if (param.options && Array.isArray(param.options)) {
                    param.options.forEach(option => {
                        const optionElement = document.createElement('option');
                        optionElement.value = option.value;
                        optionElement.textContent = option.display;
                        if (param.default === option.value) {
                            optionElement.selected = true;
                        }
                        input.appendChild(optionElement);
                    });
                }

                if ('readOnly' in param && param.readOnly) {
                    input.disabled = true;
                    input.classList.add('read-only');
                }
                break;

            case 'text':
            default:
                input = document.createElement('input');
                input.type = 'text';
                input.id = fieldId;
                input.name = key;
                input.dataset.section = prefix;
                input.value = param.default;

                if ('maxLength' in param) input.maxLength = param.maxLength;

                if ('readOnly' in param && param.readOnly) {
                    input.readOnly = true;
                    input.classList.add('read-only');
                }
                break;
        }

        inputCell.appendChild(input);
        row.appendChild(inputCell);
        tbody.appendChild(row);
    }

    table.appendChild(tbody);
    configForm.appendChild(table);

    renderCustomActions();
}

function updateUIFromConfig() {
    let prefix = 'device';
    const deviceParameters = getDeviceTypeParameters(DeviceType);

    for (const key of Object.keys(deviceParameters)) {
        const element = getElementById_ext(prefix, key);
        if (!element || !(key in GlobalConfig)) continue;
        if (deviceParameters[key].type === 'boolean') {
            element.checked = Boolean(GlobalConfig[key]);
        } else {
            element.value = GlobalConfig[key];
        }
    }
    logMessage('UI updated with device configuration');
}

function updateConfigFromUI() {
    let prefix = 'device';
    const deviceParameters = getDeviceTypeParameters(DeviceType);

    for (const key of Object.keys(deviceParameters)) {
        const element = getElementById_ext(prefix, key);
        if (!element) continue;

        let value = null;

        if (deviceParameters[key].type === 'boolean') {
            value = element.checked;
        } else if (deviceParameters[key].type === 'number') {
            value = Number(element.value);
        } else if (deviceParameters[key].type === 'select') {
            value = Number(element.value);
        } else {
            value = element.value;
        }

        let res = validateParameterValue(value, deviceParameters[key]);
        if (res.isValid) {
            GlobalConfig[key] = value;
        } else {
            alert('Invalid: ' + deviceParameters[key].label + '. ' + res.message);
        }
    }
    return GlobalConfig;
}

/************************************************************************
 *     Bluetooth
 ************************************************************************/

function isBluetoothSupported() {
    return navigator.bluetooth !== undefined;
}

async function connectToDevice() {
    if (!isBluetoothSupported()) {
        logMessage('Bluetooth not supported by your browser');
        return;
    }

    try {
        logMessage('Requesting Bluetooth device...');

        bluetoothDevice = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
                'battery_service',
                'device_information',
                '8d53dc1d-1db7-4cd3-868b-8a527460aa84', // SMP
                SERVICE_UUID
            ]
        });

        logMessage('Connecting to device...');
        bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

        const server = await bluetoothDevice.gatt.connect();
        bluetoothServer = server;

        logMessage('Getting primary services...');
        deviceService = await server.getPrimaryService(SERVICE_UUID);

        logMessage('Getting characteristics...');
        await getCharacteristics();

        /* The service UUID is shared with the legacy firmware, so reaching
         * this point proves nothing. CONFIG does. */
        if (!deviceCharacteristics.CONFIG) {
            logMessage('ERROR: 0xCC30 not found. This looks like legacy firmware -- use ew_farmo_tool.html.');
            updateStatus('Unsupported firmware', 'error');
            await disconnectDevice();
            return false;
        }

        isConnected = true;
        updateStatus('Connected to ' + bluetoothDevice.name);
        updateConnectionUI(true);

        // Select device type: name matching when Auto is checked, else the manual selection
        let selectedDeviceType;
        if (autoDetectCheckbox.checked) {
            selectedDeviceType = getDeviceTypeFromBluetoothName(bluetoothDevice.name);
            if (selectedDeviceType) {
                logMessage(`Auto-detected device type: ${selectedDeviceType}`);
                updateDeviceTypeSelect(selectedDeviceType);
            } else {
                logMessage(`Could not auto-detect device type from name: ${bluetoothDevice.name}`);
            }
        } else {
            selectedDeviceType = deviceTypeSelect.value;
            if (selectedDeviceType) {
                logMessage(`Using selected device type: ${selectedDeviceType}`);
                DeviceType = selectedDeviceType;
            }
        }

        /* Read after the type is known -- the CONFIG tail and STATUS decode
         * are per-variant. */
        try {
            logMessage('Auto-reading parameters from device...');
            await readAllDeviceParameters();
        } catch (readError) {
            console.error('Error auto-reading parameters:', readError);
            logMessage('ERROR: Failed to auto-read parameters: ' + readError.message);
        }

        // Attach MCUMGR service
        await mcumgr.connect(bluetoothDevice, bluetoothServer);

    } catch (error) {
        console.error('Bluetooth connection error:', error);
        logMessage('Connection failed: ' + error.message);
        disconnectDevice();
        return false;
    }
    return true;
}

/**
 * Resolve every characteristic and subscribe to EVENT. A missing
 * characteristic is not fatal -- an app may leave STATUS or LOG unimplemented.
 */
async function getCharacteristics() {
    try {
        try {
            deviceInfoService = await bluetoothServer.getPrimaryService(DEVICE_INFO_SERVICE_UUID);
            firmwareCharacteristic = await deviceInfoService.getCharacteristic(FIRMWARE_REVISION_CHAR_UUID);
            logMessage('Found device information service');
        } catch (error) {
            console.warn('Could not get device information service:', error);
            logMessage('WARNING: Device information service not available');
        }

        for (const [key, uuid] of Object.entries(CHARACTERISTIC_UUIDS)) {
            try {
                const characteristic = await deviceService.getCharacteristic(uuid);
                deviceCharacteristics[key] = characteristic;
                console.log(`Got characteristic ${key}`);

                /* Everything the device says arrives here: state, sensor
                 * readings and debug text. */
                if (key === 'EVENT') {
                    await characteristic.startNotifications();
                    characteristic.addEventListener('characteristicvaluechanged', handleEventNotification);
                }
            } catch (error) {
                console.warn(`Characteristic ${key} not found:`, error);
            }
        }
    } catch (error) {
        console.error('Error getting characteristics:', error);
        throw error;
    }
}

async function disconnectDevice() {
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
        if (deviceCharacteristics.EVENT) {
            try {
                await deviceCharacteristics.EVENT.stopNotifications();
                deviceCharacteristics.EVENT.removeEventListener('characteristicvaluechanged', handleEventNotification);
                logMessage('Unsubscribed from EVENT notifications');
            } catch (e) {
                console.warn('Could not stop EVENT notifications:', e);
            }
        }

        bluetoothDevice.gatt.disconnect();
    }
    onDisconnected();
}

function onDisconnected() {
    isConnected = false;
    deviceService = null;
    deviceInfoService = null;
    firmwareCharacteristic = null;
    deviceCharacteristics = {};
    configLenSeen = 0;
    updateStatus('Not connected');
    logMessage('Disconnected');
    updateConnectionUI(false);
}

async function readCharacteristic(characteristicKey) {
    if (!isConnected || !deviceCharacteristics[characteristicKey]) {
        throw new Error(`Cannot read ${characteristicKey}: Not connected or characteristic not found`);
    }

    try {
        logMessage(`Reading ${characteristicKey}...`);
        return await deviceCharacteristics[characteristicKey].readValue();
    } catch (error) {
        console.error(`Error reading ${characteristicKey}:`, error);
        logMessage(`Failed to read ${characteristicKey}: ${error.message}`);
        throw error;
    }
}

async function writeCharacteristic(characteristicKey, value) {
    if (!isConnected || !deviceCharacteristics[characteristicKey]) {
        throw new Error(`Cannot write to ${characteristicKey}: Not connected or characteristic not found`);
    }

    try {
        logMessage(`Writing to ${characteristicKey}...`);
        await deviceCharacteristics[characteristicKey].writeValue(value);
        return true;
    } catch (error) {
        console.error(`Error writing to ${characteristicKey}:`, error);
        logMessage(`Failed to write to ${characteristicKey}: ${error.message}`);
        throw error;
    }
}

/************************************************************************
 *     CONFIG (0xCC30) codec
 *
 * Big-endian. Bytes 0..15 are shared by both apps; 16..27 exist only on
 * ew_farmo_analog_nrf91.
 *   0  2  sense_interval  be16   minutes
 *   2  1  hb_interval            hours
 *   3  1  gps_interval           GPS every N heartbeats, 0 = off
 *   4  1  commissioned           0/1
 *   5  3  reserved
 *   8  4  tilt_offset     be32   signed, x10 degrees
 *                                (radar WLM stores tank depth in mm here)
 *  12  4  tilt_angle      be32   signed, x10 degrees
 *  16  1  trans_delay            minutes
 *  17  2  analog_upper    be16   signed
 *  19  2  analog_lower    be16   signed
 *  21  2  analog_hyst     be16   signed
 *  23  1  pulse_en               0/1
 *  24  1  vdrop_mode             0=off, 1=cumulative, 2=constant
 *  25  2  vdrop_thresh    be16   signed, mV
 *  27  1  vdrop_samples
 *  28  1  batmon_profile         range profile index, batmon only
 *  29  4  batmon_cal_scale be32   signed, x1000, batmon only
 *  33  4  batmon_cal_offset be32  signed, batmon only
 ************************************************************************/

function configDecode(view) {
    GlobalConfig.sensorInterval = view.getUint16(0, false);
    GlobalConfig.heartbeatInterval = view.getUint8(2);
    GlobalConfig.gpsInterval = view.getUint8(3);
    GlobalConfig.commissioned = view.getUint8(4) === 1;
    GlobalConfig.tiltOffset = view.getInt32(8, false);
    /* Same four bytes -- the radar WLM keeps its tank depth in this slot */
    GlobalConfig.tankDepth = GlobalConfig.tiltOffset;
    GlobalConfig.tiltAngle = view.getInt32(12, false);

    if (view.byteLength < CFG_LEN_ANALO) {
        return;
    }

    GlobalConfig.transmitDelay = view.getUint8(16);
    GlobalConfig.thresholdUpper = view.getInt16(17, false);
    GlobalConfig.thresholdLower = view.getInt16(19, false);
    GlobalConfig.thresholdHysteresis = view.getInt16(21, false);
    GlobalConfig.pulseEvent = view.getUint8(23) === 1;
    GlobalConfig.dropMode = view.getUint8(24);
    GlobalConfig.dropThreshold = view.getInt16(25, false);
    GlobalConfig.dropSamples = view.getUint8(27);

    if (view.byteLength < CFG_LEN_BATMON) {
        return;
    }

    GlobalConfig.batmonProfile = view.getUint8(28);
    GlobalConfig.batmonCalScale = view.getInt32(29, false);
    GlobalConfig.batmonCalOffset = view.getInt32(33, false);
}

function configEncode(len) {
    const buffer = new ArrayBuffer(len);
    const view = new DataView(buffer);

    view.setUint16(0, GlobalConfig.sensorInterval || 0, false);
    view.setUint8(2, GlobalConfig.heartbeatInterval || 0);
    view.setUint8(3, GlobalConfig.gpsInterval || 0);
    view.setUint8(4, GlobalConfig.commissioned ? 1 : 0);
    /* 5..7 reserved, left zero */
    view.setInt32(8, variantUsesTankDepth() ? (GlobalConfig.tankDepth || 0)
                                            : (GlobalConfig.tiltOffset || 0), false);
    view.setInt32(12, GlobalConfig.tiltAngle || 0, false);

    if (len < CFG_LEN_ANALO) {
        return buffer;
    }

    view.setUint8(16, GlobalConfig.transmitDelay || 0);
    view.setInt16(17, GlobalConfig.thresholdUpper || 0, false);
    view.setInt16(19, GlobalConfig.thresholdLower || 0, false);
    view.setInt16(21, GlobalConfig.thresholdHysteresis || 0, false);
    view.setUint8(23, GlobalConfig.pulseEvent ? 1 : 0);
    view.setUint8(24, GlobalConfig.dropMode || 0);
    view.setInt16(25, GlobalConfig.dropThreshold || 0, false);
    view.setUint8(27, GlobalConfig.dropSamples || 0);

    if (len < CFG_LEN_BATMON) {
        return buffer;
    }

    view.setUint8(28, GlobalConfig.batmonProfile || 0);
    view.setInt32(29, GlobalConfig.batmonCalScale || 0, false);
    view.setInt32(33, GlobalConfig.batmonCalOffset || 0, false);

    return buffer;
}

/************************************************************************
 *     NETWORK (0xCC31) codec
 *
 * One 32-byte block per profile, each carrying its own APN.
 *  +0   1  carrier                0=GLOBAL, 1=AU, 2=SKYLO
 *  +1   1  flags                  bit0 psm_allowed, bit1 nbiot_allowed
 *  +2   2  conn_timeout    be16   seconds
 *  +4   1  fail_window_hrs
 *  +5   1  retry_window_hrs
 *  +6   2  reserved               0
 *  +8  24  apn                    NUL-padded, 23 chars usable
 ************************************************************************/

function networkDecode(view) {
    const count = Math.min(PROFILE_COUNT, Math.floor(view.byteLength / PROFILE_LEN));

    for (let i = 0; i < count; i++) {
        const o = i * PROFILE_LEN;
        const flags = view.getUint8(o + 1);

        GlobalConfig['carrier' + i]  = view.getUint8(o);
        GlobalConfig['psm' + i]      = (flags & 0x01) === 0x01;
        GlobalConfig['nbiot' + i]    = (flags & 0x02) === 0x02;
        GlobalConfig['timeout' + i]  = view.getUint16(o + 2, false);
        GlobalConfig['failHrs' + i]  = view.getUint8(o + 4);
        GlobalConfig['retryHrs' + i] = view.getUint8(o + 5);
        GlobalConfig['apn' + i]      = readFixedString(view, o + PROFILE_APN_OFF, PROFILE_APN_LEN);
    }
}

function networkEncode() {
    const buffer = new ArrayBuffer(NET_LEN);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    for (let i = 0; i < PROFILE_COUNT; i++) {
        const o = i * PROFILE_LEN;
        const flags = (GlobalConfig['psm' + i] ? 0x01 : 0) |
                      (GlobalConfig['nbiot' + i] ? 0x02 : 0);

        view.setUint8(o, (GlobalConfig['carrier' + i] || 0) & 0xFF);
        view.setUint8(o + 1, flags);
        view.setUint16(o + 2, GlobalConfig['timeout' + i] || 0, false);
        view.setUint8(o + 4, (GlobalConfig['failHrs' + i] || 0) & 0xFF);
        view.setUint8(o + 5, (GlobalConfig['retryHrs' + i] || 0) & 0xFF);
        /* +6..7 reserved, left zero */
        writeFixedString(bytes, o + PROFILE_APN_OFF, PROFILE_APN_LEN, GlobalConfig['apn' + i]);
    }

    return buffer;
}

/************************************************************************
 *     STATUS (0xCC34)
 *
 * Water Rat, 13 bytes:
 *   0   1  alarm_bits
 *   1   1  profile_bits      bit0 = NTN profile active
 *   2  10  modem_error_code[10]
 *  12   1  device_error_code
 *
 * The analog app leaves status_get NULL, so its read returns empty.
 ************************************************************************/

const WR_ALARM_BITS = [
    "Tilted over", "Dropped", "ADXL fault", "Heartbeat pending",
    "Retry pending", "Commissioning", "Modem fault", "Watchdog fault"
];

function statusDecodeWaterRat(view) {
    if (view.byteLength < WR_STATUS_LEN) {
        return `STATUS too short: ${view.byteLength} bytes`;
    }

    const alarms = view.getUint8(0);
    const profile = view.getUint8(1);

    const active = [];
    for (let i = 0; i < WR_ALARM_BITS.length; i++) {
        if (alarms & (1 << i)) active.push(WR_ALARM_BITS[i]);
    }

    const modemErrors = [];
    for (let i = 0; i < 10; i++) {
        const code = view.getUint8(2 + i);
        if (code !== 0) modemErrors.push(code);
    }

    const deviceError = view.getUint8(12);

    let html = `Alarms: ${active.length ? active.join(', ') : 'none'}<br/>`;
    html += `Profile: ${(profile & 0x01) ? 'NTN' : 'NB-IoT'}<br/>`;
    html += `Modem errors: ${modemErrors.length ? modemErrors.join(', ') : 'none'}<br/>`;
    html += `Device error: ${deviceError}`;
    return html;
}

async function refreshDeviceStatus() {
    if (!isConnected || !deviceCharacteristics.STATUS) {
        statusInfoDiv.textContent = 'STATUS not available';
        return;
    }

    try {
        const value = await readCharacteristic('STATUS');
        if (value.byteLength === 0) {
            statusInfoDiv.textContent = 'No status object for this device';
            return;
        }

        const cfg = deviceConfigurations[DeviceType];
        if (cfg && cfg.status === 'waterRat') {
            statusInfoDiv.innerHTML = statusDecodeWaterRat(value);
        } else {
            /* Unknown layout -- show the raw bytes rather than guess */
            const arr = new Uint8Array(value.buffer);
            statusInfoDiv.textContent = Array.from(arr)
                .map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
        }
    } catch (error) {
        statusInfoDiv.textContent = 'Failed to read status: ' + error.message;
    }
}

/************************************************************************
 *     Read / write all
 ************************************************************************/

async function readAllDeviceParameters() {
    try {
        if (firmwareCharacteristic) {
            const firmwareValue = await firmwareCharacteristic.readValue();
            const firmwareString = new TextDecoder().decode(firmwareValue);
            GlobalConfig.firmwareVersion = firmwareString.trim();
            logMessage('Read Firmware Version: ' + firmwareString.trim());
        } else {
            logMessage('WARNING: Could not read Firmware Version - Service not available');
            GlobalConfig.firmwareVersion = 'Not Available';
        }
    } catch (error) {
        console.warn('Could not read Firmware Version:', error);
        logMessage('WARNING: Could not read Firmware Version: ' + error.message);
        GlobalConfig.firmwareVersion = 'Error Reading';
    }

    try {
        const cfgValue = await readCharacteristic('CONFIG');
        configLenSeen = cfgValue.byteLength;
        configDecode(cfgValue);
        logMessage(`Read CONFIG (${configLenSeen} bytes): ` +
                   `sense ${GlobalConfig.sensorInterval}, hb ${GlobalConfig.heartbeatInterval}, ` +
                   `gps ${GlobalConfig.gpsInterval}, commissioned ${GlobalConfig.commissioned}`);
        if (configLenSeen >= CFG_LEN_ANALO) {
            logMessage(`  thresholds - upper ${GlobalConfig.thresholdUpper}, lower ${GlobalConfig.thresholdLower}, hyst ${GlobalConfig.thresholdHysteresis}`);
            if (variantUsesBatmon()) {
                logMessage(`  batmon - profile ${GlobalConfig.batmonProfile}, ` +
                           `cal scale ${GlobalConfig.batmonCalScale}, ` +
                           `cal offset ${GlobalConfig.batmonCalOffset}`);
            }
            else if (variantUsesTankDepth()) {
                logMessage(`  radar - tank depth ${GlobalConfig.tankDepth} mm`);
            } else {
                logMessage(`  drop - mode ${GlobalConfig.dropMode}, threshold ${GlobalConfig.dropThreshold}, samples ${GlobalConfig.dropSamples}`);
            }
        } else {
            logMessage(`  tilt - angle ${GlobalConfig.tiltAngle}, offset ${GlobalConfig.tiltOffset}`);
        }
    } catch (error) {
        console.warn('Could not read CONFIG:', error);
        logMessage('WARNING: Could not read CONFIG. ' + error.message);
    }

    try {
        const netValue = await readCharacteristic('NETWORK');
        networkDecode(netValue);
        for (let i = 0; i < PROFILE_COUNT; i++) {
            logMessage(`P${i + 1}: apn "${GlobalConfig['apn' + i]}", carrier ${GlobalConfig['carrier' + i]}, ` +
                       `psm ${GlobalConfig['psm' + i]}, nbiot ${GlobalConfig['nbiot' + i]}, ` +
                       `timeout ${GlobalConfig['timeout' + i]}, failHrs ${GlobalConfig['failHrs' + i]}, ` +
                       `retryHrs ${GlobalConfig['retryHrs' + i]}`);
        }
    } catch (error) {
        console.warn('Could not read NETWORK:', error);
        logMessage('WARNING: Could not read NETWORK. ' + error.message);
    }

    renderConfigForm();
    updateUIFromConfig();
    await refreshDeviceStatus();
}

async function writeAllParameters() {
    if (!isConnected) {
        logMessage('Not connected to a device');
        return;
    }

    if (!DeviceType) {
        logMessage('Please select a device variant first');
        return;
    }

    try {
        logMessage('Starting parameter write to device...');

        updateConfigFromUI();
        console.log(GlobalConfig);

        /* Write the object back at the length the device reported. Falls back
         * to the variant's declared size when the read failed. */
        const cfgLen = configLenSeen || deviceConfigurations[DeviceType].cfgLen;
        await writeCharacteristic('CONFIG', configEncode(cfgLen));
        logMessage(`Wrote CONFIG (${cfgLen} bytes)`);

        await writeCharacteristic('NETWORK', networkEncode());
        for (let i = 0; i < PROFILE_COUNT; i++) {
            logMessage(`Wrote P${i + 1}: apn "${GlobalConfig['apn' + i]}", carrier ${GlobalConfig['carrier' + i]}, ` +
                       `psm ${GlobalConfig['psm' + i]}, nbiot ${GlobalConfig['nbiot' + i]}, ` +
                       `timeout ${GlobalConfig['timeout' + i]}, failHrs ${GlobalConfig['failHrs' + i]}, ` +
                       `retryHrs ${GlobalConfig['retryHrs' + i]}`);
        }

        logMessage('All parameters written successfully');
    } catch (error) {
        console.error('Error writing parameters:', error);
        logMessage('ERROR: ' + error.message);
    }
}

/************************************************************************
 *     EVENT (0xCC33) notifications
 *
 *   [0] EVT_STATE   [1..4] be32 state
 *   [0] EVT_SENSOR  [1] sensor type    [2..] data
 *   [0] EVT_DEBUG   [1] text length    [2..] text
 *
 * Nothing marks an event as an answer to a command; ordering is the only
 * association available.
 ************************************************************************/

function handleEventNotification(event) {
    try {
        const view = event.target.value;
        if (view.byteLength < 1) {
            logMessage('Empty event');
            return;
        }

        const type = view.getUint8(0);

        switch (type) {
            case EVT_STATE: {
                if (view.byteLength < 5) {
                    logMessage('Short STATE event');
                    return;
                }
                const state = view.getUint32(1, false);
                const name = DEV_STATES[state];
                if (name === undefined) {
                    const kind = state >= DEV_STATE_ERR_BASE ? 'fault' : 'state';
                    logMessage(`STATE: unknown ${kind} 0x${state.toString(16)}`);
                } else if (state === DEV_STATE_ACK || state === DEV_STATE_ERROR) {
                    /* A reply to the last command, not a lifecycle change */
                    logMessage(name);
                } else {
                    logMessage(`STATE: ${name}`);
                }
                break;
            }

            case EVT_SENSOR: {
                if (view.byteLength < 2) {
                    logMessage('Short SENSOR event');
                    return;
                }
                const sensorType = view.getUint8(1);
                const sensor = SENSORS[sensorType];
                const dataLen = view.byteLength - 2;

                if (!sensor) {
                    logMessage(`SENSOR: unknown type 0x${sensorType.toString(16)}, ${dataLen} bytes`);
                    return;
                }

                if (sensor.fmt === 'ascii') {
                    const bytes = new Uint8Array(view.buffer, view.byteOffset + 2, dataLen);
                    const text = new TextDecoder().decode(bytes).replace(/\0+$/, '');
                    logMessage(`SENSOR ${sensor.name}: ${text}`);
                } else if (dataLen >= 4) {
                    const value = view.getInt32(2, false);
                    logMessage(`SENSOR ${sensor.name}: ${value} ${sensor.unit}`.trim());
                } else {
                    logMessage(`SENSOR ${sensor.name}: short payload, ${dataLen} bytes`);
                }
                break;
            }

            case EVT_DEBUG: {
                if (view.byteLength < 2) {
                    logMessage('Short DEBUG event');
                    return;
                }
                const len = view.getUint8(1);
                const avail = Math.min(len, view.byteLength - 2);
                const bytes = new Uint8Array(view.buffer, view.byteOffset + 2, avail);
                logMessage(new TextDecoder().decode(bytes));
                break;
            }

            default:
                logMessage(`Unknown event type 0x${type.toString(16)}, ${view.byteLength} bytes`);
                break;
        }
    } catch (error) {
        console.error('Error handling event:', error);
        logMessage('ERROR: Could not process event: ' + error.message);
    }
}

/************************************************************************
 *     COMMAND (0xCC32)
 ************************************************************************/

/**
 * Write a command. <data> is an optional argument tail -- a string is sent as
 * UTF-8, an ArrayBuffer or typed array as raw bytes.
 */
async function sendCommand(cmd, data, label) {
    if (!isConnected) {
        logMessage('Not connected to a device');
        return;
    }

    let tail = new Uint8Array(0);
    if (typeof data === 'string') {
        tail = new TextEncoder().encode(data);
    } else if (data instanceof ArrayBuffer) {
        tail = new Uint8Array(data);
    } else if (ArrayBuffer.isView(data)) {
        tail = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }

    const buffer = new Uint8Array(1 + tail.length);
    buffer[0] = cmd & 0xFF;
    buffer.set(tail, 1);

    try {
        logMessage(`Command ${label || cmd} (${cmd})` + (tail.length ? ` + ${tail.length} bytes` : '') + ' requested');
        await writeCharacteristic('COMMAND', buffer);
    } catch (error) {
        logMessage(`Failed command ${label || cmd}: ${error.message}`);
    }
}

async function rebootDevice() {
    if (!isConnected) {
        logMessage('Not connected to a device');
        return;
    }

    if (!confirm('Are you sure you want to reboot the device?')) {
        return;
    }

    try {
        logMessage('Rebooting device...');
        // Any write triggers the reboot
        await writeCharacteristic('REBOOT', new Uint8Array([1]));
        logMessage('Reboot command sent. Device will disconnect shortly.');
    } catch (error) {
        console.error('Error rebooting device:', error);
        logMessage(`Failed to reboot device: ${error.message}`);
    }
}

async function factoryResetDevice() {
    if (!isConnected) {
        logMessage('Not connected to a device');
        return;
    }

    if (!confirm('WARNING: This will reset the device to factory settings. All configuration will be lost! Are you sure you want to continue?')) {
        return;
    }

    try {
        logMessage('Performing factory reset...');
        // Any write triggers the reset
        await writeCharacteristic('RESET', new Uint8Array([1]));
        logMessage('Factory reset command sent.');
    } catch (error) {
        console.error('Error performing factory reset:', error);
        logMessage(`Failed to factory reset device: ${error.message}`);
    }
}

/************************************************************************
 *     Device logs -- LOG (0xCC35)
 *
 * Each read pops records:
 *   [0]    record bytes that follow
 *   [1..]  records
 *   last   always NUL
 * A read returning length 0 means the log is drained.
 ************************************************************************/

const LOG_RECORD_LEN = 10;      /* display grouping only */
const LOG_MAX_READS = 2000;     /* stop a runaway loop if the device never drains */

function printLogHex(bytes) {
    let hexStr = '';
    for (let i = 0; i < bytes.length; i++) {
        hexStr += bytes[i].toString(16).padStart(2, '0').toUpperCase();
        hexStr += ((i + 1) % LOG_RECORD_LEN === 0) ? '\n' : ' ';
    }
    if (bytes.length % LOG_RECORD_LEN !== 0) hexStr += '\n';
    logArea.value += hexStr;
    logArea.scrollTop = logArea.scrollHeight;
}

function clearDeviceLogOutput() {
    logArea.value = '';
}

/* A transfer can run for many reads. The stop button ends it early. */
let logTransferRunning = false;
let logTransferStop = false;

/** Ask a running log transfer to stop. */
function stopDeviceLogs() {
    if (!logTransferRunning) {
        return;
    }
    logTransferStop = true;
    logMessage('Stopping log transfer...');
}

/**
 * Read the device log until it drains, the read cap is reached, or the user
 * stops it.
 */
async function transferDeviceLogs() {
    if (logTransferRunning) {
        logMessage('Log transfer already running');
        return;
    }

    clearDeviceLogOutput();
    if (!isConnected || !deviceCharacteristics.LOG) {
        alert('Device not connected or LOG characteristic missing.');
        return;
    }

    logTransferRunning = true;
    logTransferStop = false;
    if (stopLogsBtn) stopLogsBtn.disabled = false;

    try {
        let reads = 0;
        let total = 0;

        while (reads++ < LOG_MAX_READS) {
            const value = await readCharacteristic('LOG');
            if (value.byteLength < 1) break;

            const len = value.getUint8(0);
            if (len === 0) break;      // drained

            const avail = Math.min(len, value.byteLength - 1);
            const rec = new Uint8Array(value.buffer, value.byteOffset + 1, avail);

            /* Firmware before the end-of-log fix returned a block of 0xFF
             * instead of length 0, and never drained. A record is a timestamp,
             * a code and a value, so an all-0xFF block is not a record. */
            if (rec.every(b => b === 0xFF)) {
                logMessage(`Log drained (end marker), ${total} bytes`);
                break;
            }

            printLogHex(rec);
            total += avail;

            /* Stopping here leaves the records already read on the device. The
             * device only drops a record when the read pops it, so a stopped
             * transfer loses nothing that was not already shown. */
            if (logTransferStop) {
                logMessage(`Log transfer stopped by user, ${total} bytes`);
                return;
            }

            // Short delay to avoid hammering BLE
            await new Promise(res => setTimeout(res, 100));
        }

        if (reads >= LOG_MAX_READS) {
            logMessage(`WARNING: log transfer stopped after ${LOG_MAX_READS} reads`);
        }
        logMessage(`Log transfer complete, ${total} bytes`);
    } catch (err) {
        alert('Error during log transfer: ' + err.message);
    } finally {
        /* Always release the buttons, including on an error or a disconnect. */
        logTransferRunning = false;
        logTransferStop = false;
        if (stopLogsBtn) stopLogsBtn.disabled = true;
    }
}

async function eraseDeviceLogs() {
    clearDeviceLogOutput();
    if (!isConnected) {
        alert('Device not connected.');
        return;
    }
    await sendCommand(CMD_CLEAR_LOG, null, 'Clear logs');
}

function saveDeviceLogsToFile() {
    if (!DeviceType) {
        logMessage('Please select a device variant first');
        return;
    }

    const logText = logArea.value;
    if (!logText.trim()) {
        alert('No logs to save.');
        return;
    }
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = DeviceType + '_device_logs.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

/***********************
 *    MCUMGR
 **********************/

const mcumgr = new MCUManager();

file = null;
fileData = null;
let images = [];

mcumgr.onMessage(({ op, group, id, data, length }) => {
    switch (group) {
        case MGMT_GROUP_ID_OS:
            switch (id) {
                case OS_MGMT_ID_ECHO:
                    alert(data.r);
                    break;
                case OS_MGMT_ID_TASKSTAT:
                    console.table(data.tasks);
                    break;
                case OS_MGMT_ID_MPSTAT:
                    console.log(data);
                    break;
            }
            break;
        case MGMT_GROUP_ID_IMAGE:
            switch (id) {
                case IMG_MGMT_ID_STATE:
                    console.log('[DEBUG] Image state response:', { op, group, id, data, length });

                    if (!data) {
                        console.error('[ERROR] No data received in image state response');
                        return;
                    }

                    if (!data.images) {
                        console.error('[ERROR] No images array in response data:', data);
                        return;
                    }

                    images = data.images;
                    let imagesHTML = '';

                    images?.forEach((image, index) => {
                        if (!image.hash) {
                            console.error(`[ERROR] Image ${index} has no hash:`, image);
                            return;
                        }

                        const hashStr = Array.from(image.hash).map(byte => byte.toString(16).padStart(2, '0')).join('');

                        imagesHTML += `<div class="image-slot">`;
                        imagesHTML += `<span><b>Slot #${image.slot}</b></span><br/>`;
                        imagesHTML += `<span>Version: v${image.version} .. Bootable: ${image.bootable} .. Confirmed: ${image.confirmed} .. Pending: ${image.pending} .. Hash: ${hashStr.substring(0, 8)}...</span>`;
                        imagesHTML += '</div>';
                    });
                    firmwareInfoDiv.innerHTML = imagesHTML;
                    break;
            }
            break;
        default:
            console.log('Unknown group');
            break;
    }
});

mcumgr.onImageUploadProgress(({ percentage, timeoutAdjusted, newTimeout }) => {
    let infoHTML = '<div>';

    if (timeoutAdjusted) {
        infoHTML += `Progress: ${percentage} %. Device is responding slowly, adjusting timeout to ${newTimeout}ms...`;
    } else {
        infoHTML += `Progress: ${percentage} %.`;
    }
    infoHTML += `</div>`;
    firmwareInfoDiv.innerHTML = infoHTML;
});

mcumgr.onImageUploadFinished(async () => {
    file = null;
    fileData = null;

    // Read new image state from device
    await mcumgr.cmdImageState();

    setTimeout( () => {
        // Immediately flag as pending
        if (images.length > 1 && images[1].pending === false) {
            mcumgr.cmdImageTest(images[1].hash);
        }
    }, 500);

    setTimeout( async () => {
        // Read new image state from device
        await mcumgr.cmdImageState();

        alert("Firmware upload complete! Reboot device to install new firmware.");
    }, 1000);

    firmwareUploadBtn.disabled = false;
});

mcumgr.onImageUploadCancelled(() => {
    console.log('Upload cancelled');
    firmwareUploadBtn.disabled = false;
});

mcumgr.onImageUploadError(({ error, errorCode, consecutiveTimeouts, totalTimeouts }) => {
    console.log("Upoad error", error);
    logMessage(`Firmware upload FAILED. ${error}`);

    let infoHTML = '<div>';
    infoHTML += `<span style="color: red">Firmware upload FAILED. ${error}</span>`;
    infoHTML += `</div>`;
    firmwareInfoDiv.innerHTML = infoHTML;

    firmwareUploadBtn.disabled = false;
});

async function uploadFirmwareImage(event) {
    firmwareUploadBtn.disabled = true;
    event.stopPropagation();
    if (file && fileData) {
        // Erase slot first
        await mcumgr.cmdImageErase();

        // Perform upload
        mcumgr.cmdUpload(fileData);
    }
};

async function readImageState()  {
    await mcumgr.cmdImageState();
};

async function eraseImage()  {
    await mcumgr.cmdImageErase();
};

async function testImage() {
    if (images.length > 1 && images[1].pending === false) {
        await mcumgr.cmdImageTest(images[1].hash);
    }
};

async function confirmImage() {
    if (images.length > 0 && images[0].confirmed === false) {
        await mcumgr.cmdImageConfirm(images[0].hash);
    }
};

function onFirmwareFileChanged() {
    if (!firmwareFile.files[0]) return;

    file = firmwareFile.files[0];
    fileData = null;

    const reader = new FileReader();
    reader.onload = async () => {
        fileData = reader.result;
        try {
            const info = await mcumgr.imageInfo(fileData);

            let infoHTML = '<div>';
            infoHTML += `<span class="detail-label">Version: v${info.version} .. Hash: ${info.hash.substring(0, 8)}... Image Size: ${info.imageSize.toLocaleString()} bytes</span>`;
            infoHTML += '</div>';

            firmwareInfoDiv.innerHTML = infoHTML;

            firmwareUploadBtn.disabled = !isConnected;  // Enable if connected
        } catch (e) {
            firmwareInfoDiv.innerHTML = `<span>ERROR: ${e.message}</span>`;
            firmwareUploadBtn.disabled = true;
        }
    };
    reader.readAsArrayBuffer(file);
}

/*******
 * UI components
 ****************/

function logMessage(message) {
    const timestamp = new Date().toTimeString().split(' ')[0];
    logContent.textContent += `[${timestamp}] ${message}\n`;
    logContent.scrollTop = logContent.scrollHeight;
}

function clearLog() {
    logContent.textContent = '';
}

function updateStatus(message, type = 'info') {
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = 'status-' + type;
    }
}

function updateConnectionUI(connected) {
    if (connectBtn) connectBtn.disabled = connected;
    if (disconnectBtn) disconnectBtn.disabled = !connected;
    if (readBtn) readBtn.disabled = !connected;
    if (writeBtn) writeBtn.disabled = !connected;

    // Global action buttons (per-type actions handled by renderCustomActions)
    if (rebootBtn) rebootBtn.disabled = !connected;
    if (factoryResetBtn) factoryResetBtn.disabled = !connected;

    if (statusRefreshBtn) statusRefreshBtn.disabled = !connected;

    if (transferLogsBtn) transferLogsBtn.disabled = !connected;
    if (stopLogsBtn) stopLogsBtn.disabled = !logTransferRunning;
    if (eraseLogsBtn) eraseLogsBtn.disabled = !connected;

    if (firmwareStateBtn) firmwareStateBtn.disabled = !connected;

    renderCustomActions();   // refresh per-type action buttons' enabled state
}

// Initialize UI when page loads
initDeviceTypeDropdown();

deviceTypeSelect.onchange = deviceTypeSelectUpdated;

const autoDetectCheckbox = document.getElementById('autoDetect');
autoDetectCheckbox.onchange = autoDetectUpdated;
autoDetectUpdated();   // apply initial enabled/disabled state

connectBtn.onclick = connectToDevice;
disconnectBtn.onclick = disconnectDevice;

readBtn.onclick = readAllDeviceParameters;
writeBtn.onclick = writeAllParameters;

rebootBtn.onclick = rebootDevice;
factoryResetBtn.onclick = factoryResetDevice;

statusRefreshBtn.onclick = refreshDeviceStatus;

comLogClearBtn.onclick = clearLog;

transferLogsBtn.onclick = transferDeviceLogs;
stopLogsBtn.onclick = stopDeviceLogs;
eraseLogsBtn.onclick = eraseDeviceLogs;
saveLogsBtn.onclick = saveDeviceLogsToFile;

firmwareStateBtn.onclick = readImageState;
firmwareUploadBtn.onclick = uploadFirmwareImage;
firmwareFile.onchange = onFirmwareFileChanged;

// Show Bluetooth Actions section if browser supports Bluetooth
if (!isBluetoothSupported()) {
    alert("Web Browser MUST support Bluetooth to continue");
}
