
// DOM objects
const deviceTypeSelect = document.getElementById('deviceType');
const configForm = document.getElementById('configForm');
const statusElement = document.getElementById('bluetoothStatus');

const connectBtn = document.getElementById('bluetoothConnectBtn');
const disconnectBtn = document.getElementById('bluetoothDisconnectBtn');
const readBtn = document.getElementById('bluetoothReadBtn');
const writeBtn = document.getElementById('bluetoothWriteBtn');
const actionsContainer = document.getElementById('bluetoothActions');
const deviceActionsContainer = document.getElementById('deviceActionButtons');
const modemDiagnosticsContainer = document.getElementById('modemDiagnostics');

// Action buttons
const sendMessageBtn = document.getElementById('sendMessageBtn');
const readSensorBtn = document.getElementById('readSensorBtn');
const commissionBtn = document.getElementById('commissionBtn');
const decommissionBtn = document.getElementById('decommissionBtn');
const rebootBtn = document.getElementById('rebootBtn');
const factoryResetBtn = document.getElementById('factoryResetBtn');

// Modem diagnostic buttons
const diagWakeBtn = document.getElementById('diagWakeBtn');
const diagSleepBtn = document.getElementById('diagSleepBtn');
const diagCellBtn = document.getElementById('diagCellBtn');
const diagSimBtn = document.getElementById('diagSimBtn');
const diagGpsStartBtn = document.getElementById('diagGpsStartBtn');
const diagGpsStopBtn = document.getElementById('diagGpsStopBtn');
const diagGpsStatBtn = document.getElementById('diagGpsStatBtn');

const logArea = document.getElementById('deviceLogOutput');
const transferLogsBtn = document.getElementById('transferLogsBtn');
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


// Bluetooth UUIDs and characteristics
const SERVICE_UUID = "0000fe40-cc7a-482a-984a-7f2ed5b3e58b";
const DEVICE_INFO_SERVICE_UUID = "0000180a-0000-1000-8000-00805f9b34fb";
const FIRMWARE_REVISION_CHAR_UUID = "00002a26-0000-1000-8000-00805f9b34fb";
const CHARACTERISTIC_UUIDS = {
    SENSE_INT: "0000cc01-0000-1000-8000-00805f9b34fb",
    HB_INT: "0000cc02-0000-1000-8000-00805f9b34fb",
    GPS_INT: "0000cc03-0000-1000-8000-00805f9b34fb",
    MNO: "0000cc04-0000-1000-8000-00805f9b34fb",
    URL: "0000cc05-0000-1000-8000-00805f9b34fb",
    APN: "0000cc06-0000-1000-8000-00805f9b34fb",
    MISC: "0000cc08-0000-1000-8000-00805f9b34fb",
    COMMISSION: "0000cc0a-0000-1000-8000-00805f9b34fb",
    ACTION: "0000cc0b-0000-1000-8000-00805f9b34fb",
    MODEM_DEBUG: "0000cc20-0000-1000-8000-00805f9b34fb",
    FACTORY_RESET: "0000cc21-0000-1000-8000-00805f9b34fb",
    REBOOT: "0000cc22-0000-1000-8000-00805f9b34fb"
};

// Bluetooth variables
let bluetoothDevice = null;
let bluetoothServer = null;
let deviceService = null;
let deviceInfoService = null;
let firmwareCharacteristic = null;
let isConnected = false;
let deviceCharacteristics = {};

// Create a configuration object to store all parameters
let deviceConfig = {
    common: {},
    device: {}
};

// Common settings for all device variants
const commonParameters = {
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
    },
    apn: {
        type: "text",
        label: "APN",
        default: ""
    },
    mnoCarrier: {
        label: "MNO",
        type: "select",
        options: [
            { value: 0, display: "Global" },
            { value: 1, display: "Australia" },
            { value: 2, display: "Australia - Telstra" },
            { value: 3, display: "Australia - Optus" },
            { value: 4, display: "Australia - Vodafone" },
            { value: 5, display: "USA" },
            { value: 6, display: "USA - Verizon" },
            { value: 7, display: "USA - AT&T" },
            { value: 8, display: "USA - T-Mobile" }
        ],
        default: 0
    },
    mnoNbIot: {
        type: "boolean",
        label: "NB-IoT priority",
        default: false
    },
    mnoEuicc: {
        type: "boolean",
        label: "eUICC delay",
        default: false
    },
    transmitDelay: {
        type: "number",
        label: "Transmit Delay (minutes)",
        default: 0,
        min: 0,
        max: 255
    }
};

// Threshold settings for devices with thresholds
const thresholdSettings = {
    thresholdUpper: {
        type: "number",
        label: "Threshold Upper",
        default: 0,
        min: 0
    },
    thresholdLower: {
        type: "number",
        label: "Threshold Lower",
        default: 0,
        min: 0
    },
    thresholdHysteresis: {
        type: "number",
        label: "Threshold Hysteresis",
        default: 0,
        min: 0
    }
};

// Drop settings for devices with drop mode
const dropSettings = {
    dropMode: {
        type: "select",
        label: "Drop Mode",
        options: [
            { value: 0, display: "Disabled" },
            { value: 1, display: "Immediate" },
            { value: 2, display: "Constant" }
        ],
        default: 0
    },
    dropThreshold: {
        type: "number",
        label: "Drop Threshold",
        default: 0,
        min: 0
    },
    dropSamples: {
        type: "number",
        label: "Drop Samples",
        default: 0,
        min: 1,
        max: 10
    }
};

// Interval settings for devices with heartbeat and sensor intervals
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
        min: 1,
        max: 60
    }
};

