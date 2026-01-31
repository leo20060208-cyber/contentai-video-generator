import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    const url = request.nextUrl.pathname;
    // console.log(`[Middleware] Request: ${url}`); // Temporary log

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Skip auth check if environment variables are missing to prevent crash
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[Middleware] Skipping auth check: Missing environment variables.')
        return response
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )


    try {
        const { data: { session }, error } = await supabase.auth.getSession()

        // Handle refresh token errors by clearing main auth cookies
        if (error) {
            console.warn('[Middleware] Auth error:', error.message)

            // Clear main tokens
            response.cookies.delete('sb-access-token')
            response.cookies.delete('sb-refresh-token')

            // Attempt to clear any other sb-* cookies safer
            try {
                const allCookies = request.cookies.getAll()
                for (const cookie of allCookies) {
                    if (cookie.name.startsWith('sb-')) {
                        response.cookies.delete(cookie.name)
                    }
                }
            } catch (e) {
                console.warn('[Middleware] Failed to clear all sb cookies:', e)
            }
        }

        return response
    } catch (error) {
        console.error('Middleware auth error:', error)

        response.cookies.delete('sb-access-token')
        response.cookies.delete('sb-refresh-token')

        try {
            const allCookies = request.cookies.getAll()
            for (const cookie of allCookies) {
                if (cookie.name.startsWith('sb-')) {
                    response.cookies.set(cookie.name, '', { maxAge: 0 })
                }
            }
        } catch (e) {
            // Ignore
        }

        return response
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
