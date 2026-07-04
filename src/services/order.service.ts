import { apiClient } from './api-client';
import { PaymentInitializationRequest, PaymentInitializationResponse, SaveOrderResponse, SaveOrderRequest } from '@/lib/api-types';

export const orderService = {
    initializePayment: async (data: PaymentInitializationRequest, razorpayKeyId: string, razorpayKeySecret: string) => {
        return apiClient<PaymentInitializationResponse>('/order/payment-initialise', {
            method: 'POST',
            body: JSON.stringify(data),
            params: {
                razorpayKeyId,
                razorpayKeySecret
            },
            // No cache for payment initialization
            next: { revalidate: 0 }
        });
    },

    verifyPayment: async (data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) => {
        return apiClient<{ status: string; orderId?: string; message?: string }>('/payments/verify', {
            method: 'POST',
            body: JSON.stringify(data),
            next: { revalidate: 0 }
        });
    },

    saveOrder: async (data: SaveOrderRequest) => {
        return apiClient<SaveOrderResponse>('/order/create', {
            method: 'POST',
            body: JSON.stringify(data),
            next: { revalidate: 0 }
        });
    },

    createForSmePay: async (data: SaveOrderRequest) => {
        return apiClient<any>('/order/create-for-smePay', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    createForCashFree: async (data: SaveOrderRequest) => {
        return apiClient<import('@/lib/api-types').CashfreeOrderResponse>('/order/create-for-cash-free', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    createForRazorpay: async (data: SaveOrderRequest) => {
        return apiClient<any>('/order/create-for-razorpay', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    getPaymentStatus: async (orderId: string) => {
        return apiClient<any>(`/order/payment-status?orderId=${orderId}`, {
            method: 'GET',
            next: { revalidate: 0 }
        });
    },

    getCustomerOrders: async (customerId: string, forceRefresh: boolean = false) => {
        const CACHE_KEY = `orders_cache_${customerId}`;
        const TIMESTAMP_KEY = `orders_timestamp_${customerId}`;
        const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours

        // 1. Try Cache (if not forced)
        if (!forceRefresh && typeof window !== 'undefined') {
            try {
                const cachedData = localStorage.getItem(CACHE_KEY);
                const cachedTime = localStorage.getItem(TIMESTAMP_KEY);

                if (cachedData && cachedTime) {
                    const age = Date.now() - parseInt(cachedTime, 10);
                    if (age < CACHE_DURATION) {
                        return JSON.parse(cachedData) as SaveOrderResponse[];
                    }
                }
            } catch (e) {
                console.error("Cache parse error", e);
            }
        }

        // 2. Fetch Fresh Data (still keeping the revalidate tag for server-side correctness just in case)
        const data = await apiClient<SaveOrderResponse[]>('/order/customer/get', {
            params: { customerId },
            next: { revalidate: 60, tags: ['orders'] }
        });

        // 3. Save to Cache
        if (typeof window !== 'undefined' && data) {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
        }

        return data;
    },

    getCompanyOrdersByDate: async (companyId: string, date: string, forceRefresh: boolean = false) => {
        // date format: YYYY-MM-DD
        const CACHE_KEY = `company_orders_${companyId}_${date}`;
        const TIMESTAMP_KEY = `company_orders_timestamp_${companyId}_${date}`;
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

        // 1. Try Cache (if not forced)
        if (!forceRefresh && typeof window !== 'undefined') {
            try {
                const cachedData = localStorage.getItem(CACHE_KEY);
                const cachedTime = localStorage.getItem(TIMESTAMP_KEY);

                if (cachedData && cachedTime) {
                    const age = Date.now() - parseInt(cachedTime, 10);
                    if (age < CACHE_DURATION) {
                        return JSON.parse(cachedData) as SaveOrderResponse[];
                    }
                }
            } catch (e) {
                console.error("Cache parse error", e);
            }
        }

        // 2. Fetch Fresh Data
        const data = await apiClient<SaveOrderResponse[]>('/order/company/get-by-date', {
            params: {
                companyId,
                date
            },
            next: { revalidate: 300 } // 5 minutes cache
        });

        // 3. Save to Cache
        if (typeof window !== 'undefined' && data) {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
        }

        return data;
    },

    getCompanyOrdersByRange: async (companyId: string, fromDate: string, toDate: string, forceRefresh: boolean = false) => {
        const CACHE_KEY = `company_orders_${companyId}_${fromDate}_${toDate}`;
        const TIMESTAMP_KEY = `company_orders_timestamp_${companyId}_${fromDate}_${toDate}`;
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

        // 1. Try Cache (if not forced)
        if (!forceRefresh && typeof window !== 'undefined') {
            try {
                const cachedData = localStorage.getItem(CACHE_KEY);
                const cachedTime = localStorage.getItem(TIMESTAMP_KEY);

                if (cachedData && cachedTime) {
                    const age = Date.now() - parseInt(cachedTime, 10);
                    if (age < CACHE_DURATION) {
                        return JSON.parse(cachedData) as SaveOrderResponse[];
                    }
                }
            } catch (e) {
                console.error("Cache parse error", e);
            }
        }

        // 2. Fetch Fresh Data
        const data = await apiClient<SaveOrderResponse[]>('/order/company/get-by-range', {
            params: {
                companyId,
                fromDate,
                toDate
            },
            next: { revalidate: 300 }
        });

        // 3. Save to Cache
        if (typeof window !== 'undefined' && data) {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
        }

        return data;
    },
    updateOrderStatus: async (orderId: number, status: string) => {
        return apiClient<any>('/order/status/update', {
            params: {
                orderId,
                status
            },
            next: { revalidate: 0 }
        });
    },

    getOrderById: async (orderId: number) => {
        return apiClient<SaveOrderResponse>('/order/get-by-order-id', {
            params: {
                orderId
            },
            next: { revalidate: 0 }
        });
    }
};
