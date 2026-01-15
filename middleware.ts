import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

        // Handle refresh token errors by clearing cookies
        if (error) {
            console.warn('[Middleware] Auth error:', error.message)

            // Clear all Supabase auth cookies to force re-login
            request.cookies.getAll().forEach(cookie => {
                if (cookie.name.includes('sb-') && cookie.name.includes('-auth-token')) {
                    response.cookies.delete(cookie.name)
                }
            })
            response.cookies.delete('sb-access-token')
            response.cookies.delete('sb-refresh-token')
        }

        return response
    } catch (error) {
        // If there is an auth error (e.g. invalid refresh token), clear the cookies
        // so the user is forced to re-login instead of getting stuck in a loop.
        console.error('Middleware auth error:', error)
        response.cookies.delete('sb-access-token')
        response.cookies.delete('sb-refresh-token')
        // Also clear the combined cookie if it exists (Supabase v2 default)
        // We iterate over potential supabase cookies to be safe
        request.cookies.getAll().forEach(cookie => {
            if (cookie.name.includes('sb-') && cookie.name.includes('-auth-token')) {
                response.cookies.delete(cookie.name)
            }
        })
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
