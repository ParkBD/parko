'use client'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useRegister } from '@/lib/hooks/useAuth'
import { ROUTES } from '@/lib/constants/routes'

const schema = z.object({
  name:     z.string().min(2, 'Required'),
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  role:     z.enum(['DRIVER', 'OWNER']),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'DRIVER' },
  })
  const registerMutation = useRegister()
  const role = watch('role')

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Create account</h1>
      <p className="mt-1 text-sm text-neutral-500">Join Parko today</p>

      <div className="mt-4 flex rounded-xl border border-neutral-100 p-1 gap-1">
        {(['DRIVER', 'OWNER'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setValue('role', r)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
              role === r ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {r === 'DRIVER' ? 'Find parking' : 'List space'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit((d) => registerMutation.mutate(d))} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" placeholder="Alex Johnson" className="mt-1" {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" className="mt-1" {...register('email')} />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="Min 8 characters" className="mt-1" {...register('password')} />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        {registerMutation.isError && (
          <p className="text-xs text-red-500">{(registerMutation.error as any)?.message ?? 'Registration failed'}</p>
        )}

        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-neutral-500">
        Have an account?{' '}
        <Link href={ROUTES.AUTH.LOGIN} className="text-blue-600 hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
