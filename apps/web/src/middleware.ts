import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROLE_PREFIXES: Record<string, string[]> = {
  '/driver': ['DRIVER'],
  '/owner':  ['OWNER'],
  '/admin':  ['ADMIN', 'SECURITY'],
}

function getRoleFromToken(token: string | undefined): string | null {
  if (!token) return null
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    return payload.role ?? null
  } catch {
    return null
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const token = req.cookies.get('accessToken')?.value
    ?? req.headers.get('authorization')?.replace('Bearer ', '')

  for (const [prefix, allowedRoles] of Object.entries(ROLE_PREFIXES)) {
    if (pathname.startsWith(prefix)) {
      const role = getRoleFromToken(token)
      if (!role || !allowedRoles.includes(role)) {
        const loginUrl = new URL('/auth/login', req.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/driver/:path*', '/owner/:path*', '/admin/:path*'],
}
