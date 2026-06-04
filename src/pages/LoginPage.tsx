import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [loading, setLoading] = useState(false)

  // Si ya está autenticado, redirigir al inicio
  if (user) return <Navigate to="/" replace />

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    try {
      await signIn(data.email, data.password)
      navigate('/')
    } catch {
      toast.error('Credenciales incorrectas')
    }
  }

  async function handleRecovery() {
    if (!recoveryEmail) return toast.error('Ingrese su correo')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) toast.error(error.message)
    else {
      toast.success('Se envió el enlace de recuperación a su correo')
      setRecovery(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <img src={`${import.meta.env.BASE_URL}images/logo_cacsb2.png`} alt="Clínica Santa Bárbara" className="h-20 object-contain mb-4" />
          <h1 className="text-xl font-bold text-primary-800">Clínica Santa Bárbara</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de Agenda de Salas de Reuniones</p>
        </div>

        {recovery ? (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-700">Recuperar contraseña</h2>
            <div>
              <label className="form-label">Correo electrónico</label>
              <input
                type="email"
                className="form-input"
                placeholder="correo@clinica.com"
                value={recoveryEmail}
                onChange={e => setRecoveryEmail(e.target.value)}
              />
            </div>
            <button onClick={handleRecovery} disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
            <button onClick={() => setRecovery(false)} className="text-sm text-primary-600 hover:underline w-full text-center">
              Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="form-label">Correo electrónico</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input {...register('email')} type="email" className="form-input pl-9" placeholder="correo@clinica.com" />
              </div>
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div>
              <label className="form-label">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="form-input pl-9 pr-9"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5 text-base">
              {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
            </button>

            <button type="button" onClick={() => setRecovery(true)} className="text-sm text-primary-600 hover:underline w-full text-center">
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
