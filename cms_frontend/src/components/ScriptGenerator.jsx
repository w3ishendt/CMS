import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { authService } from '../services/authService';
import { API_BASE_URL } from '../config/api';

const SCRIPT_GENERATOR_API_BASE_URL = `${API_BASE_URL}/script-generator`;

const sampleCsv = `site,device_name,ip,category,station_id
Office SIT Devices,Router 1,10.10.8.1,Router,
Office SIT Devices,PMS Server,10.10.8.200,PMS,
Office SIT Devices,Entry Camera,10.10.8.101,LPR,1
Office SIT Devices,Exit Camera,10.10.8.102,LPR,21
Mall Basement B1,Router B1,10.20.1.1,Router,
Mall Basement B1,LPR Entry B1,10.20.1.22,LPR,3`;

const ScriptGenerator = () => {
    const { isDarkMode } = useTheme();
    const [siteName, setSiteName] = useState('');
    const [googleIntegrationMode, setGoogleIntegrationMode] = useState('APPS_SCRIPT');
    const [googleAppScriptUrl, setGoogleAppScriptUrl] = useState('');
    const [googleAppScriptApiKey, setGoogleAppScriptApiKey] = useState('');
    const [googleCredentialsPath, setGoogleCredentialsPath] = useState('');
    const [googleSheetId, setGoogleSheetId] = useState('');
    const [googleWorksheetName, setGoogleWorksheetName] = useState('Sheet1');
    const [devices, setDevices] = useState([{ name: '', ip: '', category: '', stationId: '' }]);
    const [csvResult, setCsvResult] = useState(null);
    const [csvError, setCsvError] = useState('');
    const [uploadingCsv, setUploadingCsv] = useState(false);
    const [generatingKey, setGeneratingKey] = useState('');

    const panelClass = `rounded-lg shadow-xl p-4 sm:p-6 mb-4 sm:mb-6 backdrop-blur-sm border transition-colors duration-300 ${
        isDarkMode
            ? 'bg-gray-800/90 border-gray-700/40'
            : 'bg-white/90 border-white/40'
    }`;
    const mutedTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-600';
    const titleClass = isDarkMode ? 'text-gray-100' : 'text-gray-900';
    const labelClass = `block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`;
    const inputClass = `w-full p-3 border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 ${
        isDarkMode
            ? 'bg-gray-700/70 border-gray-600 text-white placeholder-gray-400'
            : 'bg-white/80 border-gray-300 text-gray-900 placeholder-gray-500'
    }`;

    const getAuthHeaders = async (extraHeaders = {}) => {
        const token = await authService.getValidToken();
        return token
            ? { ...extraHeaders, Authorization: `Bearer ${token}` }
            : extraHeaders;
    };

    const addDevice = () => {
        setDevices([...devices, { name: '', ip: '', category: '', stationId: '' }]);
    };

    const removeDevice = (index) => {
        setDevices(devices.filter((_, i) => i !== index));
    };

    const updateDevice = (index, field, value) => {
        setDevices(devices.map((device, i) =>
            i === index ? { ...device, [field]: value } : device
        ));
    };

    const loadSampleData = () => {
        setSiteName('Office SIT Devices');
        setGoogleIntegrationMode('APPS_SCRIPT');
        setGoogleAppScriptUrl('https://script.google.com/macros/s/your_app_script_deployment_id/exec');
        setGoogleAppScriptApiKey('your_nrt_api_key_here');
        setGoogleCredentialsPath('C:/monitoring/google-service-account.json');
        setGoogleSheetId('your_google_sheet_id_here');
        setGoogleWorksheetName('Sheet1');
        setDevices([
            { name: 'Router 1', ip: '10.10.8.1', category: 'GW', stationId: '' },
            { name: 'Entry Camera', ip: '10.10.8.101', category: 'LPR', stationId: '1' },
            { name: 'Exit Camera', ip: '10.10.8.102', category: 'LPR', stationId: '21' },
            { name: 'PMS Server', ip: '10.10.8.200', category: 'PMS', stationId: '' }
        ]);
    };

    const downloadBlob = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    const downloadSampleCsv = () => {
        const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8' });
        downloadBlob(blob, 'script_generator_sample.csv');
    };

    const safeFilename = (value) => {
        return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'site';
    };

    const generateScript = async (scriptData, key = 'manual') => {
        const validDevices = scriptData.devices.filter(d => d.name && d.ip && d.category);
        if (!scriptData.site || validDevices.length === 0) {
            setCsvError('Site and at least one complete device are required.');
            return;
        }

        setGeneratingKey(key);
        setCsvError('');

        try {
            const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
            const response = await fetch(`${SCRIPT_GENERATOR_API_BASE_URL}/generate`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ ...scriptData, devices: validDevices })
            });

            if (!response.ok) {
                throw new Error('Failed to generate script');
            }

            const blob = await response.blob();
            downloadBlob(blob, `${safeFilename(scriptData.site)}_monitoring_script.py`);
        } catch (error) {
            console.error('Error generating script:', error);
            setCsvError(error.message || 'Error generating script');
        } finally {
            setGeneratingKey('');
        }
    };

    const generateManualScript = () => {
        generateScript({
            site: siteName,
            devices,
            googleIntegrationMode,
            googleAppScriptUrl,
            googleAppScriptApiKey,
            googleCredentialsPath,
            googleSheetId,
            googleWorksheetName
        }, 'manual');
    };

    const handleCsvUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setUploadingCsv(true);
        setCsvResult(null);
        setCsvError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            const headers = await getAuthHeaders();
            const response = await fetch(`${SCRIPT_GENERATOR_API_BASE_URL}/upload-csv`, {
                method: 'POST',
                headers,
                body: formData
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to upload CSV');
            }

            setCsvResult(result);
            if (result.errors?.length) {
                setCsvError(`${result.errors.length} row(s) need attention before they can be used.`);
            }
        } catch (error) {
            console.error('Error uploading CSV:', error);
            setCsvError(error.message || 'Error uploading CSV');
        } finally {
            setUploadingCsv(false);
            event.target.value = '';
        }
    };

    const useCsvSiteInForm = (siteConfig) => {
        setSiteName(siteConfig.site);
        setDevices(siteConfig.devices);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const validManualDevices = devices.filter(d => d.name && d.ip && d.category);

    return (
        <div className={`min-h-screen transition-colors duration-300 ${
            isDarkMode
                ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800'
                : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
        }`}>
            <div className="max-w-6xl mx-auto p-4 sm:p-6">
                <div className="mb-6 sm:mb-8">
                    <h1 className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
                        isDarkMode ? 'from-gray-100 to-gray-300' : 'from-gray-800 to-gray-600'
                    }`}>
                        Python Script Generator
                    </h1>
                    <p className={`mt-2 text-sm sm:text-base ${mutedTextClass}`}>
                        Generate monitoring scripts from manual entries or a CSV device list.
                    </p>
                </div>

                <div className={panelClass}>
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div>
                            <h2 className={`text-lg sm:text-xl font-semibold ${titleClass}`}>CSV Upload</h2>
                            <p className={`text-sm mt-1 ${mutedTextClass}`}>Required columns: site, device_name, ip, category. Optional: station_id</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={downloadSampleCsv}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                    isDarkMode
                                        ? 'border-gray-600 text-gray-200 hover:bg-gray-700'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                Download Sample CSV
                            </button>
                            <label className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 cursor-pointer text-center">
                                {uploadingCsv ? 'Uploading...' : 'Upload CSV'}
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={handleCsvUpload}
                                    disabled={uploadingCsv}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    {csvError && (
                        <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                            isDarkMode
                                ? 'bg-red-950/40 border-red-800 text-red-200'
                                : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                            {csvError}
                        </div>
                    )}

                    {csvResult && (
                        <div className="mt-5 space-y-4">
                            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm ${mutedTextClass}`}>
                                <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-700/60' : 'bg-gray-50'}`}>
                                    <span className="block text-xs uppercase tracking-wide">Sites</span>
                                    <span className={`text-xl font-semibold ${titleClass}`}>{csvResult.sites?.length || 0}</span>
                                </div>
                                <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-700/60' : 'bg-gray-50'}`}>
                                    <span className="block text-xs uppercase tracking-wide">Valid Rows</span>
                                    <span className={`text-xl font-semibold ${titleClass}`}>{csvResult.validRows || 0}</span>
                                </div>
                                <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-700/60' : 'bg-gray-50'}`}>
                                    <span className="block text-xs uppercase tracking-wide">Skipped Rows</span>
                                    <span className={`text-xl font-semibold ${titleClass}`}>{csvResult.errors?.length || 0}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {csvResult.sites?.map((siteConfig) => {
                                    const key = `csv-${siteConfig.site}`;
                                    return (
                                        <div
                                            key={siteConfig.site}
                                            className={`rounded-lg border p-4 ${
                                                isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-white'
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                <div>
                                                    <h3 className={`font-semibold ${titleClass}`}>{siteConfig.site}</h3>
                                                    <p className={`text-sm ${mutedTextClass}`}>{siteConfig.devices.length} device(s)</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => useCsvSiteInForm(siteConfig)}
                                                        className={`px-3 py-2 rounded-md text-sm font-medium border ${
                                                            isDarkMode
                                                                ? 'border-gray-600 text-gray-200 hover:bg-gray-700'
                                                                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => generateScript({
                                                            ...siteConfig,
                                                            googleIntegrationMode,
                                                            googleAppScriptUrl,
                                                            googleAppScriptApiKey,
                                                            googleCredentialsPath,
                                                            googleSheetId,
                                                            googleWorksheetName
                                                        }, key)}
                                                        disabled={generatingKey === key}
                                                        className="px-3 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                                                    >
                                                        {generatingKey === key ? 'Generating...' : 'Generate'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {csvResult.errors?.length > 0 && (
                                <div className={`rounded-lg border p-4 ${
                                    isDarkMode ? 'border-amber-800 bg-amber-950/30' : 'border-amber-200 bg-amber-50'
                                }`}>
                                    <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-amber-100' : 'text-amber-900'}`}>Rows Not Imported</h3>
                                    <div className="max-h-40 overflow-auto space-y-1 text-sm">
                                        {csvResult.errors.map((error) => (
                                            <p key={`${error.row}-${error.message}`} className={isDarkMode ? 'text-amber-100' : 'text-amber-800'}>
                                                Row {error.row}: {error.message}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={panelClass}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                        <h2 className={`text-lg sm:text-xl font-semibold ${titleClass}`}>Manual Entry</h2>
                        <button
                            onClick={loadSampleData}
                            className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors"
                        >
                            Load Sample Data
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>
                                Site Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={siteName}
                                onChange={(event) => setSiteName(event.target.value)}
                                placeholder="e.g., Office SIT Devices"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Google Integration Mode</label>
                            <select
                                value={googleIntegrationMode}
                                onChange={(event) => setGoogleIntegrationMode(event.target.value)}
                                className={inputClass}
                            >
                                <option value="APPS_SCRIPT">Apps Script (API URL + API key)</option>
                                <option value="SERVICE_ACCOUNT">Service Account JSON (direct Google Sheets API)</option>
                            </select>
                        </div>
                        {googleIntegrationMode === 'APPS_SCRIPT' ? (
                            <>
                                <div>
                                    <label className={labelClass}>
                                        Apps Script API URL <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={googleAppScriptUrl}
                                        onChange={(event) => setGoogleAppScriptUrl(event.target.value)}
                                        placeholder="https://script.google.com/macros/s/.../exec"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Apps Script API Key</label>
                                    <input
                                        type="text"
                                        value={googleAppScriptApiKey}
                                        onChange={(event) => setGoogleAppScriptApiKey(event.target.value)}
                                        placeholder="e.g., dm_xxxxx"
                                        className={inputClass}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className={labelClass}>
                                        Google Credentials Path <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={googleCredentialsPath}
                                        onChange={(event) => setGoogleCredentialsPath(event.target.value)}
                                        placeholder="e.g., C:/monitoring/google-service-account.json"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        Google Sheet ID <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={googleSheetId}
                                        onChange={(event) => setGoogleSheetId(event.target.value)}
                                        placeholder="Paste Google Sheet ID"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Google Worksheet Name</label>
                                    <input
                                        type="text"
                                        value={googleWorksheetName}
                                        onChange={(event) => setGoogleWorksheetName(event.target.value)}
                                        placeholder="Default: Sheet1"
                                        className={inputClass}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className={panelClass}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                        <h2 className={`text-lg sm:text-xl font-semibold ${titleClass}`}>Device Configuration</h2>
                        <button
                            onClick={addDevice}
                            className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors"
                        >
                            + Add Device
                        </button>
                    </div>

                    <div className="space-y-4">
                        {devices.map((device, index) => (
                            <div key={index} className={`p-4 border rounded-lg ${
                                isDarkMode
                                    ? 'bg-gray-700/70 border-gray-600/50'
                                    : 'bg-gray-50/80 border-gray-200/70'
                            }`}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_160px_auto] gap-3 sm:gap-4">
                                    <div>
                                        <label className={labelClass}>Device Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={device.name}
                                            onChange={(event) => updateDevice(index, 'name', event.target.value)}
                                            placeholder="e.g., Router 1"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>IP Address <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={device.ip}
                                            onChange={(event) => updateDevice(index, 'ip', event.target.value)}
                                            placeholder="e.g., 10.10.8.1"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Category <span className="text-red-500">*</span></label>
                                        <select
                                            value={device.category}
                                            onChange={(event) => updateDevice(index, 'category', event.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="">Select Category</option>
                                            <option value="LPR">LPR</option>
                                            <option value="DMC">DMC</option>
                                            <option value="Vega">Vega</option>
                                            <option value="Intercom">Intercom</option>
                                            <option value="GW">Router / Gateway</option>
                                            <option value="PMS">PMS</option>
                                            <option value="UPT/U2K">UPT/U2K</option>
                                            <option value="S&B">S&amp;B</option>
                                            <option value="RFID">RFID</option>
                                            <option value="Reader">Reader</option>
                                            <option value="Others">Others</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Station ID</label>
                                        <input
                                            type="text"
                                            value={device.stationId || ''}
                                            onChange={(event) => updateDevice(index, 'stationId', event.target.value)}
                                            placeholder="e.g., 1"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        {devices.length > 1 && (
                                            <button
                                                onClick={() => removeDevice(index)}
                                                className={`w-full lg:w-auto px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                                                    isDarkMode
                                                        ? 'text-red-300 hover:bg-red-900/30'
                                                        : 'text-red-700 hover:bg-red-100'
                                                }`}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`${panelClass} mb-0`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className={`text-lg sm:text-xl font-semibold ${titleClass}`}>Generate Script</h2>
                            <p className={`text-xs sm:text-sm mt-1 ${mutedTextClass}`}>{validManualDevices.length} complete device(s) ready.</p>
                            <p className={`text-xs sm:text-sm mt-1 ${mutedTextClass}`}>
                                Generated script writes columns: site, category, deviceName, ip, status, duration, logTime, eventide, stationId.
                            </p>
                        </div>

                        <button
                            onClick={generateManualScript}
                            disabled={!siteName || validManualDevices.length === 0 || generatingKey === 'manual'}
                            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base transition-colors ${
                                !siteName || validManualDevices.length === 0 || generatingKey === 'manual'
                                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg'
                            }`}
                        >
                            {generatingKey === 'manual' ? 'Generating...' : 'Generate & Download Script'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScriptGenerator;