// Special heartbeat interval settings for WS, WSRG, and RPC (using minutes)
const minuteHeartbeatInterval = {
    heartbeatInterval: {
        type: "number",
        label: "Heartbeat Interval (minutes)",
        default: 0,
        min: 5,
        max: 1440
    }
};

// Pulse event settings
const pulseEventSettings = {
    pulseEvent: {
        type: "boolean",
        label: "Pulse Event",
        default: false
    }
};

// Device configuration lookup table
const deviceConfigurations = {
    "WLM": {
        name: "Water Level Monitor",
        parameters: {
            ...commonParameters,
            ...intervalSettings,
            ...thresholdSettings,
            ...dropSettings
        }
    },
    "WPS": {
        name: "WPS Pressure",
        parameters: {
            ...commonParameters,
            ...intervalSettings,
            ...thresholdSettings,
            ...dropSettings
        }
    },
    "EFS": {
        name: "E-Fence",
        parameters: {
            ...commonParameters,
            ...intervalSettings,
            ...thresholdSettings,
            ...dropSettings
        }
    },
    "PC": {
        name: "People Counter",
        parameters: {
            ...commonParameters,
            ...intervalSettings,
            ...pulseEventSettings
        }
    },
    "GS": {
        name: "Gate Sensor",
        parameters: {
            ...commonParameters,
            heartbeatInterval: intervalSettings.heartbeatInterval,
            sensorInterval: {
                ...intervalSettings.sensorInterval,
                label: "Sensor Interval - Count Changed (seconds)"
            },
            ...pulseEventSettings
        }
    },
    "RG": {
        name: "Rain Gauge",
        parameters: {
            ...commonParameters,
            heartbeatInterval: intervalSettings.heartbeatInterval,
            sensorInterval: {
                ...intervalSettings.sensorInterval,
                label: "Sensor Interval - Count Changed (seconds)"
            },
            ...pulseEventSettings
        }
    },
    "MDS": {
        name: "MDS",
        parameters: {
            ...commonParameters,
            heartbeatInterval: minuteHeartbeatInterval.heartbeatInterval
        }
    },
    "WS": {
        name: "Weather Station",
        parameters: {
            ...commonParameters,
            heartbeatInterval: minuteHeartbeatInterval.heartbeatInterval
        }
    },
    "WSRG": {
        name: "Weather Station with Rain Gauge",
        parameters: {
            ...commonParameters,
            heartbeatInterval: minuteHeartbeatInterval.heartbeatInterval,
            ...pulseEventSettings
        }
    },
    "WR": {
        name: "Water Rat",
        parameters: {
            ...commonParameters,
            ...intervalSettings,
            gpsInterval: {
                type: "number",
                label: "GPS Interval (heart-beats)",
                default: 0,
                min: 0,
                max: 24
            },
            tiltAngle: {
                type: "number",
                label: "Tilt Angle (1/10th degrees)",
                default: 0,
                min: 0,
                max: 1800
            }
        }
    },
    "RPC": {
        name: "RPC",
        parameters: {
            ...commonParameters,
            heartbeatInterval: minuteHeartbeatInterval.heartbeatInterval
        }
    }
};

/* Global configuration storage resource */
let GlobalConfig = {};

/* Selected device type */
let DeviceType;

// Helper functions for configuration management

/**
 * Get all available device types
 * @returns {Object} Object with device IDs as keys and device names as values
 */
function getAvailableDeviceTypes() {
    const devices = {};
    for (const [id, config] of Object.entries(deviceConfigurations)) {
        devices[id] = config.name;
    }
    return devices;
}

/**
 * Determine device type from Bluetooth device name
 * @param {string} deviceName - Bluetooth device name
 * @returns {string|null} Device variant ID or null if not determined
 */
function getDeviceTypeFromBluetoothName(deviceName) {
    if (!deviceName) return null;
    
    // Normalize device name to uppercase for case-insensitive matching
    const normalizedName = deviceName.toUpperCase();
    
    // Map of Bluetooth name patterns to device types
    const namePatterns = [
        { pattern: /WLM/i, deviceType: 'WLM' },
        { pattern: /WPS/i, deviceType: 'WPS' },
        { pattern: /EFS/i, deviceType: 'EFS' },
        { pattern: /RPC/i, deviceType: 'RPC' },
        { pattern: /PC/i, deviceType: 'PC' },
        { pattern: /GS/i, deviceType: 'GS' },
        { pattern: /RG/i, deviceType: 'RG' },
        { pattern: /MDS/i, deviceType: 'MDS' },
        { pattern: /WS(?!R)/i, deviceType: 'WS' },  // Match WS but not WSRG
        { pattern: /WSR/i, deviceType: 'WSRG' },
        { pattern: /WR/i, deviceType: 'WR' },
    ];
    
    // Try to match name patterns
    for (const { pattern, deviceType } of namePatterns) {
        if (pattern.test(normalizedName)) {
            return deviceType;
        }
    }
    
    // If no match found, try to find exact ID in the name
    const deviceTypes = Object.keys(deviceConfigurations);
    for (const deviceType of deviceTypes) {
        if (normalizedName.includes(deviceType)) {
            return deviceType;
        }
    }
    
    return null;
}

/**
 * Check if a parameter exists for a device
 * @param {string} deviceId - Device ID
 * @param {string} paramKey - Parameter key
 * @returns {boolean} True if parameter exists
 */
function hasParameter(deviceId, paramKey) {
    const config = deviceConfigurations[deviceType] || null;
    if (!config) return false;
    return !!config.parameters[paramKey];
}

/**
 * Get all parameters for a specific device type
 * @param {string} deviceType - Device type
 * @returns {Object} Object with parameter keys and their definitions
 */
