'use client'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useLogin } from '@/lib/hooks/useAuth'
import { ROUTES } from '@/lib/constants/routes'

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const login = useLogin()

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Sign in</h1>
      <p className="mt-1 text-sm text-neutral-500">Welcome back to Parko</p>

      <form onSubmit={handleSubmit((d) => login.mutate(d))} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" className="mt-1" {...register('email')} />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href={ROUTES.AUTH.FORGOT} className="text-xs text-blue-600 hover:underline">Forgot?</Link>
          </div>
          <Input id="password" type="password" placeholder="••••••••" className="mt-1" {...register('password')} />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        {login.isError && (
          <p className="text-xs text-red-500">{(login.error as any)?.message ?? 'Invalid credentials'}</p>
        )}

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-neutral-500">
        No account?{' '}
        <Link href={ROUTES.AUTH.REGISTER} className="text-blue-600 hover:underline">Sign up</Link>
      </p>
    </div>
  )
}
