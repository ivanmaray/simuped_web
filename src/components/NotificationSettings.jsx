// src/components/NotificationSettings.jsx
import React, { useState, useEffect } from 'react';
import {
  BellIcon,
  SpeakerWaveIcon as SpeakerIcon,
  DevicePhoneMobileIcon as PhoneIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import {
  getNotificationPreferences,
  setNotificationPreferences,
  requestNotificationPermission,
  testNotifications
} from '../utils/notificationService';

/**
 * Notification Settings Component
 * Allows users to configure their notification preferences
 */
export default function NotificationSettings({ onClose, className = "" }) {
  const [preferences, setPreferencesState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [testingNotifications, setTestingNotifications] = useState(false);

  useEffect(() => {
    loadPreferences();
    checkPermissionStatus();
  }, []);

  const loadPreferences = () => {
    const prefs = getNotificationPreferences();
    setPreferencesState(prefs);
    setLoading(false);
  };

  const checkPermissionStatus = () => {
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  };

  const handlePreferenceChange = (key, value) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferencesState(newPrefs);
  };

  const handleTypeChange = (type, enabled) => {
    const newTypes = { ...preferences.types, [type]: enabled };
    setPreferencesState({ ...preferences, types: newTypes });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setNotificationPreferences(preferences);
      // Show success message
      const event = new CustomEvent('notification-settings-saved', {
        detail: { preferences }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      const granted = await requestNotificationPermission();
      setPermissionGranted(granted);
      if (granted) {
        handlePreferenceChange('enabled', true);
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    }
  };

  const handleTestNotifications = async () => {
    setTestingNotifications(true);
    try {
      const result = await testNotifications();
      setPermissionGranted(result);
    } catch (error) {
      console.error('Error testing notifications:', error);
    } finally {
      setTestingNotifications(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-4/5"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!preferences) return null;

  const notificationTypes = [
    {
      key: 'SESSION_REMINDER',
      label: 'Recordatorios de sesiones',
      description: 'Notificaciones antes de sesiones programadas'
    },
    {
      key: 'BADGE_EARNED',
      label: 'Nuevos logros',
      description: 'Al obtener badges o certificaciones'
    },
    {
      key: 'FEEDBACK_AVAILABLE',
      label: 'Feedback disponible',
      description: 'Cuando esté listo el feedback de tus sesiones'
    },
    {
      key: 'SESSION_STARTING',
      label: 'Sesión iniciándose',
      description: 'Al comenzar una sesión programada'
    },
    {
      key: 'SESSION_CANCELLED',
      label: 'Sesiones canceladas',
      description: 'Si se cancela una sesión a la que estabas inscrito'
    },
    {
      key: 'ACTIVITY_REMINDER',
      label: 'Recordatorios de actividad',
      description: 'Si hace tiempo que no practicas'
    }
  ];

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-2">
          <BellIcon className="w-6 h-6 text-slate-600" />
          <h2 className="text-xl font-semibold text-slate-900">Preferencias de notificaciones</h2>
        </div>
        <p className="text-slate-600">
          Configura cuándo y cómo quieres recibir notificaciones de SimuPed.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Permission Status */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                permissionGranted ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <div>
                <h3 className="font-medium text-slate-900">
                  {permissionGranted ? 'Notificaciones permitidas' : 'Permiso requerido'}
                </h3>
                <p className="text-sm text-slate-600">
                  {permissionGranted
                    ? 'El navegador puede mostrar notificaciones'
                    : 'Haz clic para permitir notificaciones del navegador'
                  }
                </p>
              </div>
            </div>

            {!permissionGranted && (
              <button
                onClick={handleRequestPermission}
                className="px-4 py-2 bg-[#0A3D91] text-white text-sm rounded-lg hover:bg-[#0A3D91]/90 transition"
              >
                Permitir notificaciones
              </button>
            )}
          </div>

          {permissionGranted && (
            <div className="space-y-3">
              <button
                onClick={handleTestNotifications}
                disabled={testingNotifications}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
              >
                {testingNotifications ? 'Probando...' : 'Probar notificaciones push'}
              </button>

              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/send_session_reminder', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        email: 'test@example.com',
                        nombre: 'Usuario de Prueba',
                        sessionTitle: 'Prueba de Email desde SimuPed',
                        sessionDate: new Date().toISOString(),
                        reminderType: 'session_reminder',
                        minutesBefore: 60
                      })
                    });
                    const data = await response.json();
                    if (response.ok) {
                      alert('✅ Email enviado correctamente!\n\nRevisa test@example.com para ver el resultado.\n\nResend ID: ' + data.data?.id);
                    } else {
                      alert('❌ Error al enviar email:\n\n' + JSON.stringify(data, null, 2));
                    }
                  } catch (error) {
                    alert('❌ Error de conexión:\n\n' + error.message);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition"
              >
                📧 Probar Email
              </button>
            </div>
          )}
        </div>

        {/* Master Switch */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-slate-900">Notificaciones activadas</h3>
            <p className="text-sm text-slate-600">Activar o desactivar todas las notificaciones</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={preferences.enabled}
              onChange={(e) => handlePreferenceChange('enabled', e.target.checked)}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Notification Types */}
        <div>
          <h3 className="font-medium text-slate-900 mb-4">Tipos de notificación</h3>
          <div className="space-y-4">
            {notificationTypes.map((type) => (
              <div key={type.key} className="flex items-start justify-between gap-4 p-4 border border-slate-200 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">{type.label}</h4>
                  <p className="text-sm text-slate-600">{type.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.types[type.key] && preferences.enabled}
                    disabled={!preferences.enabled}
                    onChange={(e) => handleTypeChange(type.key, e.target.checked)}
                  />
                  <div className={`w-11 h-6 ${
                    preferences.enabled ? 'bg-slate-200 peer-focus:ring-4 peer-focus:ring-blue-300' : 'bg-slate-100'
                  } peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${
                    !preferences.enabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Settings */}
        <div>
          <h3 className="font-medium text-slate-900 mb-4">Configuración avanzada</h3>

          <div className="space-y-4">
            {/* Advance Warning Times */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Anticipación recordatorios de sesión
              </label>
              <select
                value={preferences.advanceWarning?.SESSION_REMINDER || 60}
                onChange={(e) => handlePreferenceChange('advanceWarning', {
                  ...preferences.advanceWarning,
                  SESSION_REMINDER: parseInt(e.target.value)
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!preferences.enabled}
              >
                <option value={15}>15 minutos antes</option>
                <option value={30}>30 minutos antes</option>
                <option value={60}>1 hora antes</option>
                <option value={120}>2 horas antes</option>
                <option value={1440}>1 día antes</option>
              </select>
            </div>

            {/* Session Starting Warning */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Anticipación aviso inicio de sesión
              </label>
              <select
                value={preferences.advanceWarning?.SESSION_STARTING || 15}
                onChange={(e) => handlePreferenceChange('advanceWarning', {
                  ...preferences.advanceWarning,
                  SESSION_STARTING: parseInt(e.target.value)
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!preferences.enabled}
              >
                <option value={5}>5 minutos antes</option>
                <option value={10}>10 minutos antes</option>
                <option value={15}>15 minutos antes</option>
                <option value={30}>30 minutos antes</option>
              </select>
            </div>

            {/* Sound and Vibration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-slate-900">Sonido activado</h4>
                  <p className="text-xs text-slate-600">Reproducir sonidos con las notificaciones</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.soundEnabled && preferences.enabled}
                    disabled={!preferences.enabled}
                    onChange={(e) => handlePreferenceChange('soundEnabled', e.target.checked)}
                  />
                  <div className={`w-11 h-6 ${
                    preferences.enabled ? 'bg-slate-200 peer-focus:ring-4 peer-focus:ring-blue-300' : 'bg-slate-100'
                  } peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${
                    !preferences.enabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-slate-900">Vibración activada</h4>
                  <p className="text-xs text-slate-600">Vibrar dispositivo en notificaciones de sesión</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.vibrationEnabled && preferences.enabled}
                    disabled={!preferences.enabled}
                    onChange={(e) => handlePreferenceChange('vibrationEnabled', e.target.checked)}
                  />
                  <div className={`w-11 h-6 ${
                    preferences.enabled ? 'bg-slate-200 peer-focus:ring-4 peer-focus:ring-blue-300' : 'bg-slate-100'
                  } peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${
                    !preferences.enabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
        <p className="text-sm text-slate-600">
          Los cambios se guardan automáticamente
        </p>
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#0A3D91] text-white rounded-lg hover:bg-[#0A3D91]/90 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Guardando...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                Guardar cambios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
