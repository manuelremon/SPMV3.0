import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, Loader2, AlertCircle, Bell, Mic, MicOff, Volume2, VolumeX } from './ui/Icons'
import { useVertexStore, selectFormattedMessages } from '../store/vertexStore'
import { useAuthStore } from '../store/authStore'
import vertexService, { sendVertexMessage, loadVertexAlerts, initializeVertex } from '../services/vertex'
import api from '../services/api'

/**
 * Componente ChatAssistant - Vertex IA
 *
 * Chat flotante con personalidad argentina que usa Gemini para generar respuestas.
 * Incluye:
 * - Memoria persistente entre sesiones
 * - Alertas proactivas
 * - Sugerencias contextuales
 * - Voz: Text-to-Speech y Speech-to-Text
 */
export default function ChatAssistant() {
  const messagesEndRef = useRef(null)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef(null)

  // Voice state
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [micPermissionDenied, setMicPermissionDenied] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState(null)
  const recognitionRef = useRef(null)
  const synthesisRef = useRef(null)
  const audioRef = useRef(null)  // Para audio de Google Cloud TTS

  // Vertex store
  const store = useVertexStore()
  const {
    messages,
    isOpen,
    isLoading,
    isTyping,
    error,
    pendingAlerts,
    suggestions,
    greeting,
    closeChat,
    addUserMessage,
    addAssistantMessage,
    setLoading,
    setTyping,
    setError,
    clearError,
    setSessionId,
    setSuggestions,
    pageContext,
    sessionId,
    getUnshownAlertsCount,
  } = store

  const { user } = useAuthStore()

  // Formatear mensajes para UI
  const formattedMessages = selectFormattedMessages(store)

  // Buscar la mejor voz espanola femenina con acento ARGENTINO
  // Prioridad: Argentina > Rioplatense > LATAM > Espana
  const findBestVoice = useCallback(() => {
    if (!synthesisRef.current) return null

    const voices = synthesisRef.current.getVoices()
    if (!voices.length) return null

    // Filtrar voces en espanol
    const spanishVoices = voices.filter(v => v.lang.startsWith('es'))

    // Orden de prioridad: ARGENTINA primero, luego otras LATAM
    // Buscamos voz femenina con tonada argentina/rioplatense
    const voicePreferences = [
      // ARGENTINA - Maxima prioridad
      { match: (v) => v.name.includes('Elena') && v.lang === 'es-AR', name: 'Elena Argentina' },
      { match: (v) => v.lang === 'es-AR' && v.name.includes('Female'), name: 'Female Argentina' },
      { match: (v) => v.lang === 'es-AR', name: 'es-AR any' },
      { match: (v) => v.name.includes('Microsoft') && v.name.includes('Elena'), name: 'Microsoft Elena' },

      // Google voces argentinas (neural, excelente calidad)
      { match: (v) => v.name.includes('Google') && v.lang === 'es-AR', name: 'Google Argentina' },

      // Uruguay (acento similar al argentino)
      { match: (v) => v.lang === 'es-UY', name: 'es-UY Uruguay' },

      // LATAM generico (puede tener buen acento)
      { match: (v) => v.name.includes('Google') && v.lang === 'es-419', name: 'Google LATAM' },
      { match: (v) => v.lang === 'es-419', name: 'es-419 LATAM' },

      // Colombia (acento neutro, agradable)
      { match: (v) => v.name.includes('Salome') || v.name.includes('Salomé'), name: 'Salome Colombia' },
      { match: (v) => v.lang === 'es-CO', name: 'es-CO Colombia' },

      // Mexico (muy claro, buena alternativa)
      { match: (v) => v.name.toLowerCase().includes('sabina'), name: 'Sabina Mexico' },
      { match: (v) => v.name.includes('Dalia'), name: 'Dalia Mexico' },
      { match: (v) => v.lang === 'es-MX', name: 'es-MX Mexico' },

      // Venezuela, Chile, Peru
      { match: (v) => v.name.includes('Paola') && v.lang.startsWith('es'), name: 'Paola Venezuela' },
      { match: (v) => v.lang === 'es-VE', name: 'es-VE Venezuela' },
      { match: (v) => v.lang === 'es-CL', name: 'es-CL Chile' },
      { match: (v) => v.lang === 'es-PE', name: 'es-PE Peru' },

      // US Spanish (puede ser neutro)
      { match: (v) => v.name.includes('Google') && v.lang === 'es-US', name: 'Google US Spanish' },
      { match: (v) => v.lang === 'es-US', name: 'es-US' },

      // Microsoft Online (neural, buena calidad)
      { match: (v) => v.name.includes('Microsoft') && v.name.includes('Online') && v.lang.startsWith('es'), name: 'Microsoft Online' },

      // Apple voices (macOS/iOS)
      { match: (v) => v.name.toLowerCase().includes('paulina'), name: 'Paulina Mexico' },

      // Cualquier voz Google en espanol
      { match: (v) => v.name.includes('Google') && v.lang.startsWith('es'), name: 'Google Spanish' },

      // Voz femenina espanola
      { match: (v) => v.lang.startsWith('es') && v.name.toLowerCase().includes('female'), name: 'Female Spanish' },

      // Espana (ultimo recurso, acento diferente)
      { match: (v) => v.name.toLowerCase().includes('monica') || v.name.toLowerCase().includes('mónica'), name: 'Monica Spain' },
      { match: (v) => v.lang === 'es-ES', name: 'es-ES Spain' },

      // Fallback: cualquier voz en espanol
      { match: (v) => v.lang.startsWith('es'), name: 'Spanish fallback' },
    ]

    for (const pref of voicePreferences) {
      const voice = voices.find(pref.match)
      if (voice) {
        return voice
      }
    }

    return voices[0]
  }, [])

  // Initialize Speech Recognition
  useEffect(() => {
    // Check for speech synthesis support
    if ('speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis

      // Load voices (may be async)
      const loadVoices = () => {
        const voice = findBestVoice()
        if (voice) setSelectedVoice(voice)
      }

      // Some browsers load voices async
      if (synthesisRef.current.getVoices().length) {
        loadVoices()
      }
      synthesisRef.current.onvoiceschanged = loadVoices
    }

    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setSpeechSupported(true)
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'es-AR' // Argentinian Spanish

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('')

        setInputValue(transcript)

        // If final result, send message
        if (event.results[0].isFinal) {
          setIsListening(false)
        }
      }

      recognition.onerror = (event) => {
        // Only log non-permission errors once
        if (event.error !== 'not-allowed' && event.error !== 'aborted') {
          console.error('Speech recognition error:', event.error)
        }
        setIsListening(false)
        if (event.error === 'not-allowed') {
          setMicPermissionDenied(true)
          // Don't spam the error - only show once
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel()
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  /**
   * Fallback: hablar usando Web Speech API del navegador
   * Se usa cuando Google Cloud TTS no esta disponible
   */
  const fallbackSpeak = useCallback((text) => {
    if (!synthesisRef.current || !text) return

    const utterance = new SpeechSynthesisUtterance(text)

    if (selectedVoice) {
      utterance.voice = selectedVoice
      utterance.lang = selectedVoice.lang
    } else {
      utterance.lang = 'es-AR'
    }

    // Parametros optimizados para Web Speech API
    const isNeuralVoice = selectedVoice?.name?.includes('Online') ||
                          selectedVoice?.name?.includes('Google') ||
                          selectedVoice?.name?.includes('Neural')

    if (isNeuralVoice) {
      utterance.rate = 1.12
      utterance.pitch = 1.08
    } else {
      utterance.rate = 1.1
      utterance.pitch = 1.08
    }

    utterance.volume = 1.0
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    synthesisRef.current.speak(utterance)
  }, [selectedVoice])

  /**
   * Speak text using Google Cloud TTS Neural voices
   * Falls back to Web Speech API if TTS service is unavailable
   */
  const speak = useCallback(async (text) => {
    if (!voiceEnabled || !text) return

    // Cancel any ongoing audio/speech
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (synthesisRef.current) {
      synthesisRef.current.cancel()
    }

    // Clean text for better TTS (remove markdown, extra spaces)
    const cleanText = text
      .replace(/\*\*/g, '')  // Remove bold markdown
      .replace(/\*/g, '')    // Remove italic markdown
      .replace(/`/g, '')     // Remove code backticks
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\n+/g, '. ') // Replace newlines with pauses
      .replace(/\s+/g, ' ')  // Normalize spaces
      .trim()

    if (!cleanText) return

    setIsSpeaking(true)

    try {
      // Llamar al endpoint de Google Cloud TTS
      const response = await api.post('/vertex/tts', { text: cleanText }, {
        responseType: 'blob',
        timeout: 10000, // 10 segundos timeout
      })

      // Crear audio desde blob
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(audioBlob)

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
      }

      audio.onerror = (e) => {
        console.warn('Audio playback error:', e)
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
      }

      await audio.play()

    } catch (err) {
      // Si falla Google Cloud TTS, usar Web Speech API como fallback
      console.warn('Google TTS error, using fallback:', err.message || err)
      setIsSpeaking(false)

      // Solo usar fallback si hay soporte de sintesis
      if (synthesisRef.current) {
        fallbackSpeak(cleanText)
      }
    }
  }, [voiceEnabled, fallbackSpeak])

  /**
   * Toggle voice input (microphone)
   */
  const toggleListening = () => {
    if (!recognitionRef.current) return

    // Don't try if permission was denied
    if (micPermissionDenied) {
      setError('Permiso de microfono denegado. Habilitalo en la configuracion del navegador.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setInputValue('')
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        // Recognition already started or other error
        if (err.name !== 'InvalidStateError') {
          console.error('Failed to start recognition:', err)
        }
      }
    }
  }

  /**
   * Toggle voice output (speaker)
   */
  const toggleVoice = () => {
    if (isSpeaking) {
      // Parar Google Cloud TTS audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      // Parar Web Speech API
      if (synthesisRef.current) {
        synthesisRef.current.cancel()
      }
      setIsSpeaking(false)
    }
    setVoiceEnabled(!voiceEnabled)
  }

  // Speak new assistant messages
  useEffect(() => {
    if (messages.length > 0 && voiceEnabled) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant') {
        // Small delay to ensure UI updates first
        setTimeout(() => speak(lastMessage.content), 100)
      }
    }
  }, [messages, voiceEnabled, speak])

  // Inicializar al abrir
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const context = {
        page: pageContext?.page || 'default',
        userId: user?.id,
        centro: user?.centro,
      }
      initializeVertex(store, context)
      loadVertexAlerts(store)
    }
  }, [isOpen])

  // Cargar alertas periodicamente
  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      loadVertexAlerts(store)
    }, 5 * 60 * 1000) // Cada 5 minutos

    return () => clearInterval(interval)
  }, [isOpen])

  // Auto scroll a los ultimos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Focus en input cuando abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  /**
   * Envia un mensaje a Vertex
   */
  const sendMessage = async (message) => {
    if (!message.trim() || isLoading) return

    setInputValue('')
    clearError()

    // Stop listening if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }

    // Usar el helper que actualiza el store
    await sendVertexMessage(store, message)
  }

  /**
   * Maneja el envio del formulario
   */
  const handleSendMessage = async (e) => {
    e.preventDefault()
    await sendMessage(inputValue)
  }

  /**
   * Maneja el click en sugerencias
   */
  const handleSuggestion = (suggestion) => {
    sendMessage(suggestion)
  }

  /**
   * Descarta una alerta
   */
  const handleDismissAlert = async (alertId) => {
    try {
      await vertexService.dismissAlert(alertId)
      store.dismissAlert(alertId)
    } catch (error) {
      console.error('Error descartando alerta:', error)
    }
  }

  // Contador de alertas no mostradas
  const unshownAlertsCount = getUnshownAlertsCount()

  if (!isOpen) return null

  return (
    <div className="fixed bottom-24 right-6 z-50 w-full max-w-sm h-[520px]
                    bg-white border border-gray-200
                    rounded-2xl shadow-lg
                    flex flex-col
                    animate-scale-in"
    >
      {/* Header - Vertex IA */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between rounded-t-2xl"
           style={{ backgroundColor: '#093170' }}>
        <div className="flex items-center gap-3">
          {/* Avatar Vertex */}
          <div className="relative">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md
                          ${isSpeaking ? 'animate-pulse' : ''}`}
                 style={{ backgroundColor: '#fc1b80' }}>
              <span className="text-white text-sm font-bold">V</span>
            </div>
            {/* Indicador de estado */}
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white
                          ${isSpeaking ? 'animate-pulse' : ''}`}
                 style={{ backgroundColor: isSpeaking ? '#90caf9' : '#4caf50' }}></div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Vertex IA
            </h3>
            <span className="text-xs text-blue-100">
              {isSpeaking ? 'Hablando...' : isListening ? 'Escuchando...' : 'Tu asistente SPM'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle Voice Output */}
          <button
            onClick={toggleVoice}
            aria-label={voiceEnabled ? 'Desactivar voz' : 'Activar voz'}
            title={voiceEnabled ? 'Desactivar voz' : 'Activar voz'}
            className={`p-1.5 rounded-full transition-colors ${voiceEnabled ? 'text-white hover:bg-blue-600' : 'text-blue-200 hover:bg-blue-600'}`}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Badge de alertas */}
          {unshownAlertsCount > 0 && (
            <div className="relative">
              <Bell className="w-5 h-5 text-amber-300" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unshownAlertsCount}
              </span>
            </div>
          )}

          <button
            onClick={closeChat}
            aria-label="Cerrar chat"
            className="p-1.5 rounded-full text-white hover:bg-blue-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alertas Proactivas */}
      {pendingAlerts.length > 0 && (
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-200">
          {pendingAlerts.slice(0, 1).map(alert => (
            <div key={alert.id} className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-800 truncate">
                  {alert.title}
                </p>
                <p className="text-[11px] text-amber-600 line-clamp-2">
                  {alert.message}
                </p>
              </div>
              <button
                onClick={() => handleDismissAlert(alert.id)}
                className="text-amber-400 hover:text-amber-600 p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundColor: '#faf1e1' }}>
        {formattedMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-xl shadow-sm
                ${msg.isUser
                  ? 'text-white'
                  : 'bg-gray-100 border border-gray-200 text-slate-700'
                }`}
              style={msg.isUser ? { backgroundColor: '#1976d2' } : undefined}
            >
              {/* Contenido del mensaje */}
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                {msg.content}
              </p>

              {/* Sugerencias */}
              {msg.suggestions && msg.suggestions.length > 0 && msg.isAssistant && (
                <div className="mt-2 space-y-1.5 pt-2 border-t border-gray-200">
                  {msg.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestion(suggestion)}
                      className="block w-full text-left text-xs px-2 py-1.5
                               bg-white hover:bg-blue-50
                               border border-gray-200
                               rounded-lg transition-colors text-slate-600
                               hover:text-blue-600"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <p className={`text-[10px] mt-1.5 ${msg.isUser ? 'text-blue-100' : 'text-slate-400'}`}>
                {msg.formattedTime}
              </p>
            </div>
          </div>
        ))}

        {/* Indicador de Vertex pensando */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#1976d2', animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#1976d2', animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#1976d2', animationDelay: '300ms' }} />
              </div>
              <span className="text-xs" style={{ color: '#1976d2' }}>Vertex esta pensando...</span>
            </div>
          </div>
        )}

        {/* Loading sin typing */}
        {isLoading && !isTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#1976d2' }} />
              <span className="text-sm text-slate-600">Conectando...</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex justify-start">
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-gray-200 p-3 bg-white rounded-b-2xl"
      >
        <div className="flex gap-2">
          {/* Microphone Button */}
          {speechSupported && !micPermissionDenied && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={isLoading}
              className={`px-3 py-2 rounded-xl transition-colors ${isListening
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-blue-50 hover:bg-blue-100'}`}
              title={isListening ? 'Detener' : 'Hablar'}
            >
              {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" style={{ color: '#1976d2' }} />}
            </button>
          )}

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isListening ? 'Escuchando...' : 'Escribi o habla tu consulta...'}
            disabled={isLoading}
            autoComplete="off"
            className={`flex-1 px-3 py-2 bg-white
                      border rounded-xl
                      text-sm text-slate-800
                      placeholder-slate-400
                      focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400
                      disabled:bg-gray-100 disabled:cursor-not-allowed
                      transition-all
                      ${isListening
                        ? 'border-red-400 ring-2 ring-red-200'
                        : 'border-gray-300'}`}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-3 py-2 rounded-xl text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ backgroundColor: '#1976d2' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Helper text con sugerencias rapidas */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {(suggestions.length > 0 ? suggestions.slice(0, 3) : ['Ver solicitudes', 'Buscar material', 'Stock']).map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestion(sug)}
              disabled={isLoading}
              className="text-[10px] px-2 py-0.5 bg-blue-50
                       rounded-full
                       hover:bg-blue-100
                       disabled:opacity-50 transition-colors"
              style={{ color: '#1976d2' }}
            >
              {sug}
            </button>
          ))}
        </div>
      </form>
    </div>
  )
}
