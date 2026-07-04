export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.manabuy.in/api/v1/manaBuy-services';

interface ApiRequestOptions extends RequestInit {
    params?: Record<string, string | number | boolean>;
    _retry?: boolean;
}


let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/**
 * Centralized API client wrapper for fetch.
 * Handles base URL, default headers, and standard error logging.
 * Includes:
 * 1. Robust Token Refresh (401 interception)
 */
export async function apiClient<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
): Promise<T> {
    const { params, _retry, ...fetchOptions } = options;

    const url = new URL(`${API_BASE_URL}${endpoint}`);

    // Defensive: Clean up potential double '?' if endpoint had one and params are added, 
    // or if the URL construction created something weird like '.../get??categoryId=' (User report)
    // Although URL object handles standard cases, manual string concatenation or specific backend behaviors might vary.
    // We rely on URL object, but we can verify param appending logic.

    if (params) {
        // Sort keys to ensure consistent URL for caching
        const sortedKeys = Object.keys(params).sort();
        sortedKeys.forEach((key) => {
            const value = params[key];
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, String(value));
            }
        });
    }

    // DEBUG: Check Next.js Cache Config



    // TOKEN HANDLING:
    // Get token from localStorage if on client
    let token = '';
    // Skip token for auth endpoints explicitly
    const isAuthEndpoint = endpoint.startsWith('/auth/');

    if (!isAuthEndpoint && typeof window !== 'undefined') {
        token = localStorage.getItem('accessToken') || '';

        if (!token) console.warn(`[API] No token found in localStorage for ${endpoint}`);
    }

    const isFormData = fetchOptions.body instanceof FormData;

    const headers: HeadersInit = {
        "Accept": "application/json",
        ...fetchOptions.headers,
    };

    if (!isFormData) {
        (headers as any)["Content-Type"] = "application/json";
    }

    if (token) {
        (headers as any)['Authorization'] = `Bearer ${token}`;
    }



    const startTime = performance.now();
    let res: Response;
    try {
        res = await fetch(url.toString(), {
            // credentials: "include", // 🔥 REMOVED: Using Bearer Token
            ...fetchOptions,
            headers,
        });
    } catch (error: any) {
        console.error(`[API FATAL] Network Error at ${endpoint}:`, error?.cause || error);
        throw error;
    }
    const duration = performance.now() - startTime;

    // ✅ 401 Handling with Refresh Token
    if (res.status === 401 && !_retry) {
        if (typeof window !== 'undefined') {
            if (isRefreshing) {
                // If already refreshing, wait for it to finish and retry
                return new Promise((resolve, reject) => {
                    refreshPromise?.then(async () => {
                        try {
                            const retryRes = await apiClient<T>(endpoint, { ...options, _retry: true });
                            resolve(retryRes);
                        } catch (e) {
                            reject(e);
                        }
                    }).catch(reject);
                });
            }

            const refreshToken = localStorage.getItem('refreshToken');

            if (refreshToken) {
                isRefreshing = true;
                refreshPromise = (async () => {
                    try {


                        // We use fetch directly here to avoid circular dependency or infinite loop
                        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ refreshToken })
                        });

                        if (refreshRes.ok) {
                            const data = await refreshRes.json();
                            if (data.accessToken && data.refreshToken) {

                                localStorage.setItem('accessToken', data.accessToken);
                                localStorage.setItem('refreshToken', data.refreshToken);
                                return;
                            }
                        }

                        throw new Error('Refresh failed');
                    } catch (error) {
                        console.error('[Auth] Refresh token invalid or expired', error);
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('refreshToken');
                        localStorage.removeItem('customerId');
                        window.location.href = "/login";
                        throw error;
                    } finally {
                        isRefreshing = false;
                        refreshPromise = null;
                    }
                })();

                // Wait for refresh to complete
                try {
                    await refreshPromise;
                    // Retry original request
                    return apiClient<T>(endpoint, { ...options, _retry: true });
                } catch (error) {
                    // Already handled in catch block above (redirect), just rethrow to stop
                    throw error;
                }
            } else {
                // No refresh token available
                console.warn('[Auth] No refresh token found, clearing session.');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('customerId');
                window.location.href = "/login";
                throw new Error("Session expired");
            }
        }
        throw new Error("Session expired");
    }

    if (!res.ok) {
        console.error(`API Error: ${res.status} ${res.statusText} at ${endpoint}`);
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    const text = await res.text();
    try {
        // Handle empty or text responses gracefully
        return text ? (JSON.parse(text) as T) : ({} as T);
    } catch {
        // If allow text, return text, else warning
        console.warn(`[API Client] Failed to parse JSON, returning text.`);
        return text as unknown as T;
    }
}