function getDeviceTypeParameters(deviceType) {
    const config = deviceConfigurations[deviceType] || null;
    if (!config) return {};
    return config.parameters;
}

// Utility functions for data validation and conversion

/**
 * Validate a value against parameter constraints
 * @param {any} value - Value to validate
 * @param {Object} paramDef - Parameter definition object
 * @returns {Object} Result object with isValid flag and error message
 */
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

/**
 * Convert a configuration to JSON format for saving or transmission
 * @param {string} deviceId - Device ID
 * @param {Object} config - Configuration object with common and device settings
 * @returns {string} JSON string representation
 */
function configToJSON(deviceId, config) {
    return JSON.stringify({
        deviceType: deviceId,
        commonSettings: config.common,
        deviceSettings: config.device,
        timestamp: new Date().toISOString()
    }, null, 2);
}

/**
 * Parse a JSON string into a configuration object
 * @param {string} jsonStr - JSON string
 * @returns {Object} Configuration object
 */
function parseConfigJSON(jsonStr) {
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse configuration JSON:", e);
        return null;
    }
}

function integer_be(value) {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint32(0, value, false);
    return buffer;
}

// UI interaction functions

/**
 * Initialize the device type dropdown
 */
function initDeviceTypeDropdown() {
    const devices = getAvailableDeviceTypes();
    
    // Clear existing options
    deviceTypeSelect.innerHTML = '<option value="">-- Select Device --</option>';
    
    // Add device options
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

    // Update UI
    deviceTypeSelect.value = newType;
}

/**
 * Callback when UI Device Type dropdown changed
 */
function deviceTypeSelectUpdated() {
    console.log("Device type select updated:", deviceTypeSelect.value);
    if (DeviceType != deviceTypeSelect.value)
    {
        DeviceType = deviceTypeSelect.value;
        renderConfigForm();
    }
}

/**
 * Render configuration form based on parameter definitions
 * @param {HTMLElement} container - Container element
 * @param {Object} parameters - Parameter definitions
 * @param {string} prefix - ID prefix for form elements
*/
function renderConfigForm() {
    let prefix = 'device';

    configForm.innerHTML = ``;

    if (!DeviceType) {
        configForm.classList.add('hidden');
        return;
    }
    else {
        configForm.classList.remove('hidden');
    }

    // Create a table for the configuration
    const table = document.createElement('table');
    table.className = 'config-table';
    
    // Table body
    const tbody = document.createElement('tbody');
    
    for (const [key, param] of Object.entries( getDeviceTypeParameters(DeviceType) )) {
        const row = document.createElement('tr');
        const fieldId = `${prefix}_${key}`;
        
        // Parameter label cell
        const labelCell = document.createElement('td');
        labelCell.textContent = param.label;
        row.appendChild(labelCell);
        
        // Parameter input cell
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
                
                if ('min' in param) {
                    input.min = param.min;
                }
                
                if ('max' in param) {
                    input.max = param.max;
                }
                
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
                        
                        // Handle both old format (simple value) and new format (object with value and display)
                        if (typeof option === 'object' && 'value' in option && 'display' in option) {
                            optionElement.value = option.value;
                            optionElement.textContent = option.display;
                            
                            if (param.default === option.value) {
                                optionElement.selected = true;
                            }
                        } else {
                            // Fallback for backwards compatibility with old format
                            optionElement.value = option;
                            optionElement.textContent = option;
                            
                            if (param.default === option) {
                                optionElement.selected = true;
                            }
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
}

/**
 * Update UI form elements from a configuration object
 */
function updateUIFromConfig() {
    let prefix = 'device';

    // Update all parameters in a single section
    const deviceParameters = getDeviceTypeParameters(DeviceType);

    for (const key of Object.keys(deviceParameters)) {
        const element = getElementById_ext(prefix, key);
        if (!element || !(key in GlobalConfig)) continue;
        if (deviceParameters[key].type === 'boolean') {
            element.checked = Boolean(GlobalConfig[key]);
        } else if (deviceParameters[key].type === 'number') {
            element.value = GlobalConfig[key];
        } else if (deviceParameters[key].type === 'select') {
            element.value = GlobalConfig[key];
        } else {
            element.value = GlobalConfig[key];
        }
    }
    logMessage('UI updated with device configuration');
}

/**
 * Collect form values and update global configuration object
 */
function updateConfigFromUI() {
    let prefix = 'device';

    // Collect all parameters in a single section
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
        }
        else {
            alert('Invalid: ' + deviceParameters[key].label + '. ' + res.message);
        }
    }
    return GlobalConfig;
}

/************************************************************************
 *     Bluetooth Functions
************************************************************************/

/**
 * Check if Bluetooth is supported by the browser
 * @returns {boolean} True if Bluetooth is supported
 */
function isBluetoothSupported() {
    return navigator.bluetooth !== undefined;
}

/**
 * Connect to a Bluetooth device
 * @returns {Promise} Promise that resolves when connected
 */
