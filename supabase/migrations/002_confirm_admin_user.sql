-- Confirmar email del usuario administrador
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'juan.etayo@cacsantabarbara.co';

-- Registrar en tabla usuarios como Administrador
-- Primero obtenemos el UUID del usuario creado
INSERT INTO public.usuarios (id, identificacion, nombres, email, telefono, perfil_id, activo)
SELECT
  id,
  '000000000',
  'Juan Carlos Etayo',
  'juan.etayo@cacsantabarbara.co',
  NULL,
  1,    -- 1 = Administrador
  true
FROM auth.users
WHERE email = 'juan.etayo@cacsantabarbara.co'
ON CONFLICT (email) DO NOTHING;
