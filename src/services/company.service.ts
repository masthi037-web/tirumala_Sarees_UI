import { cache } from 'react';
import { apiClient } from './api-client';
import { CompanyDetails } from '@/lib/api-types';

export const fetchCompanyDetails = cache(async (companyDomain: string): Promise<CompanyDetails | null> => {
    try {
        const isLocalhost = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ||
                            (!companyDomain || companyDomain.includes('localhost') || companyDomain.includes('127.0.0.1'));

        // If localhost, default to fetching tirumalacollections.com details from backend
        let domainToFetch = companyDomain;
        if (isLocalhost) {
            domainToFetch = 'tirumalacollections.com';
        }

        try {
            const data = await apiClient<CompanyDetails>('/company/public/get', {
                params: { companyDomain: domainToFetch },
                next: { revalidate: 300, tags: ['company'] } // 5 minutes cache
            });

            if (data) {
                console.log("Fetched company details from backend successfully for:", domainToFetch);
                if (isLocalhost) {
                    data.companyDomain = companyDomain || "localhost";
                }
                return data;
            }
        } catch (apiError) {
            console.error("Failed to fetch company details from backend, falling back to mock:", apiError);
        }

        // Fallback mock details if API fails on localhost
        if (isLocalhost) {
            console.log("Dev Mode: Returning fallback mock company details for domain:", companyDomain);
            return {
                companyId: "tirumalasarees",
                companyName: "Tirumala Sarees",
                companyDomain: companyDomain || "localhost",
                companyPhone: "9988776655",
                companyMessage: "Welcome to Tirumala Sarees",
                companyEmail: "support@tirumalasarees.com",
                gstNumber: "GST123456789",
                logo: "",
                banner: "",
                companyCoupon: "WELCOME10&&&10,FESTIVE20&&&20",
                ownerName: "Owner Name",
                ownerEmail: "owner@tirumalasarees.com",
                companyStatus: "ACTIVE",
                ownerPhone: "9988776655",
                companyAddress: "123 Saree Lane",
                companyCity: "Hyderabad",
                companyState: "Telangana",
                companyPinCode: "500033",
                companyFssAi: "",
                companyProductCategory: "Sarees",
                deliveryBetween: "3-5 Days",
                companyEstDate: "2020-01-01",
                averageRating: 4.8,
                totalRating: 5,
                noOfRatings: 100,
                minimumOrderCost: "0",
                freeDeliveryCost: "5000",
                deliveryCost: "100",
                socialMediaLink: null,
                about: "Premium silk sarees from Kanchipuram and Banaras.",
                razorpayKeyId: "rzp_test_mock",
                razorpayKeySecret: "mock_secret",
                razorpay: true,
                smePay: false,
                cashFree: false,
                companyRegisteredAt: "2020-01-01",
                updatedAt: "2020-01-01"
            } as CompanyDetails;
        }

        return null;
    } catch (error) {
        console.error('Error fetching company details:', error);
        return null;
    }
});