async function connectToDevice() {
    if (!isBluetoothSupported()) {
        updateStatus('Bluetooth not supported by your browser', 'error');
        return;
    }
    
    try {
        updateStatus('Requesting Bluetooth device...', 'info');
        
        bluetoothDevice = await navigator.bluetooth.requestDevice({
            // filters: [{ services: [SERVICE_UUID] }],
            acceptAllDevices: true,
            optionalServices: [
                'battery_service',
                'device_information',
                '8d53dc1d-1db7-4cd3-868b-8a527460aa84', // SMP
                SERVICE_UUID
            ]
        });
        
        updateStatus('Connecting to device...', 'info');
        bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);
        
        const server = await bluetoothDevice.gatt.connect();
        bluetoothServer = server;
        
        updateStatus('Getting primary services...', 'info');
        deviceService = await server.getPrimaryService(SERVICE_UUID);
        
        updateStatus('Getting characteristics...', 'info');
        await getCharacteristics();
        
        isConnected = true;
        updateStatus('Connected to ' + bluetoothDevice.name, 'success');
        updateConnectionUI(true);

        try {
            logMessage('Auto-reading parameters from device...');

            // Read all parameters into memory using combined function
            await readAllDeviceParameters();
            
        } catch (readError) {
            console.error('Error auto-reading parameters:', readError);
            logMessage('ERROR: Failed to auto-read parameters: ' + readError.message);
        }
        
        // Try to auto-select device type based on Bluetooth name
        const detectedDeviceType = getDeviceTypeFromBluetoothName(bluetoothDevice.name);
        if (detectedDeviceType) {
            logMessage(`Auto-detected device type: ${detectedDeviceType}`);

            updateDeviceTypeSelect(detectedDeviceType);

            // Update config display on UI
            renderConfigForm();

            // Update UI with the collected configuration
            updateUIFromConfig(deviceConfig, DeviceType);
        }

        // Attach MCUMGR service
        await mcumgr.connect(bluetoothDevice, bluetoothServer);

    } catch (error) {
        console.error('Bluetooth connection error:', error);
        updateStatus('Connection failed: ' + error.message, 'error');
        disconnectDevice();
        return false;
    }
    return true;
}

/**
 * Get all characteristics from the service
 * @returns {Promise} Promise that resolves when all characteristics are retrieved
 */
