import React from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function InviteResultModal({ isOpen, onClose, results = [] }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Resultado de invitaciones</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 grid place-items-center"><XMarkIcon className="h-4 w-4 text-slate-500"/></button>
        </div>

        <div className="p-6 space-y-4">
          {results.length === 0 ? (
            <p className="text-sm text-slate-600">No se enviaron invitaciones.</p>
          ) : (
            <ul className="space-y-2">
              {results.map((r, i) => (
                <li key={r.email + '-' + i} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{r.email}</div>
                    <div className="text-xs text-slate-500">{r.ok ? 'Enviado' : 'Fallo'}</div>
                  </div>
                  <div className="text-right">
                    {r.ok ? <CheckCircleIcon className="h-5 w-5 text-green-600"/> : <ExclamationTriangleIcon className="h-5 w-5 text-amber-600"/>}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="pt-4">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#0A3D91] text-white">Continuar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
