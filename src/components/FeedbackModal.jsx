import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  StarIcon,
  XMarkIcon,
  HeartIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

// Professional feedback modal for post-simulation ratings
export default function FeedbackModal({ isOpen, onClose, scenarioId, scenarioTitle, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedAspects, setSelectedAspects] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setRating(0);
      setHoverRating(0);
      setFeedbackText('');
      setSelectedAspects([]);
      setSubmitted(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Por favor, califica tu experiencia con el escenario');
      return;
    }

    setIsSubmitting(true);
    try {
      const feedbackData = {
        scenario_id: scenarioId,
        rating: rating,
        feedback_text: feedbackText.trim(),
        aspects: selectedAspects,
        submitted_at: new Date().toISOString()
      };

      // TODO: Save to Supabase when feedback table is created
      // const { error } = await supabase.from('scenario_feedback').insert([feedbackData]);

      // For now, just log and call onSubmit callback
      console.log('Feedback submitted:', feedbackData);

      if (onSubmit) {
        onSubmit(feedbackData);
      }

      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error al enviar feedback. Por favor, inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedbackAspects = [
    { id: 'realismo', label: 'Realismo clínico', description: 'La simulación refleja situaciones reales' },
    { id: 'dificultad', label: 'Nivel de dificultad', description: 'Adecuado para tu nivel de experiencia' },
    { id: 'interactividad', label: 'Interactividad', description: 'Decisiones y opciones disponibles' },
    { id: 'retroalimentacion', label: 'Retroalimentación', description: 'Claridad de las explicaciones' },
    { id: 'aprendizaje', label: 'Valor educativo', description: 'Ayuda a mejorar competencias' },
    { id: 'interfaz', label: 'Interfaz de usuario', description: 'Fácil de usar y navegar' }
  ];

  const toggleAspect = (aspectId) => {
    setSelectedAspects(prev =>
      prev.includes(aspectId)
        ? prev.filter(id => id !== aspectId)
        : [...prev, aspectId]
    );
  };

  const getRatingLabel = (rating) => {
    const labels = {
      1: 'Muy insatisfactorio',
      2: 'Insatisfactorio',
      3: 'Regular',
      4: 'Satisfactorio',
      5: 'Excelente'
    };
    return labels[rating] || '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <HeartIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Feedback del escenario</h2>
              <p className="text-sm text-slate-600">{scenarioTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <XMarkIcon className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!submitted ? (
            <>
              {/* Rating Section */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    ¿Cómo valoras tu experiencia?
                  </h3>
                  <p className="text-sm text-slate-600">
                    Tu opinión nos ayuda a mejorar la plataforma
                  </p>
                </div>

                {/* Star Rating */}
                <div className="flex justify-center">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="h-10 w-10 flex items-center justify-center"
                      >
                        <StarSolid
                          className={`h-8 w-8 ${
                            (hoverRating || rating) >= star
                              ? 'text-yellow-400 fill-current'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {rating > 0 && (
                  <p className="text-center text-sm font-medium text-slate-700">
                    {rating} estrella{rating !== 1 ? 's' : ''} - {getRatingLabel(rating)}
                  </p>
                )}
              </div>

              {/* Aspects Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-medium text-slate-900 mb-3">
                    Aspectos destacados
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    ¿Qué aspectos del escenario te parecieron especialmente buenos?
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {feedbackAspects.map((aspect) => (
                    <button
                      key={aspect.id}
                      type="button"
                      onClick={() => toggleAspect(aspect.id)}
                      className={`p-3 rounded-lg border transition-colors text-left ${
                        selectedAspects.includes(aspect.id)
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircleIcon
                          className={`h-5 w-5 ${
                            selectedAspects.includes(aspect.id)
                              ? 'text-blue-600'
                              : 'text-slate-400'
                          }`}
                        />
                        <div>
                          <span className="font-medium text-slate-900">{aspect.label}</span>
                          <p className="text-xs text-slate-600 mt-0.5">{aspect.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Feedback */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-medium text-slate-900">
                    Comentarios adicionales
                  </h3>
                  <p className="text-sm text-slate-600">
                    ¿Tienes alguna sugerencia para mejorar este escenario?
                  </p>
                </div>

                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Comparte tus ideas, dificultades encontradas o aspectos que te gustaría destacar..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />

                <p className="text-xs text-slate-500">
                  {feedbackText.length}/500 caracteres
                </p>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                ¡Gracias por tu feedback!
              </h3>
              <p className="text-slate-600">
                Tu opinión nos ayuda a mejorar la experiencia de simulación
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="border-t border-slate-200 px-6 py-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
            >
              Omitir
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar feedback'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Quick Rating Component for Inline Feedback
export function QuickRating({ onRate, scenarioId }) {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (rating) => {
    // TODO: Save quick rating to Supabase
    console.log('Quick rating:', { scenarioId, rating });
    setSubmitted(true);
    setTimeout(() => {
      if (onRate) onRate(rating);
    }, 1000);
  };

  if (submitted) {
    return (
      <div className="text-center py-2">
        <p className="text-xs text-slate-600">¡Gracias por tu valoración!</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-700">¿Cómo fue la experiencia?</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleSubmit(star)}
            className="text-slate-300 hover:text-yellow-400 transition-colors"
          >
            <StarSolid className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