async function getCharacteristics() {
    try {
        // Try to get the device information service
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
                
                // Subscribe to notifications for the ACTION characteristic
                if (key === 'ACTION') {
                    await characteristic.startNotifications();
                    characteristic.addEventListener('characteristicvaluechanged', handleActionNotification);
                }
                // Subscribe to notifications for the MODEM_DEBUG characteristic
                if (key === 'MODEM_DEBUG') {
                    await characteristic.startNotifications();
                    characteristic.addEventListener('characteristicvaluechanged', handleModemDiagNotification);
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

/**
 * Disconnect from the Bluetooth device
 */
async function disconnectDevice() {
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
        // Unsubscribe from notifications if we were subscribed
        if (deviceCharacteristics.ACTION) {
            await deviceCharacteristics.ACTION.stopNotifications();
            deviceCharacteristics.ACTION.removeEventListener('characteristicvaluechanged', handleActionNotification);
            logMessage('Unsubscribed from ACTION notifications');
        }
        if (deviceCharacteristics.MODEM_DEBUG) {
            await deviceCharacteristics.MODEM_DEBUG.stopNotifications();
            deviceCharacteristics.MODEM_DEBUG.removeEventListener('characteristicvaluechanged', handleModemDiagNotification);
            logMessage('Unsubscribed from MODEM_DEBUG notifications');
        }

        bluetoothDevice.gatt.disconnect();
    }
    onDisconnected();
}

/**
 * Handle device disconnection
 */
function onDisconnected() {
    isConnected = false;
    deviceService = null;
    deviceInfoService = null;
    firmwareCharacteristic = null;
    deviceCharacteristics = {};
    updateStatus('Disconnected', 'warning');
    updateConnectionUI(false);
}

/**
 * Read a characteristic value
 * @param {string} characteristicKey - Key from CHARACTERISTIC_UUIDS
 * @returns {Promise} Promise that resolves with the value
 */
async function readCharacteristic(characteristicKey) {
    if (!isConnected || !deviceCharacteristics[characteristicKey]) {
        throw new Error(`Cannot read ${characteristicKey}: Not connected or characteristic not found`);
    }
    
    try {
        updateStatus(`Reading ${characteristicKey}...`, 'info');
        const value = await deviceCharacteristics[characteristicKey].readValue();
        updateStatus(`Read ${characteristicKey} successfully`, 'success');
        return value;
    } catch (error) {
        console.error(`Error reading ${characteristicKey}:`, error);
        updateStatus(`Failed to read ${characteristicKey}: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Write a value to a characteristic
 * @param {string} characteristicKey - Key from CHARACTERISTIC_UUIDS
 * @param {ArrayBuffer} value - Value to write
 * @returns {Promise} Promise that resolves when write is complete
 */
async function writeCharacteristic(characteristicKey, value) {
    if (!isConnected || !deviceCharacteristics[characteristicKey]) {
        throw new Error(`Cannot write to ${characteristicKey}: Not connected or characteristic not found`);
    }
    
    try {
        updateStatus(`Writing to ${characteristicKey}...`, 'info');
        await deviceCharacteristics[characteristicKey].writeValue(value);
        updateStatus(`Wrote to ${characteristicKey} successfully`, 'success');
        return true;
    } catch (error) {
        console.error(`Error writing to ${characteristicKey}:`, error);
        updateStatus(`Failed to write to ${characteristicKey}: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Convert device configuration to a MISC characteristic buffer
 * @returns {ArrayBuffer} Binary data for the MISC characteristic
 */
function configToMiscBuffer() {
    // Create an ArrayBuffer with 32 bytes (size of MISC characteristic)
    const buffer = new ArrayBuffer(32);
    const view = new DataView(buffer);
    
    // Example layout for MISC buffer - adjust based on your device's requirements
    // For example: threshold values, drop settings, etc.
    let offset = 0;
    
    view.setUint32(offset, GlobalConfig.tiltOffset);
    offset += 4;
    
    view.setUint32(offset, GlobalConfig.tiltAngle);
    offset += 4;
    
    view.setUint8(offset, GlobalConfig.transmitDelay);
    offset += 1;

    view.setUint16(offset, GlobalConfig.thresholdUpper, false);
    offset += 2;

    view.setUint16(offset, GlobalConfig.thresholdLower, false);
    offset += 2;

    view.setUint8(offset, GlobalConfig.pulseEvent ? 1 : 0);
    offset += 1;

    view.setUint16(offset, GlobalConfig.thresholdHysteresis, false);
    offset += 2;
    
    view.setUint8(offset, GlobalConfig.dropMode);
    offset += 1;

    view.setUint16(offset, GlobalConfig.dropThreshold, false);
    offset += 2;

    view.setUint8(offset, GlobalConfig.dropSamples);
    offset += 1;
    
    return buffer;
}

/**
 * Parse MISC characteristic buffer and directly update global config object
 * @param {ArrayBuffer} buffer - Binary data from MISC characteristic
 */
function miscBufferToConfig(buffer) {
    const view = new DataView(buffer);
    let offset = 0;
    GlobalConfig.tiltOffset = view.getUint32(offset, false);
    offset += 4;
    GlobalConfig.tiltAngle = view.getUint32(offset, false);
    offset += 4;
    GlobalConfig.transmitDelay = view.getUint8(offset);
    offset += 1;
    GlobalConfig.thresholdUpper = view.getUint16(offset, false);
    offset += 2;
    GlobalConfig.thresholdLower = view.getUint16(offset, false);
    offset += 2;
    GlobalConfig.pulseEvent = view.getUint8(offset) === 1;
    offset += 1;
    GlobalConfig.thresholdHysteresis = view.getUint16(offset, false);
    offset += 2;
    GlobalConfig.dropMode = view.getUint8(offset);
    offset += 1;
    GlobalConfig.dropThreshold = view.getUint16(offset, false);
    offset += 2;
    GlobalConfig.dropSamples = view.getUint8(offset);
}

/**
 * Read all device parameters into configuration object
 */
async function readAllDeviceParameters() {
    // Read firmware version from device-information service
    try {
        if (firmwareCharacteristic) {
            const firmwareValue = await firmwareCharacteristic.readValue();
            const firmwareString = new TextDecoder().decode(firmwareValue);
            GlobalConfig.firmwareVersion = firmwareString.trim();

            logMessage('Read Firmware Version: ' + firmwareString.trim());
        } else {
            console.warn('Firmware characteristic not available');
            logMessage('WARNING: Could not read Firmware Version - Service not available');
            GlobalConfig.firmwareVersion = 'Not Available';
        }
    } catch (error) {
        console.warn('Could not read Firmware Version:', error);
        logMessage('WARNING: Could not read Firmware Version: ' + error.message);
        GlobalConfig.firmwareVersion = 'Error Reading';
    }

    try {
        // Read commissioned state
        const commissionValue = await readCharacteristic('COMMISSION');
        const commissioned = new Uint8Array(commissionValue)[0] === 1;
        GlobalConfig.commissioned = commissioned;
        logMessage('Read Commissioned State: ' + (commissioned ? 'Commissioned' : 'Not Commissioned'));

        // Read APN
        const apnValue = await readCharacteristic('APN');
        const apnText = new TextDecoder().decode(apnValue);
        GlobalConfig.apn = apnText.trim();
        logMessage('Read APN: ' + apnText.trim());

        // Read MNO
        const mnoValue = await readCharacteristic('MNO');
        const mnoInt = mnoValue.getUint8();
        GlobalConfig.mnoCarrier = mnoInt & 0x0F;
        GlobalConfig.mnoNbIot = (mnoInt & 0x10) === 0x10;
        GlobalConfig.mnoEuicc = (mnoInt & 0x20) === 0x20;
        logMessage(`Read MNO: ${mnoInt} (Carrier: ${GlobalConfig.mnoCarrier}, NB-IoT: ${GlobalConfig.mnoNbIot}, eUICC: ${GlobalConfig.mnoEuicc})`);

        // Read heartbeat interval
        const hbValue = await readCharacteristic('HB_INT');
        GlobalConfig.heartbeatInterval = hbValue.getUint8();
        logMessage('Read Heartbeat Interval: ' + GlobalConfig.heartbeatInterval);

        // Read sensor interval
        const senseValue = await readCharacteristic('SENSE_INT');
        const senseInterval = new DataView(senseValue.buffer).getUint16(0, false);
        GlobalConfig.sensorInterval = senseInterval;
        logMessage('Read Sensor Interval: ' + senseInterval);

        // Read GPS interval for Water Rat
        const gpsValue = await readCharacteristic('GPS_INT');
        GlobalConfig.gpsInterval = gpsValue.getUint8();
        logMessage('Read GPS Interval: ' + GlobalConfig.gpsInterval);
    
    } catch (error) {
        console.warn('Could not read parameter:', error);
        logMessage('WARNING: Could not read parameter. ' + error.message);
    }

    // Read MISC characteristic for device-specific parameters
    try {
        const miscValue = await readCharacteristic('MISC');
        miscBufferToConfig(miscValue.buffer);

        logMessage(`Tilt Angle: ${GlobalConfig.tiltAngle}`);
        logMessage(`Pulse Event: ${GlobalConfig.pulseEvent}`);
        logMessage(`Threshold values - Upper: ${GlobalConfig.thresholdUpper}, Lower: ${GlobalConfig.thresholdLower}, Hysteresis: ${GlobalConfig.thresholdHysteresis}`);
        logMessage(`Drop settings - Mode: ${GlobalConfig.dropMode}, Threshold: ${GlobalConfig.dropThreshold}, Samples: ${GlobalConfig.dropSamples}`);
    } catch (error) {
        console.warn('Could not read MISC parameters:', error);
        logMessage('WARNING: Could not read MISC parameters');
    }

    // Update config display on UI
    renderConfigForm();
    
    updateUIFromConfig();
}

/**
 * Write all parameters to the device
 */
async function writeAllParameters() {
    if (!isConnected) {
        updateStatus('Not connected to a device', 'warning');
        return;
    }

    if (!DeviceType) {
        updateStatus('Please select a device variant first', 'warning');
        return;
    }
    
    try {
        logMessage('Starting parameter write to device...');

        updateConfigFromUI();
        console.log(GlobalConfig);
    
        // Write APN
        const apnText = GlobalConfig.apn || '';
        const apnBuffer = new TextEncoder().encode(apnText);
        await writeCharacteristic('APN', apnBuffer);
        logMessage('Wrote APN: ' + apnText);

        // Write MNO
        const carrier = GlobalConfig.mnoCarrier & 0x0F;
        const nbIot = GlobalConfig.mnoNbIot ? 0x10 : 0;
        const euicc = GlobalConfig.mnoEuicc ? 0x20 : 0;
        const mnoInt = carrier | nbIot | euicc;
        const mnoValue = new Uint8Array([mnoInt]);
        await writeCharacteristic('MNO', mnoValue);
        logMessage(`Wrote MNO: ${mnoInt} (Carrier: ${carrier}, NB-IoT: ${GlobalConfig.mnoNbIot}, eUICC: ${GlobalConfig.mnoEuicc})`);

        const hbInterval = GlobalConfig.heartbeatInterval || 0;
        const hbValue = new Uint8Array([hbInterval]);
        await writeCharacteristic('HB_INT', hbValue);
        logMessage('Wrote Heartbeat Interval: ' + hbInterval);

        const senseInterval = GlobalConfig.sensorInterval || 0;
        const buffer = new ArrayBuffer(2);
        const view = new DataView(buffer);
        view.setUint16(0, senseInterval, false);
        await writeCharacteristic('SENSE_INT', buffer);
        logMessage('Wrote Sensor Interval: ' + senseInterval);

        const gpsInterval = GlobalConfig.gpsInterval || 0;
        const gpsValue = new Uint8Array([gpsInterval]);
        await writeCharacteristic('GPS_INT', gpsValue);
        logMessage('Wrote GPS Interval: ' + gpsInterval);

        // Write to the MISC characteristic
        await writeCharacteristic('MISC', configToMiscBuffer());

        logMessage(`Wrote threshold values - Upper: ${GlobalConfig.thresholdUpper}, Lower: ${GlobalConfig.thresholdLower}, Hysteresis: ${GlobalConfig.thresholdHysteresis}`);
        logMessage(`Wrote drop settings - Mode: ${GlobalConfig.dropMode}, Threshold: ${GlobalConfig.dropThreshold}, Samples: ${GlobalConfig.dropSamples}`);
        logMessage(`Wrote Water Rat - Tilt Angle: ${GlobalConfig.tiltAngle}`);
        logMessage(`Wrote Pulse Event: ${GlobalConfig.pulseEvent}`);
        logMessage(`Wrote Trans delay: ${GlobalConfig.transmitDelay}`);
        logMessage('All parameters written successfully');
    } catch (error) {
        console.error('Error writing parameters:', error);
        logMessage('ERROR: ' + error.message);
    }
}

/**
 * Handle notifications from the ACTION characteristic
 * @param {Event} event - The notification event
 */
function handleActionNotification(event) {
    const NET_STATS_TEXT = [
        {str: "NET_STAT_OFFLINE", col: "black"},
        {str: "Starting...", col: "black"},
        {str: "Device fault", col: "red"},
        {str: "SIM card fault", col: "red"},
        {str: "Connecting...", col: "black"},
        {str: "Connected", col: "green"},
        {str: "Connection timeout", col: "red"},
        {str: "Message ok", col: "green"},
        {str: "Message faled", col: "red"},
        {str: "NET_STAT_CLOUD_AUTH", col: "black"},
        {str: "GPS searching...", col: "black"},
        {str: "GPS success", col: "green"},
        {str: "GPS timeout", col: "red"},
        {str: "GPS SNR OK", col: "green"},
        {str: "GPS SNR LOW", col: "red"},
        {str: "PROVISIONING", col: "red"},
        {str: "REBOOTING", col: "red"},
        {str: "ADXL Error", col: "red"},
    ];

    try {
        const value = event.target.value;
        let message = "";

        // Status code has high bit set
        let stats = value.getInt32(0);
        if (stats & 0x40000000) {
            stats = stats - 0x40000000;
            if (stats < NET_STATS_TEXT.length) {
                message = stats + " : " + NET_STATS_TEXT[stats].str;
                // message = "<span style='color: " + NET_STATS_TEXT[stats].col + "''>" + message + "</span>";
            }
        }
        else {
            message = "" + stats;
        }
        
        logMessage(message);
    } catch (error) {
        console.error('Error handling notification:', error);
        logMessage('ERROR: Could not process ACTION notification: ' + error.message);
    }
}

/**
 * Send an action command to the device
 * @param {string} action - The action to perform (SEND_MESSAGE, READ_SENSOR, COMMISSION, DECOMMISSION)
 */
async function performAction(action) {
    if (!isConnected) {
        updateStatus('Not connected to a device', 'warning');
        return;
    }
    
    try {
        let actionCode = 0;
        
        switch(action) {
            case 'SEND_MESSAGE':
                actionCode = 1;
                logMessage('Requesting to send message...');
                break;
            case 'READ_SENSOR':
                actionCode = 2;
                logMessage('Requesting sensor reading...');
                break;
            case 'COMMISSION':
                actionCode = 3;
                logMessage('Commissioning device...');
                break;
            case 'DECOMMISSION':
                actionCode = 4;
                logMessage('Decommissioning device...');
                break;
            default:
                throw new Error('Unknown action: ' + action);
        }
        
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setUint32(0, actionCode, false);

        await writeCharacteristic('ACTION', buffer);
        updateStatus(`Action ${action} requested`, 'success');
    } catch (error) {
        console.error(`Error performing action ${action}:`, error);
        updateStatus(`Failed to perform ${action}: ${error.message}`, 'error');
        logMessage(`ERROR: Failed to perform ${action}: ${error.message}`);
    }
}

/**
 * Reboot the device by writing to the REBOOT characteristic
 */
async function rebootDevice() {
    if (!isConnected) {
        updateStatus('Not connected to a device', 'warning');
        return;
    }
    
    if (!confirm('Are you sure you want to reboot the device?')) {
        return;
    }
    
    try {
        updateStatus('Rebooting device...', 'warning');
        
        // Value doesn't matter, just writing to the characteristic triggers the reboot
        const rebootValue = new Uint8Array([1]);
        await writeCharacteristic('REBOOT', rebootValue);
        
        updateStatus('Reboot command sent. Device will disconnect shortly.', 'success');
    } catch (error) {
        console.error('Error rebooting device:', error);
        updateStatus(`Failed to reboot device: ${error.message}`, 'error');
        logMessage(`ERROR: Failed to reboot device: ${error.message}`);
    }
}

/**
 * Factory reset the device by writing to the FACTORY_RESET characteristic
 */
async function factoryResetDevice() {
    if (!isConnected) {
        updateStatus('Not connected to a device', 'warning');
        return;
    }
    
    if (!confirm('WARNING: This will reset the device to factory settings. All configuration will be lost! Are you sure you want to continue?')) {
        return;
    }
    
    try {
        updateStatus('Performing factory reset...', 'warning');
        
        // Value doesn't matter, just writing to the characteristic triggers the reset
        const resetValue = new Uint8Array([1]);
        await writeCharacteristic('FACTORY_RESET', resetValue);
        
        updateStatus('Factory reset command sent.', 'success');
    } catch (error) {
        console.error('Error performing factory reset:', error);
        updateStatus(`Failed to factory reset device: ${error.message}`, 'error');
        logMessage(`ERROR: Failed to factory reset device: ${error.message}`);
    }
}

function handleModemDiagNotification(event) {
    let decoder = new TextDecoder('utf-8');
    logMessage(decoder.decode(event.target.value));
}

/**
 * Send a modem diagnostic command
 * @param {number} action - Diagnostic action code to send to the device
 */
async function sendModemDiagAction(action) {
    if (!isConnected) {
        updateStatus('Not connected to a device', 'warning');
        return;
    }
    
    try {
        const actionValue = new Uint8Array([action]);
        await writeCharacteristic('MODEM_DEBUG', actionValue);
        
        logMessage(`Sent modem diagnostic command: ${action}`);
    } catch (error) {
        console.error('Error sending modem diagnostic command:', error);
        updateStatus(`Failed to send modem diagnostic command: ${error.message}`, 'error');
        logMessage(`ERROR: Failed to send modem diagnostic command: ${error.message}`);
    }
}

/**
 * Debug logs
 */

// Utility to print hex bytes to log window
function printLogHex(buffer, length) {
    const arr = new Uint8Array(buffer);
    let hexStr = '';
    for (let i = 0; i < length && arr.length; i++) {
        hexStr += arr[i].toString(16).padStart(2, '0').toUpperCase();
        if ((i+1) % 16 === 0) hexStr += '\n';
    }
    logArea.value += hexStr + '\n';
    logArea.scrollTop = logArea.scrollHeight;
}

function clearDeviceLogOutput() {
    logArea.value = '';
}

// Transfer logs from device
async function transferDeviceLogs() {
    clearDeviceLogOutput();
    if (!isConnected || !deviceCharacteristics.ACTION || !deviceCharacteristics.MISC) {
        alert('Device not connected or required characteristics missing.');
        return;
    }
    try {
        // Write 100 to ACTION to start log transfer
        await writeCharacteristic('ACTION', integer_be(100));
        let finished = false;
        while (!finished) {
            // Read MISC characteristic
            const value = await readCharacteristic('MISC');
            const arr = new Uint8Array(value.buffer ? value.buffer : value);
            
            // Parse log response: <len> <msg: 10> <msg: 10> ...
            const totalLen = arr[0];
            let offset = 1;
            while (offset + 10 <= arr.length && offset < totalLen + 1) {
                let slc = arr.slice(offset, offset + 10);
                printLogHex(slc, 10);
                offset += 10;
                if (slc.every(b => b === 0xFF)) {
                    finished = true;
                }
            }

            // Add a short delay to avoid hammering BLE
            await new Promise(res => setTimeout(res, 100));
        }

        // Write 101 to ACTION to end log transfer
        await writeCharacteristic('ACTION', integer_be(101));
    } catch (err) {
        alert('Error during log transfer: ' + err.message);
    }
}

// Save device logs to a text file
function saveDeviceLogsToFile() {
    if (!DeviceType) {
        updateStatus('Please select a device variant first', 'warning');
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

                    console.log('[DEBUG] Images array:', data.images);
                    images = data.images;
                    let imagesHTML = '';

                    images?.forEach((image, index) => {
                        console.log(`[DEBUG] Processing image ${index}:`, image);

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

                    // console.log('[DEBUG] Setting button states...');
                    // testButton.disabled = !(data.images && data.images.length > 1 && data.images[1] && data.images[1].pending === false);
                    // confirmButton.disabled = !(data.images && data.images.length > 0 && data.images[0] && data.images[0].confirmed === false);
                    // console.log('[DEBUG] Button states set - test:', testButton.disabled, 'confirm:', confirmButton.disabled);
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
    // Upload was cancelled, form is already reset by cancel button
    // Just log for debugging
    console.log('Upload cancelled');

    firmwareUploadBtn.disabled = false;
});

mcumgr.onImageUploadError(({ error, errorCode, consecutiveTimeouts, totalTimeouts }) => {
    console.log("Upoad error", error);

    
    // For error code 2 (busy/bad state), provide specific guidance
    if (errorCode === 2) {
        // ..
    }
    
    let infoHTML = '<div>';
    infoHTML += `<span style="color: red">Firmware upload FAILED</span>`;
    infoHTML += `</div>`;
    firmwareInfoDiv.innerHTML = infoHTML;

    firmwareUploadBtn.disabled = false;
});


// mcumgr.disconnect();
// await mcumgr.smpEcho(message);
// await mcumgr.cmdReset();

async function uploadFirmwareImage(event) {
    firmwareUploadBtn.disabled = true;
    event.stopPropagation();
    if (file && fileData) {
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

/**
 * Add a message to the communication log
 * @param {string} message - Log message to add
 */
function logMessage(message) {
    const timestamp = new Date().toTimeString().split(' ')[0];
    logContent.textContent += `[${timestamp}] ${message}\n`;
    logContent.scrollTop = logContent.scrollHeight;
}

/**
 * Clear the communication log
 */
function clearLog() {
    logContent.textContent = '';
}

/**
 * Update status message in UI
 * @param {string} message - Status message
 * @param {string} type - Message type (info, success, error, warning)
 */
function updateStatus(message, type = 'info') {
    // Only update the status field with connected/disconnected state
    if (message.toLowerCase().includes('connect') || message.toLowerCase().includes('disconnect')) {
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = 'status-' + type;
        }
    }
    
    // Log all messages to the log output
    logMessage(`${type.toUpperCase()}: ${message}`);
    console.log(`BLE Status (${type}):`, message);
}


/**
 * Update UI based on connection state
 * @param {boolean} connected - Whether device is connected
 */
function updateConnectionUI(connected) {
    if (connectBtn) connectBtn.disabled = connected;
    if (disconnectBtn) disconnectBtn.disabled = !connected;
    if (readBtn) readBtn.disabled = !connected;
    if (writeBtn) writeBtn.disabled = !connected;
    
    // Enable/disable action buttons
    if (sendMessageBtn) sendMessageBtn.disabled = !connected;
    if (readSensorBtn) readSensorBtn.disabled = !connected;
    if (commissionBtn) commissionBtn.disabled = !connected;
    if (decommissionBtn) decommissionBtn.disabled = !connected;
    if (rebootBtn) rebootBtn.disabled = !connected;
    if (factoryResetBtn) factoryResetBtn.disabled = !connected;
    
    // Enable/disable modem diagnostic buttons
    if (diagWakeBtn) diagWakeBtn.disabled = !connected;
    if (diagSleepBtn) diagSleepBtn.disabled = !connected;
    if (diagCellBtn) diagCellBtn.disabled = !connected;
    if (diagSimBtn) diagSimBtn.disabled = !connected;
    if (diagGpsStartBtn) diagGpsStartBtn.disabled = !connected;
    if (diagGpsStopBtn) diagGpsStopBtn.disabled = !connected;
    if (diagGpsStatBtn) diagGpsStatBtn.disabled = !connected;

    if (transferLogsBtn) transferLogsBtn.disabled = !isConnected;

    if (firmwareStateBtn) firmwareStateBtn.disabled = !isConnected;
}

// Initialize UI when page loads
initDeviceTypeDropdown();

deviceTypeSelect.onchange = deviceTypeSelectUpdated;

connectBtn.onclick = connectToDevice;
disconnectBtn.onclick = disconnectDevice;

readBtn.onclick = readAllDeviceParameters;
writeBtn.onclick = writeAllParameters;

rebootBtn.onclick = rebootDevice;
factoryResetBtn.onclick = factoryResetDevice;

sendMessageBtn.onclick = function() { performAction('SEND_MESSAGE'); };
readSensorBtn.onclick = function() { performAction('READ_SENSOR'); };
commissionBtn.onclick = function() { performAction('COMMISSION'); };
decommissionBtn.onclick = function() { performAction('DECOMMISSION'); };

diagWakeBtn.onclick = function() { sendModemDiagAction(0); };
diagSleepBtn.onclick = function() { sendModemDiagAction(1); };
diagCellBtn.onclick = function() { sendModemDiagAction(2); };
diagSimBtn.onclick = function() { sendModemDiagAction(5); };
diagGpsStartBtn.onclick = function() { sendModemDiagAction(7); };
diagGpsStopBtn.onclick = function() { sendModemDiagAction(8); };
diagGpsStatBtn.onclick = function() { sendModemDiagAction(9); };

comLogClearBtn.onclick = clearLog;

transferLogsBtn.onclick = transferDeviceLogs;
saveLogsBtn.onclick = saveDeviceLogsToFile;

firmwareStateBtn.onclick = readImageState;
firmwareUploadBtn.onclick = uploadFirmwareImage;
firmwareFile.onchange = onFirmwareFileChanged;
// firmwareInfoDiv

// Show Bluetooth Actions section if browser supports Bluetooth
if (!isBluetoothSupported()) {
    alert("Web Browser MUST support Bluetooth to continue");
}
