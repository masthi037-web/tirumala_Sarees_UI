"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
    SheetFooter
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Minus,
    Plus,
    ShoppingCart,
    Trash2,
    ArrowRight,
    Gift,
    Sparkles,
    X,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Tag,
    Lock,
    Trash,
    MapPin,
    Loader2,
    Home,
    Building2,
    Truck,
    Check,
    CreditCard,
    Info,
    User,
    Briefcase,
    Download,
    DownloadCloud,
    UploadCloud,
    ExternalLink,
    ChevronRight
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProduct } from '@/hooks/use-product';
import { fetchProductDetails } from '@/services/product.service';
import { useCart, CartItem } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { customerService } from '@/services/customer.service';
import { orderService } from '@/services/order.service';
import { CustomerDetails, CustomerAddress, PaymentInitializationRequest, CheckoutValidationItem, CheckoutValidationRequest, SaveOrderRequest, SaveOrderItem, SmePayResponse } from '@/lib/api-types';
import { Label } from '@/components/ui/label';
import { useRazorpay } from '@/hooks/use-razorpay';
import { fetchCompanyDetails } from '@/services/company.service';
import { validateCheckout } from '@/services/product.service';
// @ts-ignore
import { load } from '@cashfreepayments/cashfree-js';

import { useTenant } from '@/components/providers/TenantContext';
import { useSheetBackHandler } from '@/hooks/use-sheet-back-handler';
import { ImageUpload } from '@/components/common/ImageUpload';

const CheckoutProgressBar = ({ currentView }: { currentView: 'cart' | 'list' | 'add' | 'payment' | 'success' | 'failed' }) => {
    let stepIndex = 0;
    if (currentView === 'list' || currentView === 'add') {
        stepIndex = 1;
    } else if (currentView === 'payment') {
        stepIndex = 2;
    }

    // Determine position percentage of the truck
    const percentage = stepIndex === 0 ? 0 : stepIndex === 1 ? 50 : 100;

    return (
        <div className="px-6 py-4 bg-muted/20 border-b border-border/30 relative">
            <div className="relative h-6 mt-1 flex items-center">
                {/* Pathway background line */}
                <div className="absolute left-0 right-0 h-1 bg-border/40 rounded-full border-t border-dashed" />
                
                {/* Pathway active track */}
                <div 
                    className="absolute left-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-accent transition-all duration-1000 ease-in-out rounded-full"
                    style={{ width: `${percentage}%` }}
                />

                {/* Checkpoint 1: Cart */}
                <div className="absolute left-0 -translate-x-1/2 flex flex-col items-center">
                    <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10",
                        stepIndex >= 0 
                            ? "bg-background border-primary text-primary shadow-[0_0_12px_rgba(var(--primary),0.2)]" 
                            : "bg-background border-muted text-muted-foreground"
                    )}>
                        <ShoppingCart className="w-3.5 h-3.5" />
                    </div>
                </div>

                {/* Checkpoint 2: Address */}
                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10",
                        stepIndex >= 1 
                            ? "bg-background border-primary text-primary shadow-[0_0_12px_rgba(var(--primary),0.2)]" 
                            : "bg-background border-muted text-muted-foreground"
                    )}>
                        <MapPin className="w-3.5 h-3.5" />
                    </div>
                </div>

                {/* Checkpoint 3: Payment */}
                <div className="absolute right-0 translate-x-1/2 flex flex-col items-center">
                    <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10",
                        stepIndex >= 2 
                            ? "bg-background border-primary text-primary shadow-[0_0_12px_rgba(var(--primary),0.2)]" 
                            : "bg-background border-muted text-muted-foreground"
                    )}>
                        <CreditCard className="w-3.5 h-3.5" />
                    </div>
                </div>

                {/* Moving Truck */}
                <div 
                    className="absolute -top-1.5 transition-all duration-1000 ease-in-out z-20"
                    style={{ 
                        left: `${percentage}%`,
                        transform: `translateX(-50%)` 
                    }}
                >
                    <div className="bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg border border-white/20 animate-bounce flex items-center justify-center">
                        <Truck className="w-4 h-4" />
                    </div>
                </div>
            </div>
            
            {/* Step Labels */}
            <div className="flex justify-between mt-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground/80">
                <span className={cn(stepIndex === 0 ? "text-primary font-black" : "text-muted-foreground/80")}>Cart</span>
                <span className={cn(stepIndex === 1 ? "text-primary font-black" : "text-muted-foreground/80")}>Address</span>
                <span className={cn(stepIndex === 2 ? "text-primary font-black" : "text-muted-foreground/80")}>Payment</span>
            </div>
        </div>
    );
};

export function CartSheet({ children }: { children: React.ReactNode }) {
    const { cart, updateQuantity, removeFromCart, getCartTotal, getCartItemsCount, isCartOpen, setCartOpen, companyDetails, lastAddedItemId, clearCart, setCart } = useCart();
    const { isLoaded: isRazorpayLoaded, loadRazorpay } = useRazorpay();

    // Handle back button on mobile
    useSheetBackHandler(isCartOpen, setCartOpen);

    const { toast } = useToast();
    const { text, theme, features } = useTenant();
    const router = useRouter();
    const [celebrated, setCelebrated] = useState(false);
    const [bulkCelebrated, setBulkCelebrated] = useState(false);
    const [showFreeDeliveryPopup, setShowFreeDeliveryPopup] = useState(false);
    const [showCouponPopup, setShowCouponPopup] = useState(false);
    const [showQrPopup, setShowQrPopup] = useState(false);
    const [showExitConfirmation, setShowExitConfirmation] = useState(false);
    const [smePayData, setSmePayData] = useState<SmePayResponse | null>(null);

    // Timer Logic for QR
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [isPolling, setIsPolling] = useState(false);

    // Cashfree Polling State
    const [cashfreeOrderId, setCashfreeOrderId] = useState<string | null>(null);
    const [isCashfreePolling, setIsCashfreePolling] = useState(false);

    // Razorpay Polling State
    const [razorpayOrderId, setRazorpayOrderId] = useState<string | null>(null);
    const [isRazorpayPolling, setIsRazorpayPolling] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (showQrPopup && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (showQrPopup && timeLeft === 0 && smePayData) {
            // Timeout reached!
            toast({ variant: "destructive", title: "Payment Timeout", description: "Payment time limit reached." });
            setShowQrPopup(false);
            setSmePayData(null);
            setView('failed');
            setTimeLeft(300);
            setIsPolling(false);
        } else if (!showQrPopup) {
            // Reset when closed
            setTimeLeft(300); // Reset to 5:00
            setIsPolling(false);
        }
        return () => clearInterval(timer);
    }, [showQrPopup, timeLeft, smePayData, toast]);



    const [isPickup, setIsPickup] = useState(false);
    const [extraDiscount, setExtraDiscount] = useState(0);

    const formatTime = (seconds: number) => {
        const totalSeconds = Math.max(0, seconds);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins} : ${secs.toString().padStart(2, '0')}`;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Track initial render to prevent confetti on reload
    const isFirstRender = useRef(true);

    // Calculate Product Quantities (ID-based) and associate Rules
    const productQuantities: Record<string, number> = {};
    const productRules: Record<string, string> = {};

    cart.forEach(item => {
        productQuantities[item.id] = (productQuantities[item.id] || 0) + item.quantity;
        if (item.multipleSetDiscount) {
            productRules[item.id] = item.multipleSetDiscount.trim();
        }
    });

    // Pre-calculate Discount Distribution Map for each item UNIT
    // Key: CartItemId -> Value: Array of percentages for each unit in that item [15, 0]
    // We map by CartItemId to handle multiple variants of same product correctly
    const itemDiscountMap: Record<string, number[]> = {};

    Object.keys(productQuantities).forEach(productId => {
        const totalQty = productQuantities[productId];
        const ruleKey = productRules[productId];
        const productItemForRule = cart.find(i => i.id.toString() === productId);
        const moreThanRule = productItemForRule?.multipleDiscountMoreThan;

        // 1. Gather all individual units for this product across all cart items
        // We need to know which unit belongs to which cartItem to map it back later
        interface Unit {
            price: number;
            cartItemId: string;
            indexInItem: number; // 0 for 1st unit of this item, 1 for 2nd...
        }
        let allUnits: Unit[] = [];

        cart.filter(i => i.id.toString() === productId).forEach(item => {
            for (let k = 0; k < item.quantity; k++) {
                allUnits.push({
                    price: item.price,
                    cartItemId: item.cartItemId,
                    indexInItem: k
                });
            }
        });

        // 2. Sort Units by Price DESCENDING (User Request: Apply offer to max price items)
        allUnits.sort((a, b) => b.price - a.price);

        // 3. Calculate Discount Tiers based on TOTAL quantity
        let discountsToApply: number[] = [];

        // Logic A: Tiers
        let greedyDiscounts: number[] = [];
        let maxGreedyDiscount = 0;

        if (ruleKey) {
            const segments = String(ruleKey).split('&&&');
            const tiers: { threshold: number, percent: number }[] = [];
            segments.forEach(seg => {
                const parts = String(seg).split('-');
                if (parts.length === 2) {
                    const t = parseFloat(parts[0]);
                    const p = parseFloat(parts[1]);
                    if (!isNaN(t) && !isNaN(p)) {
                        tiers.push({ threshold: t, percent: p });
                    }
                }
            });
            tiers.sort((a, b) => b.threshold - a.threshold);
            if (tiers.length > 0) maxGreedyDiscount = tiers[0].percent;

            let remaining = totalQty;
            while (remaining > 0) {
                const bestTier = tiers.find(t => t.threshold <= remaining);
                if (bestTier) {
                    for (let k = 0; k < bestTier.threshold; k++) {
                        greedyDiscounts.push(bestTier.percent);
                    }
                    remaining -= bestTier.threshold;
                } else {
                    for (let k = 0; k < remaining; k++) {
                        greedyDiscounts.push(0);
                    }
                    remaining = 0;
                }
            }
        } else {
            greedyDiscounts = new Array(totalQty).fill(0);
        }

        // Logic B: More Than Override
        discountsToApply = greedyDiscounts;
        if (moreThanRule) {
            const parts = String(moreThanRule).split('-');
            if (parts.length === 2) {
                const threshold = parseFloat(parts[0]);
                const discount = parseFloat(parts[1]);
                if (!isNaN(threshold) && !isNaN(discount) && totalQty > threshold) {
                    if (discount > maxGreedyDiscount) {
                        discountsToApply = new Array(totalQty).fill(discount);
                    }
                }
            }
        }

        // 4. Assign calculated discounts to sorted units
        // Since both arrays are length = totalQty, index matching works
        allUnits.forEach((unit, idx) => {
            const discountPercent = discountsToApply[idx] || 0;

            if (!itemDiscountMap[unit.cartItemId]) {
                itemDiscountMap[unit.cartItemId] = [];
            }
            // We can't just push because loop order might differ from original item indexing if we mixed items
            // But we stored cartItemId. We need to store it in a way that we can retrieve it by index.
            // Actually, itemDiscountMap needs to be sorted by indexInItem ultimately?
            // array[unit.indexInItem] = discount

            // Initialize if needed (though we might not know total size here efficiently without pre-alloc)
            // safer to push to a temp object keyed by "cartItemId-index"
        });

        // Re-map cleanly
        const tempMap: Record<string, number[]> = {};
        allUnits.forEach((unit, idx) => {
            const discountPercent = discountsToApply[idx];
            if (!tempMap[unit.cartItemId]) tempMap[unit.cartItemId] = [];
            // We need to place it at the correct index for that item
            tempMap[unit.cartItemId][unit.indexInItem] = discountPercent;
        });

        // Merge to main map
        Object.keys(tempMap).forEach(k => {
            itemDiscountMap[k] = tempMap[k];
        });
    });

    const productDiscounts = itemDiscountMap; // Alias for compatibility with existing render logic
    // We used to assume distribution was uniform or order didn't matter per item.
    // NOW it matters per Item.
    // I will need to update the Consumer logic too.

    // Let's keep productDiscounts as is BUT... wait, the logic below (lines 183+) iterates cart items.
    // If I change the key to cartItemId, I need to update the consumption.
    // Let's check lines 868+ (in render).
    // It likely does: const discounts = productDiscounts[item.id];
    // If I have 2 different items (variants) of same product, they share the pool.
    // Previous logic: productDiscounts[item.id] returned an array of length TotalQty.
    // The render loop likely sliced this array based on index?
    // Let's check the render logic. I'll read the file around line 900-1100 to be safe.


    const hasBulkDiscount = Object.keys(productDiscounts).some(k => productDiscounts[k].some(p => p > 0));

    // Bulk Discount Celebration
    useEffect(() => {
        if (!isFirstRender.current && hasBulkDiscount && !bulkCelebrated && isCartOpen) {
            const end = Date.now() + 1500;
            const colors = ['#059669', '#34D399', '#A7F3D0']; // Emerald/Green theme

            (function frame() {
                confetti({
                    particleCount: 2,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: colors,
                    zIndex: 9999
                });
                confetti({
                    particleCount: 2,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: colors,
                    zIndex: 9999
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
            setBulkCelebrated(true);
            toast({
                title: "Bulk Discount Unlocked! 🎉",
                description: "You've saved big with our bulk offers.",
                className: "bg-primary/10 border-emerald-200 text-emerald-800"
            });
        }
    }, [hasBulkDiscount, bulkCelebrated, isCartOpen]);


    // Validation State
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    interface ValidationMessage {
        message: string;
        cartItemId?: string;
    }

    const [validationErrors, setValidationErrors] = useState<ValidationMessage[]>([]);
    const [showValidationPopup, setShowValidationPopup] = useState(false);
    const [validatedCart, setValidatedCart] = useState<CartItem[]>([]);

    // Stock Conflict State
    interface StockConflict {
        stockKey: string;
        productName: string;
        availableStock: number;
        items: CartItem[]; // Items involved in this conflict
        totalRequested: number;
    }
    const [stockConflicts, setStockConflicts] = useState<StockConflict[]>([]);
    const [showConflictPopup, setShowConflictPopup] = useState(false);



    let blockingChanges = false;
    const changes: ValidationMessage[] = [];
    const uniqueMessages = new Set<string>();

    const pushChange = (msg: string, cartItemId?: string) => {
        if (!uniqueMessages.has(msg)) {
            uniqueMessages.add(msg);
            changes.push({ message: msg, cartItemId });
        }
    };



    {/* Validation Popup */ }
    {
        showValidationPopup && (
            <div className="absolute inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-background w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-border animate-in zoom-in-95 slide-in-from-bottom-5">
                    <div className="bg-amber-500/10 p-6 flex flex-col items-center text-center border-b border-amber-500/20">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-3 text-amber-600 dark:text-amber-500">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Cart Updated</h3>
                        <p className="text-sm text-muted-foreground mt-1">Some items have changed since you added them.</p>
                    </div>

                    <div className="p-6 space-y-4">
                        <ul className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                            {validationErrors.map((err, i) => (
                                <li key={i} className="text-sm border-l-2 border-amber-500 pl-3 py-1 text-muted-foreground flex items-start justify-between gap-2 bg-amber-50/50 dark:bg-amber-950/10 rounded-r-md">
                                    <span>{err.message}</span>
                                    {err.cartItemId && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 -mt-0.5 shrink-0"
                                            onClick={() => {
                                                removeFromCart(err.cartItemId!);
                                                setValidationErrors(prev => prev.filter((_, idx) => idx !== i));
                                                // If no errors left, close popup (optional, or keep open to review others)
                                                if (validationErrors.length <= 1) setShowValidationPopup(false);
                                            }}
                                            title="Remove item from cart"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>

                        <Button className="w-full" onClick={() => setShowValidationPopup(false)}>
                            <RefreshCw className="mr-2 w-4 h-4" />
                            Review & Continue
                        </Button>
                    </div>
                </div>
            </div>
        )
    }
    const [couponCode, setCouponCode] = useState('');
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    // Checkout / Address State
    // Views: 'cart' -> 'list' (Select Address) -> 'add' (New Address) -> 'payment' (Select Payment)
    const [view, setView] = useState<'cart' | 'list' | 'add' | 'payment' | 'success' | 'failed'>('cart');
    const [successOrderData, setSuccessOrderData] = useState<any>(null);
    const [customer, setCustomer] = useState<CustomerDetails | null>(null);
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'ONLINE'>('ONLINE');
    const [isInitializingPayment, setIsInitializingPayment] = useState(false);
    const [savingAddress, setSavingAddress] = useState(false); // Moved from line 214

    // Manual Payment State
    const [manualProof, setManualProof] = useState<string | null>(null);


    useEffect(() => {
        let timer: NodeJS.Timeout;
        // Check for strict false to enable manual mode (assuming true/undefined is default Razorpay)
        // Or if user wants strict toggle.
        // User request: "make razorpay to boolean... if yes show screen [Razorpay], if no show scanner".
        // boolean: true = Razorpay, false = Scanner.
        if (view === 'payment' && companyDetails?.razorpay === false && !companyDetails?.smePay && !companyDetails?.cashFree && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [view, companyDetails?.razorpay, timeLeft]);


    // Payment UI State
    const [paymentTab, setPaymentTab] = useState<'upi' | 'qr'>('qr');



    // Address Form State
    const [newAddress, setNewAddress] = useState<Partial<CustomerAddress>>({
        addressName: 'Home',
        customerRoad: '',
        customerCity: '',
        customerState: '',
        customerPin: '',
        customerDrNum: '',
        customerCountry: 'India'
    });
    const [addressLabel, setAddressLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
    const subtotal = getCartTotal();

    const handlePincodeChange = async (value: string) => {
        setNewAddress(prev => ({ ...prev, customerPin: value }));

        if (value.length === 6) {
            try {
                const response = await fetch(`https://api.postalpincode.in/pincode/${value}`);
                const data = await response.json();

                if (data[0].Status === 'Success') {
                    const details = data[0].PostOffice[0];
                    setNewAddress(prev => ({
                        ...prev,
                        customerPin: value,
                        customerCity: details.Division,
                        customerState: details.State,
                        customerCountry: 'India'
                    }));
                    toast({ description: `Location found: ${details.Division}, ${details.State}` });
                } else {
                    toast({ variant: "destructive", description: "Invalid Pincode" });
                    setNewAddress(prev => ({ ...prev, customerCity: '', customerState: '' }));
                }
            } catch (error) {
                console.error("Pin code fetch error:", error);
            }
        }
    };

    // Helper to sync label changes
    const handleLabelChange = (label: 'Home' | 'Work' | 'Other') => {
        setAddressLabel(label);
        if (label !== 'Other') {
            setNewAddress(prev => ({ ...prev, addressName: label }));
        } else {
            setNewAddress(prev => ({ ...prev, addressName: '' })); // Clear for custom input
        }
    };

    const cartItemCount = getCartItemsCount();

    // Config Logic
    const minOrder = companyDetails?.minimumOrderCost ? parseFloat(companyDetails.minimumOrderCost) : 0;
    const freeDeliveryThreshold = companyDetails?.freeDeliveryCost ? parseFloat(companyDetails.freeDeliveryCost) : 0;

    // Auth State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showLoginPopup, setShowLoginPopup] = useState(false);
    const [pendingStockConflicts, setPendingStockConflicts] = useState<StockConflict[]>([]); // "Chained Popup" buffer

    // SKIP VALIDATION LOGIC
    const [isValidated, setIsValidated] = useState(false);
    const isInternalUpdate = useRef(false);

    // Reset validation if user changes quantity manually
    useEffect(() => {
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false; // Reset flag, keep validated
        } else {
            if (isValidated) {
                setIsValidated(false);
            }
        }
    }, [cart]);

    const checkAuth = () => {
        if (typeof window !== 'undefined') {
            setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
        }
    };

    useEffect(() => {
        checkAuth();
        window.addEventListener('storage', checkAuth);
        window.addEventListener('auth-change', checkAuth);
        return () => {
            window.removeEventListener('storage', checkAuth);
            window.removeEventListener('auth-change', checkAuth);
        };
    }, []);

    // Reset view on logout
    useEffect(() => {
        if (!isLoggedIn) {
            setView('cart');
            setSelectedAddressId(null);
            setCustomer(null);
        }
    }, [isLoggedIn]);

    // Status Logic
    const isFreeDelivery = freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold;

    const shipping = isPickup ? 0 : (isFreeDelivery ? 0 : parseFloat(companyDetails?.deliveryCost || '0')); // Calculated at checkout
    const total = subtotal + shipping;
    const canCheckout = subtotal >= minOrder;
    const amountForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);

    // Centralized Bill Calculation
    let discountAmount = 0;
    if (couponCode && companyDetails?.companyCoupon && typeof companyDetails.companyCoupon === 'string') {
        const couponData = String(companyDetails.companyCoupon).split(',').find(c => c.startsWith(couponCode + '&&&'));
        if (couponData) {
            const [, discountStr, minOrderStr] = String(couponData).split('&&&');
            const discountPercent = parseFloat(discountStr || '0');
            const minCouponOrder = parseFloat(minOrderStr || '0');
            if (subtotal >= minCouponOrder) {
                discountAmount = (subtotal * discountPercent) / 100;
            }
        }
    }
    const finalTotal = Math.max(0, total - discountAmount);

    // Contact Info State
    const [contactInfo, setContactInfo] = useState({
        name: '',
        email: '',
        mobile: ''
    });

    // Initial Mount Tracker
    useEffect(() => {
        // Small timeout to allow state calculations to settle before un-flagging
        const timer = setTimeout(() => {
            isFirstRender.current = false;
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    // Initial Load
    useEffect(() => {
        if (isCartOpen && isLoggedIn) {
            loadCustomerData();
        }
    }, [isCartOpen, isLoggedIn]);

    const loadCustomerData = async (forceRefresh = false) => {
        setLoadingAddresses(true);
        try {
            const data = await customerService.getCustomerDetails(forceRefresh); // use cache if available unless forced
            if (data) {
                setCustomer(data);
                setCustomer(data);

                // Auto-fill contact info if available (don't overwrite if user has typed something)
                setContactInfo(prev => ({
                    name: data.customerName || prev.name || '',
                    email: data.customerEmailId || prev.email || '',
                    mobile: data.customerMobileNumber || prev.mobile || ''
                }));
                setAddresses(data.customerAddress || []);
                // Auto-select first address if none selected and NOT saving (saving handles its own selection)
                if (!selectedAddressId && data.customerAddress?.length > 0 && !savingAddress) {
                    setSelectedAddressId(data.customerAddress[0].customerAddressId);
                }
            }
        } catch (error) {
            toast({ variant: "destructive", description: "Failed to load addresses." });
        } finally {
            setLoadingAddresses(false);
        }
    };


    const handleSaveAddress = async () => {
        // Enforce name if Other
        if (addressLabel === 'Other' && !newAddress.addressName) {
            toast({ variant: "destructive", description: "Please enter a name for this address." });
            return;
        }

        if (!newAddress.customerRoad || !newAddress.customerCity || !newAddress.customerPin) {
            toast({ variant: "destructive", description: "Please fill in all required fields." });
            return;
        }

        setSavingAddress(true);
        try {
            // Must have customerId to create address linked to user
            if (!customer?.customerId) {
                toast({ variant: "destructive", description: "User ID missing. Try logging in again." });
                return;
            }

            const createdAddress = await customerService.createAddress({
                ...newAddress,
                customerDrNum: newAddress.customerRoad, // Duplicate road to drNum for backend compatibility
                customerId: customer.customerId
            });

            toast({ description: "Address added successfully" });

            // Force refresh to get latest data from server
            await loadCustomerData(true);

            // Auto-select the newly created address
            if (createdAddress && createdAddress.customerAddressId) {
                setSelectedAddressId(createdAddress.customerAddressId);
            }

            setView('list'); // Go back
            // Reset form
            setNewAddress({
                addressName: 'Home',
                customerRoad: '',
                customerCity: '',
                customerState: '',
                customerPin: '',
                customerDrNum: '',
                customerCountry: 'India'
            });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", description: "Failed to save address." });
        } finally {
            setSavingAddress(false);
        }
    };

    // SME Pay Polling Trigger
    useEffect(() => {
        if (showQrPopup && smePayData && timeLeft <= 280 && !isPolling) {
            setIsPolling(true);
        } else if (!showQrPopup || !smePayData) {
            setIsPolling(false);
        }
    }, [showQrPopup, smePayData, timeLeft, isPolling]);

    // SME Pay Polling Effect
    useEffect(() => {
        let pollInterval: NodeJS.Timeout;

        const checkStatus = async () => {
            if (!smePayData?.order_id) return;
            try {
                const response = await orderService.getPaymentStatus(smePayData.order_id);
                if (response === 'CONFIRMED' || response?.status === 'CONFIRMED') {
                    setSuccessOrderData({ success: true, orderId: smePayData.order_id });
                    if (customer?.customerId) {
                        orderService.getCustomerOrders(customer.customerId.toString(), true).catch(err => console.error("Cache update failed", err));
                    }
                    clearCart();
                    setView('success');
                    setContactInfo({ name: '', email: '', mobile: '' });
                    setSelectedAddressId(null);
                    setManualProof(null);
                    setSmePayData(null);
                    setShowQrPopup(false);
                    setIsPolling(false);
                } else if (response === 'FAILED' || response?.status === 'FAILED') {
                    toast({ variant: "destructive", title: "Payment Failed", description: "Your payment was not successful." });
                    setShowQrPopup(false);
                    setSmePayData(null);
                    setView('failed');
                    setTimeLeft(300);
                    setIsPolling(false);
                }
            } catch (error) {
                console.error("Failed to poll SME Pay status", error);
            }
        };

        if (isPolling) {
            checkStatus(); // Initial call
            pollInterval = setInterval(checkStatus, 5000);
        }

        return () => clearInterval(pollInterval);
    }, [isPolling, smePayData, customer?.customerId, clearCart, toast]);

    // Cashfree Polling Effect
    useEffect(() => {
        let pollInterval: NodeJS.Timeout;
        let timeoutId: NodeJS.Timeout;

        const checkStatus = async () => {
            if (!cashfreeOrderId) return;
            try {
                const response = await orderService.getPaymentStatus(cashfreeOrderId);
                if (response === 'CONFIRMED' || response?.status === 'CONFIRMED') {
                    // Forcefully remove/hide Cashfree iframe elements when polling confirms payment
                    document.body.style.pointerEvents = 'auto'; // ensure clickability is restored
                    try {
                        const iframes = document.querySelectorAll('iframe');
                        iframes.forEach(iframe => {
                            if (iframe.src.includes('cashfree') || iframe.name.includes('cashfree') || iframe.id.includes('cashfree')) {
                                const container = iframe.closest('div');
                                if (container && container.style.position === 'fixed') {
                                    container.style.display = 'none'; // hide the overlay container
                                } else {
                                    iframe.style.display = 'none';
                                }
                            }
                        });
                    } catch (e) {
                        console.error("Failed to clean up cashfree dom elements", e);
                    }

                    setSuccessOrderData({ success: true, orderId: cashfreeOrderId });
                    if (customer?.customerId) {
                        orderService.getCustomerOrders(customer.customerId.toString(), true).catch(err => console.error("Cache update failed", err));
                    }
                    clearCart();
                    setView('success');
                    setContactInfo({ name: '', email: '', mobile: '' });
                    setSelectedAddressId(null);
                    setManualProof(null);
                    setCashfreeOrderId(null);
                    setIsCashfreePolling(false);
                } else if (response === 'FAILED' || response?.status === 'FAILED') {
                    toast({ variant: "destructive", title: "Payment Failed", description: "Your payment was not successful." });
                    setCashfreeOrderId(null);
                    setView('failed');
                    setIsCashfreePolling(false);
                }
            } catch (error) {
                console.error("Failed to poll Cashfree status", error);
            }
        };

        if (isCashfreePolling && cashfreeOrderId) {
            checkStatus(); // Initial call
            pollInterval = setInterval(checkStatus, 5000);

            timeoutId = setTimeout(() => {
                if (isCashfreePolling) {
                    setIsCashfreePolling(false);
                    setCashfreeOrderId(null);
                    setView('failed');
                    toast({ variant: "destructive", title: "Payment Timeout", description: "Payment verification timed out." });
                }
            }, 300000); // 5 minutes
        }

        return () => {
            clearInterval(pollInterval);
            clearTimeout(timeoutId);
        };
    }, [isCashfreePolling, cashfreeOrderId, customer?.customerId, clearCart, toast]);

    // Razorpay Status Polling Effect
    useEffect(() => {
        let pollInterval: NodeJS.Timeout;
        let timeoutId: NodeJS.Timeout;

        const checkStatus = async () => {
            if (!razorpayOrderId) return;
            try {
                const response = await orderService.getPaymentStatus(razorpayOrderId);
                const status = typeof response === 'string' ? response : (response?.status || '');
                if (status === 'CONFIRMED' || status === 'PROCESSING') {
                    setSuccessOrderData({ success: true, orderId: razorpayOrderId });
                    if (customer?.customerId) {
                        orderService.getCustomerOrders(customer.customerId.toString(), true).catch(err => console.error("Cache update failed", err));
                    }
                    clearCart();
                    setView('success');
                    setContactInfo({ name: '', email: '', mobile: '' });
                    setSelectedAddressId(null);
                    setManualProof(null);
                    setRazorpayOrderId(null);
                    setIsRazorpayPolling(false);
                } else if (status === 'FAILED') {
                    toast({ variant: "destructive", title: "Payment Failed", description: "Your payment was not successful." });
                    setRazorpayOrderId(null);
                    setView('failed');
                    setIsRazorpayPolling(false);
                }
            } catch (error) {
                console.error("Failed to poll Razorpay status", error);
            }
        };

        if (isRazorpayPolling && razorpayOrderId) {
            checkStatus(); // Initial call
            pollInterval = setInterval(checkStatus, 4000);

            timeoutId = setTimeout(() => {
                if (isRazorpayPolling) {
                    setIsRazorpayPolling(false);
                    setRazorpayOrderId(null);
                    setView('failed');
                    toast({ variant: "destructive", title: "Payment Timeout", description: "Payment verification timed out." });
                }
            }, 300000); // 5 minutes
        }

        return () => {
            clearInterval(pollInterval);
            clearTimeout(timeoutId);
        };
    }, [isRazorpayPolling, razorpayOrderId, customer?.customerId, clearCart, toast]);

    const handleManualPayment = async () => {
        if (!selectedAddressId || !customer) {
            toast({ variant: "destructive", description: "Please select an address first." });
            return;
        }

        // Cashfree Interception
        if (companyDetails?.cashFree) {
            await executeSaveOrder(false, true);
            return;
        }

        // SME Pay Interception
        if (companyDetails?.smePay) {
            await executeSaveOrder(true, false);
            return;
        }

        // Razorpay Interception
        if (companyDetails?.razorpay) {
            await executeSaveOrder(false, false, true);
            return;
        }

        setShowQrPopup(true);
    };

    const executeSaveOrder = async (isSmePay: boolean = false, isCashFree: boolean = false, isRazorpay: boolean = false) => {
        if (!customer) return;
        setIsInitializingPayment(true);
        try {
            const minOrder = parseFloat(companyDetails?.minimumOrderCost || '0');
            const freeDeliveryThreshold = parseFloat(companyDetails?.freeDeliveryCost || '0');

            // 1. Calculate Raw Subtotal and Total Bulk Discount
            let totalBulkDiscount = 0;
            let rawSubtotal = 0;

            const processedItems = cart.map((item): SaveOrderItem => {
                // 1. Identify Product Type & Variant IDs
                let sizeId: number | null = null;
                let sizeName: string = "";
                let sizePriceAfterDiscount: number = item.priceAfterDiscount || item.price;

                // Try to match Size Pricing ID
                let productSizePrice: number | null = null;
                if (item.pricing && item.pricing.length > 0) {
                    const quantityVariant = item.selectedVariants?.['Quantity'];
                    if (quantityVariant) {
                        sizeName = quantityVariant;
                        const matchedPricing = item.pricing.find(p => p.quantity === quantityVariant);
                        if (matchedPricing) {
                            sizeId = parseInt(matchedPricing.id);
                            productSizePrice = matchedPricing.price;
                        }
                    }
                    if (!sizeId && item.pricing.length > 0) {
                        sizeId = parseInt(item.pricing[0].id);
                        sizeName = item.pricing[0].quantity;
                        productSizePrice = item.pricing[0].price;
                    }
                }

                // Calculate Item Price (Base + SizeColours)
                const sizeColoursCost = (item.selectedSizeColours || []).reduce((acc, a) => acc + a.price, 0);
                const baseUnitPrice = (item.priceAfterDiscount && item.priceAfterDiscount > 0) ? item.priceAfterDiscount : item.price;
                const finalUnitPrice = baseUnitPrice + sizeColoursCost;

                rawSubtotal += finalUnitPrice * item.quantity;

                // Calculate Bulk Discount for this specific item using pre-calculated distribution map
                let itemBulkDiscount = 0;
                const discounts = itemDiscountMap[item.cartItemId] || [];
                for (let q = 0; q < item.quantity; q++) {
                    const discountPercent = discounts[q] || 0;
                    itemBulkDiscount += finalUnitPrice * (discountPercent / 100);
                }
                totalBulkDiscount += itemBulkDiscount;

                const baseItem: SaveOrderItem = {
                    productId: parseInt(item.id),
                    productName: item.name,
                    productImage: (item.images && item.images.length > 0) ? item.images[0] : item.imageUrl,
                    productPrice: item.price,
                    productPriceAfterDiscount: item.priceAfterDiscount || item.price,
                    quantity: item.quantity,
                    totalCost: (finalUnitPrice * item.quantity) - itemBulkDiscount,
                    extraDiscount: itemBulkDiscount // Store per-unit discount
                };

                // --- Variant Specifics ---
                const productSizeColourId = (item.selectedSizeColours && item.selectedSizeColours.length > 0) ? parseInt(item.selectedSizeColours[0].id) : null;
                const productColourId = item.selectedColour ? parseInt(item.selectedColour.id) : null;

                if (productSizeColourId) {
                    const sc = item.selectedSizeColours![0];
                    baseItem.productSizeColourId = productSizeColourId;
                    baseItem.productSizeColourName = sc.name;
                    baseItem.productSizeColourImage = sc.productPics;
                    baseItem.productSizeColourExtraPrice = sc.price;
                    baseItem.productSizeId = sizeId;
                    baseItem.productSizeName = sizeName;
                    baseItem.productSizePrice = productSizePrice;
                    baseItem.productSizePriceAfterDiscount = sizePriceAfterDiscount;
                    baseItem.productImage = undefined;
                    baseItem.productPriceAfterDiscount = undefined;
                    if (sc.productPics) baseItem.productSizeColourImage = sc.productPics;
                }
                else if (sizeId) {
                    baseItem.productSizeId = sizeId;
                    baseItem.productSizeName = sizeName;
                    baseItem.productSizePrice = productSizePrice;
                    baseItem.productSizePriceAfterDiscount = sizePriceAfterDiscount;
                }
                else if (productColourId) {
                    baseItem.productColourId = productColourId;
                    baseItem.productColour = item.selectedColour!.name;
                    baseItem.productColourImage = item.selectedColour!.image;
                    if (item.selectedColour!.image) baseItem.productImage = item.selectedColour!.image;
                }

                return baseItem;
            });

            // Calculate Shipping
            const currentSubtotalWithBulk = rawSubtotal - totalBulkDiscount;
            const isFreeDelivery = freeDeliveryThreshold > 0 && currentSubtotalWithBulk >= freeDeliveryThreshold;

            const shipping = isFreeDelivery ? 0 : parseFloat(companyDetails?.deliveryCost || '0');

            // Calculate Coupon Discount
            let couponDiscountAmount = 0;
            if (couponCode && companyDetails?.companyCoupon && typeof companyDetails.companyCoupon === 'string') {
                const couponData = String(companyDetails.companyCoupon).split(',').find(c => c.startsWith(couponCode + '&&&'));
                if (couponData) {
                    const [, discountStr, minOrderStr] = String(couponData).split('&&&');
                    const discountPercent = parseFloat(discountStr || '0');
                    const minCouponOrder = parseFloat(minOrderStr || '0');
                    if (currentSubtotalWithBulk >= minCouponOrder) {
                        couponDiscountAmount = (currentSubtotalWithBulk * discountPercent) / 100;
                    }
                }
            }

            const finalTotalAmount = rawSubtotal - totalBulkDiscount - couponDiscountAmount + shipping;

            const selectedAddress = addresses.find(a => a.customerAddressId === selectedAddressId);
            if (!selectedAddress) throw new Error("Address not found");

            const payload: SaveOrderRequest = {
                companyId: companyDetails?.companyId || '',
                companyDomain: companyDetails?.companyDomain || window.location.hostname,
                customerId: customer.customerId,
                customerName: contactInfo.name,
                customerPhone: contactInfo.mobile,
                deliveryRoad: [selectedAddress.customerDrNum, selectedAddress.customerRoad].filter(Boolean).join(', '),
                deliveryPin: selectedAddress.customerPin || '',
                deliveryCity: selectedAddress.customerCity,
                deliveryState: selectedAddress.customerState,
                orderStatus: "CREATED",
                subTotal: rawSubtotal,
                allDiscount: (couponCode && couponDiscountAmount > 0) ? `applied ${couponCode} changed ${currentSubtotalWithBulk} to ${currentSubtotalWithBulk - couponDiscountAmount}` : "",
                extraDiscount: totalBulkDiscount,
                deliveryCost: isPickup ? "pickup" : String(shipping),
                finalTotalAmount: finalTotalAmount,
                paymentPic: manualProof || null,
                items: processedItems,
                waPhoneNumId: companyDetails?.waPhoneNumId,
                waToken: companyDetails?.waToken,
                waOrderTemplateName: companyDetails?.waOrderTemplateName,
                companyName: companyDetails?.companyName,
                returnUrl: typeof window !== 'undefined' ? window.location.href : '',
                manaBuyCredentials: companyDetails?.manaBuyCredentials || false
            };

            if (isSmePay) {
                const response = await orderService.createForSmePay(payload);
                setSmePayData(response);
                setShowQrPopup(true);
                return;
            }

            if (isRazorpay) {
                // Localhost payment simulation bypass (only if mock keys or no keys are configured)
                const isLocalhost = typeof window !== 'undefined' && 
                    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

                if (isLocalhost && (!companyDetails?.razorpayKeyId || companyDetails.razorpayKeyId === 'rzp_test_mock')) {
                    console.log("Dev Mode: Simulating mock Razorpay payment flow...");
                    try {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        toast({
                            title: "Payment Successful ✅ (Dev Mode)",
                            description: `Order Confirmed! Order ID: MOCK-ORDER-${Date.now()}`,
                            className: "bg-green-50 border-green-200 text-green-800 animate-in fade-in duration-300"
                        });
                        clearCart();
                        setView('success');
                        setContactInfo({ name: '', email: '', mobile: '' });
                        setSelectedAddressId(null);
                        setManualProof(null);
                    } catch (error) {
                        console.error(error);
                    } finally {
                        setIsInitializingPayment(false);
                    }
                    return;
                }

                try {
                    const response = await orderService.createForRazorpay(payload) as any;
                    let extractedOrderId = '';
                    let extractedInternalId = '';
                    let extractedAmount = Math.round(payload.finalTotalAmount * 100);
                    let extractedCurrency = 'INR';
                    
                    if (typeof response === 'string') {
                        try {
                            const parsed = JSON.parse(response);
                            extractedOrderId = parsed.id || '';
                            if (parsed.amount) extractedAmount = parsed.amount;
                            if (parsed.currency) extractedCurrency = parsed.currency;
                            if (parsed.receipt) extractedInternalId = parsed.receipt;
                        } catch (e) {
                            extractedOrderId = response;
                        }
                    } else if (response) {
                        extractedOrderId = response?.id || '';
                        if (response.amount) extractedAmount = response.amount;
                        if (response.currency) extractedCurrency = response.currency;
                        if (response.receipt) extractedInternalId = response.receipt;
                    }

                    if (extractedOrderId) {
                        if (extractedInternalId) {
                            setRazorpayOrderId(extractedInternalId);
                            setIsRazorpayPolling(true);
                        }

                        const isLoaded = await loadRazorpay();
                        if (!isLoaded) {
                            toast({ variant: "destructive", title: "Error", description: "Razorpay SDK failed to load" });
                            setIsRazorpayPolling(false);
                            setRazorpayOrderId(null);
                            return;
                        }

                        // Force pointer-events so Razorpay iframe is interactable on mobile inside radix sheet
                        const originalPointerEvents = document.body.style.pointerEvents;
                        document.body.style.setProperty('pointer-events', 'auto', 'important');
                        
                        const restorePointerEvents = () => {
                            setTimeout(() => {
                                document.body.style.pointerEvents = originalPointerEvents || '';
                            }, 300);
                        };

                        const options = {
                            key: companyDetails?.razorpayKeyId || "",
                            amount: extractedAmount,
                            currency: extractedCurrency,
                            name: companyDetails?.companyName || "",
                            order_id: extractedOrderId,
                            handler: async (response: any) => {
                                restorePointerEvents();
                                toast({ description: "Payment recorded. Verifying with server..." });
                            },
                            modal: {
                                ondismiss: function() {
                                    restorePointerEvents();
                                }
                            },
                            prefill: {
                                name: payload.customerName,
                                contact: payload.customerPhone,
                                email: contactInfo.email || ""
                            },
                            theme: {
                                color: theme?.colors?.primary ? `hsl(${theme.colors.primary})` : "#000000"
                            }
                        };
                        const rzp = new (window as any).Razorpay(options);
                        rzp.on('payment.failed', function (response: any) {
                            restorePointerEvents();
                            console.error("Razorpay Payment Error", response.error);
                            toast({ variant: "destructive", title: "Payment Error", description: response.error.description || "Payment failed" });
                            setView('failed');
                        });
                        rzp.open();
                    }
                } catch (e: any) {
                    console.error("Failed to init razorpay", e);
                    toast({ variant: "destructive", title: "Checkout Error", description: "Could not initialize payment gateway." });
                }
                return;
            }

            if (isCashFree) {
                const response = await orderService.createForCashFree(payload);
                if (response?.paymentSessionId) {
                    const cashfree = await load({ mode: "production" });
                    const checkoutOptions = {
                        paymentSessionId: response.paymentSessionId,
                        redirectTarget: "_modal",
                    };

                    // Force pointer-events so Cashfree iframe is clickable despite Radix UI Sheet
                    const originalPointerEvents = document.body.style.pointerEvents;
                    document.body.style.setProperty('pointer-events', 'auto', 'important');

                    cashfree?.checkout(checkoutOptions).then((result: any) => {
                        // Restore original pointer events
                        document.body.style.pointerEvents = originalPointerEvents;

                        if (result.error) {
                            console.error("Cashfree Payment Error", result.error);
                            toast({ variant: "destructive", title: "Payment Error", description: "Payment failed or was cancelled by user." });
                            setIsCashfreePolling(false);
                            setCashfreeOrderId(null);
                            setView('failed');
                        }
                        if (result.paymentDetails) {
                            console.log("Cashfree Payment Success", result.paymentDetails);
                            toast({ description: "Verifying payment status..." });
                            // Do not stop polling here; the background poll will catch the CONFIRMED status and redirect.
                        }
                    });

                    // Start background polling in case the modal doesn't capture the final event reliably
                    setCashfreeOrderId(response.orderId);
                    setIsCashfreePolling(true);
                }
                return;
            }

            const response = await orderService.saveOrder(payload);


            // Set success data (use response if available, or just a flag)
            setSuccessOrderData(response || { success: true });

            // Prime the cache for customer orders
            if (customer?.customerId) {
                orderService.getCustomerOrders(customer.customerId.toString(), true).catch(err => console.error("Failed to cache orders", err));
            }

            // Clear cart and move to success view
            clearCart();
            setView('success');

            // Reset other states
            setContactInfo({ name: '', email: '', mobile: '' });
            setSelectedAddressId(null);
            setManualProof(null);

        } catch (error) {
            console.error(error);
            setView('cart');
            setShowQrPopup(false);
            toast({ variant: "destructive", title: "Order Failed", description: "Stock insufficient. Please re-try" });
        } finally {
            setIsInitializingPayment(false);
        }
    };

    const handlePaymentInitialize = async () => {
        if ((!isPickup && !selectedAddressId) || !customer || !companyDetails) {
            toast({ variant: "destructive", description: "Please select an address first." });
            return;
        }

        // Razorpay Interception
        if (companyDetails?.razorpay) {
            await executeSaveOrder(false, false, true);
            return;
        }

        setShowQrPopup(true);
    };
    useEffect(() => {
        if (!companyDetails?.companyCoupon) return;

        const couponList = String(companyDetails.companyCoupon).split(',').map(cStr => {
            const [code, discountStr, minOrderStr] = String(cStr).split('&&&');
            return {
                code,
                discount: parseFloat(discountStr || '0'),
                minOrder: parseFloat(minOrderStr || '0')
            };
        });

        // Find eligible coupons
        const eligibleCoupons = couponList.filter(c => subtotal >= c.minOrder);

        // Sort by discount descending
        eligibleCoupons.sort((a, b) => b.discount - a.discount);

        const bestCoupon = eligibleCoupons[0];

        if (bestCoupon) {
            // Only apply if it's different (avoids loops)
            if (couponCode !== bestCoupon.code) {
                setCouponCode(bestCoupon.code);

                // Trigger Celebration logic
                if (!isFirstRender.current) {
                    // Small delay to ensure UI is ready
                    setTimeout(() => {
                        const end = Date.now() + 1500;
                        const colors = ['#8b5cf6', '#d946ef', '#f43f5e', '#ec4899']; // Pink/Purple theme

                        (function frame() {
                            confetti({
                                particleCount: 2,
                                angle: 60,
                                spread: 55,
                                origin: { x: 0 },
                                colors: colors,
                                zIndex: 9999
                            });
                            confetti({
                                particleCount: 2,
                                angle: 120,
                                spread: 55,
                                origin: { x: 1 },
                                colors: colors,
                                zIndex: 9999
                            });

                            if (Date.now() < end) {
                                requestAnimationFrame(frame);
                            }
                        }());
                        setShowCouponPopup(true);
                        setTimeout(() => setShowCouponPopup(false), 1500);
                    }, 500);
                }
            }
        } else {
            // If strictly enforced (no manual override allowed below threshold), clear it
            if (couponCode) {
                setCouponCode('');
            }
        }
    }, [subtotal, companyDetails?.companyCoupon, couponCode]);

    // Confetti Effect for Order Success
    useEffect(() => {
        if (view === 'success' && isCartOpen) {
            const duration = 10000; // Increased to 10s as payment redirect takes time
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                // since particles fall down, start a bit higher than random
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [view, isCartOpen]);

    const handleCheckout = async () => {
        if (!isLoggedIn) {
            setShowLoginPopup(true);
            return;
        }

        setIsCheckingOut(true);

        // 0. SKIP VALIDATION CHECK
        if (isValidated) {

            loadCustomerData();
            setView('list');
            // If we have a pending stock conflict (from chained logic), show it now?
            // Actually, Review & Continue clears it. So we are good.
            setIsCheckingOut(false);
            return;
        }


        try {
            // 1. Get Customer Details (Phone, Name)
            const { customerService } = await import('@/services/customer.service');
            const customerData = await customerService.getCustomerDetails();

            if (!customerData) {
                toast({ variant: "destructive", description: "Could not fetch user details. Please try again." });
                return;
            }

            // 2. Validate Company Details (Frontend Validation 1)
            const freshCompanyDetails = await fetchCompanyDetails(companyDetails!.companyDomain);
            if (!freshCompanyDetails) {
                toast({ variant: "destructive", description: "Failed to validate company details. Please try again." });
                return;
            }

            // 3. Construct Payload (Direct Mapping 1-to-1)
            const validationPayload: CheckoutValidationItem[] = cart.map(item => {
                let sizeId: number | null = null;
                if (item.pricing && item.pricing.length > 0) {
                    const quantityVariant = item.selectedVariants['Quantity'];
                    if (quantityVariant) {
                        const matchedPricing = item.pricing.find(p => p.quantity === quantityVariant);
                        if (matchedPricing) sizeId = parseInt(matchedPricing.id);
                    }
                    if (!sizeId && item.pricing.length > 0) sizeId = parseInt(item.pricing[0].id);
                }

                const productColourId = item.selectedColour?.id;

                return {
                    productId: parseInt(item.id),
                    sizeId: sizeId,
                    productColourId: productColourId ? parseInt(productColourId) : null,
                    productSizeColourId: item.productSizeColourId ? parseInt(item.productSizeColourId) : null
                };
            });

            // 4. Call Validation API
            const response = await validateCheckout({ items: validationPayload });

            if (!response) {
                toast({ variant: "destructive", description: "Validation failed. Please try again." });
                return;
            }

            // 5. Compare and Validate
            let blockingChanges = false;
            const changedProductIds = new Set<string>();
            interface ValidationMessage {
                message: string;
                cartItemId?: string;
            }
            const changes: ValidationMessage[] = [];
            const uniqueMessages = new Set<string>();

            const pushChange = (msg: string, cartItemId?: string) => {
                if (!uniqueMessages.has(msg)) {
                    uniqueMessages.add(msg);
                    changes.push({ message: msg, cartItemId });
                }
            };

            const newCart = cart.map(item => ({ ...item, selectedSizeColours: item.selectedSizeColours ? [...item.selectedSizeColours] : [] }));

            // Handle wrapped response (server returns { productDetails: [...] }) or direct array
            const details = Array.isArray(response) ? response : ((response as any).productDetails || []);


            // --- PHASE 1: STANDARD VALIDATION (Item-level checks & Updates) ---
            // We run this FIRST so that even if stock conflicts exist (Phase 0), price updates/syncs are captured.

            // Track used stock across iterations to handle duplicate product entries sharing the same stock
            const stockUsageMap = new Map<string, number>();

            // Stock tracking for Conflict Detection (Phase 0) - Built during Phase 1
            const stockGroups = new Map<string, CartItem[]>();
            const stockLimits = new Map<string, { limit: number, name: string }>();

            newCart.forEach((item, index) => {
                const detail = details[index];
                if (!detail) return;

                // --- STOCK METADATA GATHERING (For Phase 0) ---
                // Determine Variant/Stock Key & Limit
                let sizeId: number | null = null;
                // Try to derive sizeId if missing (Fallback logic)
                if (item.productSizeId) {
                    sizeId = parseInt(item.productSizeId);
                } else if (item.pricing && item.pricing.length > 0) {
                    const quantityVariant = item.selectedVariants?.['Quantity'];
                    if (quantityVariant) {
                        const matchedPricing = item.pricing.find(p => p.quantity === quantityVariant);
                        if (matchedPricing) sizeId = parseInt(matchedPricing.id);
                    }
                    if (!sizeId && item.pricing.length > 0) sizeId = parseInt(item.pricing[0].id);
                }


                let availableStock = 0;
                let stockKey = "";

                if (detail.productSizeColourId) {
                    availableStock = Number(detail.productSizeColourQuantity || 0);
                    stockKey = `${detail.productId}-sc-${detail.productSizeColourId}`;
                }
                else if (sizeId) {
                    // Note: If sizeId was auto-corrected in Identity Check, we use the corrected one.
                    // But we haven't done Identity Check yet!
                    // Wait, we need to do Identity Check FIRST.
                    // Let's refine the order inside the loop.
                    availableStock = Number(detail.sizeQuantity || 0);
                    stockKey = `${detail.productId}-size-${sizeId}`;
                }
                else if (detail.productColourId) {
                    availableStock = Number(detail.colourQuantityAvailable || 0);
                    stockKey = `${detail.productId}-col-${detail.productColourId}`;
                }
                else {
                    availableStock = Number(detail.productQuantityAvailable || 0);
                    stockKey = `${detail.productId}-master`;
                }
                if (isNaN(availableStock)) availableStock = 0;
                // Store limits for Phase 0 check later
                stockLimits.set(stockKey, { limit: availableStock, name: item.name });
                const group = stockGroups.get(stockKey) || [];
                group.push(item);
                stockGroups.set(stockKey, group);


                // --- 0. IDENTITY CHECK (Data Mismatch) ---
                // Re-derive keys to verify response matches request
                let checkSizeId = item.productSizeId ? parseInt(item.productSizeId) : null;
                if (!checkSizeId && item.pricing && item.pricing.length > 0) {
                    // Same logic as above, just ensuring variable consistency
                    const quantityVariant = item.selectedVariants?.['Quantity'];
                    if (quantityVariant) {
                        const matchedPricing = item.pricing.find(p => p.quantity === quantityVariant);
                        if (matchedPricing) checkSizeId = parseInt(matchedPricing.id);
                    }
                    if (!checkSizeId && item.pricing.length > 0) checkSizeId = parseInt(item.pricing[0].id);
                }

                const productColourId = item.selectedColour?.id ? parseInt(item.selectedColour.id) : null;

                // Verify IDs match (Server vs Client)
                let isIdMismatch = detail.productId !== parseInt(item.id) ||
                    (detail.productColourId !== undefined && detail.productColourId !== productColourId);

                // Smart Check for Size ID Mismatch (Auto-Recover)
                if (detail.sizeId !== undefined && detail.sizeId !== checkSizeId) {
                    const serverSizeExistsLocally = item.pricing?.some(p => parseInt(p.id) === detail.sizeId);
                    if (serverSizeExistsLocally) {
                        // Auto-correcting size ID
                        item.productSizeId = detail.sizeId.toString();
                        checkSizeId = detail.sizeId; // Update local var
                    } else {
                        isIdMismatch = true;
                    }
                }

                if (isIdMismatch) {
                    blockingChanges = true;
                    changedProductIds.add(item.id);
                    pushChange(`Critical: Data mismatch for "${item.name}". Please refresh cart.`);
                    return; // Abort further checks for this item
                }


                // --- REFACTORED STRICT VALIDATION LOGIC ---

                // CASE 1: Size Colour Variant
                if (detail.productSizeColourId !== null && detail.productSizeColourId !== undefined) {


                    // 1. Validate sizeColourName
                    if (detail.sizeColourName && item.selectedSizeColours && item.selectedSizeColours.length > 0) {
                        const matchingSc = item.selectedSizeColours.find(sc => sc.id === (detail.productSizeColourId?.toString() || item.productSizeColourId));
                        if (matchingSc && matchingSc.name !== detail.sizeColourName) {
                            blockingChanges = true;
                            changedProductIds.add(item.id);
                            pushChange(`Variant name for "${item.name}" changed (Server: ${detail.sizeColourName}, Cart: ${matchingSc.name}).`);
                        }
                    }

                    // 2. Validate colourExtraPrice
                    if (detail.colourExtraPrice !== undefined && detail.colourExtraPrice !== null) {
                        if (item.selectedSizeColours) {
                            item.selectedSizeColours.forEach(sc => {
                                if (sc.id === (detail.productSizeColourId?.toString() || item.productSizeColourId)) {
                                    if (sc.price !== detail.colourExtraPrice) {
                                        blockingChanges = true;
                                        changedProductIds.add(item.id);
                                        pushChange(`Extra price for "${sc.name}" updated from ₹${sc.price} to ₹${detail.colourExtraPrice}.`, item.cartItemId);
                                        sc.price = detail.colourExtraPrice;
                                    }
                                }
                            });
                        }
                    }


                    // 1.5 Validate Prices (Base Size Price) for Complex Variant
                    // Complex items have a Base Price (Size) + Extra Price (Colour). This checks the Base Price.
                    let serverSizePrice = parseFloat((detail.productSizePrice || 0).toString());
                    let resolvedPrice = parseFloat((detail.productSizePriceAfterDiscount || 0).toString());

                    // Fallback to local pricing ONLY if server logic lacks data
                    if ((isNaN(serverSizePrice) || serverSizePrice <= 0) && item.pricing && item.pricing.length > 0) {
                        const matchedVariant = item.pricing.find(p => p.id === (item.productSizeId || checkSizeId?.toString()));
                        if (matchedVariant) {
                            serverSizePrice = parseFloat(matchedVariant.price.toString());
                            resolvedPrice = parseFloat((matchedVariant.priceAfterDiscount || 0).toString());
                        }
                    }

                    // Fallback logic for discount
                    if ((isNaN(resolvedPrice) || resolvedPrice <= 0) && detail.productOffer && serverSizePrice > 0) {
                        const match = detail.productOffer.match(/(\d+)\s*%?|(\d+)\s*OFF/i);
                        if (match) {
                            const percent = parseFloat(match[1] || match[2]);
                            if (!isNaN(percent)) {
                                const discountVal = (serverSizePrice * percent) / 100;
                                resolvedPrice = Math.round(serverSizePrice - discountVal);
                            }
                        }
                    }
                    if (isNaN(resolvedPrice) || resolvedPrice <= 0) resolvedPrice = serverSizePrice;

                    if (resolvedPrice > 0) {
                        const previousEffective = item.priceAfterDiscount || item.price;

                        // Sync Base Price
                        if (serverSizePrice > 0 && item.price !== serverSizePrice) {

                            item.price = serverSizePrice;
                        }

                        // Sync Effective Price
                        if (item.priceAfterDiscount !== resolvedPrice) {
                            if (previousEffective !== resolvedPrice) {
                                blockingChanges = true;
                                changedProductIds.add(item.id);
                                pushChange(`Price for "${item.name}" (${detail.productSize ? detail.productSize + ' - ' : ''}${detail.sizeColourName}) updated from ₹${previousEffective} to ₹${resolvedPrice}.`, item.cartItemId);
                            }
                            item.priceAfterDiscount = resolvedPrice;
                        }
                    }

                    if (detail.productSizeColourQuantity !== null && detail.productSizeColourQuantity !== undefined) {
                        const scLimit = Number(detail.productSizeColourQuantity);
                        const scKey = `${detail.productId}-sc-${detail.productSizeColourId}`;
                        const scConsumed = stockUsageMap.get(scKey) || 0;
                        const remainingSc = scLimit - scConsumed;

                        if (!isNaN(scLimit)) {
                            if (item.quantity > remainingSc) {
                                blockingChanges = true;
                                if (remainingSc <= 0) {
                                    changedProductIds.add(item.id);
                                    pushChange(`"${item.name}" (${detail.productSize ? detail.productSize + ' - ' : ''}${detail.sizeColourName}) is out of stock and has been removed.`);
                                    item.cartItemId = 'REMOVE_ME';
                                } else {
                                    pushChange(`"${item.name}" (${detail.productSize ? detail.productSize + ' - ' : ''}${detail.sizeColourName}) quantity updated to available stock: ${remainingSc}.`, item.cartItemId);
                                    item.quantity = remainingSc;
                                    stockUsageMap.set(scKey, scConsumed + item.quantity);
                                }
                            } else {
                                stockUsageMap.set(scKey, scConsumed + item.quantity);
                            }
                        }
                    }

                    // 4. Validate sizeColourStatus
                    if (detail.sizeColourStatus && detail.sizeColourStatus !== 'ACTIVE') {
                        blockingChanges = true;
                        changedProductIds.add(item.id);
                        pushChange(`"${item.name}" (${detail.productSize ? detail.productSize + ' - ' : ''}${detail.sizeColourName}) is currently unavailable and has been removed.`);
                        item.cartItemId = 'REMOVE_ME';
                        return;
                    }

                }
                // CASE 2: Size Variant (but NO Size Colour)
                else if (detail.sizeId !== null && detail.sizeId !== undefined && (detail.productSizeColourId === null || detail.productSizeColourId === undefined)) {


                    // 1. Validate sizeStatus
                    if (detail.sizeStatus && detail.sizeStatus !== 'ACTIVE') {
                        blockingChanges = true;
                        changedProductIds.add(item.id);
                        pushChange(`"${item.name}" (${detail.productSize}) is currently unavailable and has been removed.`);
                        item.cartItemId = 'REMOVE_ME';
                        return;
                    }

                    // 2. Validate productSize (Name)
                    if (detail.productSize && item.selectedVariants && item.selectedVariants['Quantity']) {
                        const serverSize = detail.productSize.trim().toLowerCase();
                        const cartSize = item.selectedVariants['Quantity'].trim().toLowerCase();
                        if (serverSize !== cartSize && serverSize !== "" && cartSize !== "") {
                            blockingChanges = true;
                            changedProductIds.add(item.id);
                            pushChange(`Size label mismatch for "${item.name}" (Server: ${detail.productSize}, Cart: ${item.selectedVariants['Quantity']}). Removed.`);
                            item.cartItemId = 'REMOVE_ME';
                            return;
                        }
                    }

                    // 3. Validate Prices (productSizePrice, productSizePriceAfterDiscount)
                    let serverSizePrice = parseFloat((detail.productSizePrice || 0).toString());
                    let resolvedPrice = parseFloat((detail.productSizePriceAfterDiscount || 0).toString());

                    // Fallback to local pricing ONLY if server logic lacks data (Server is Truth)
                    if ((isNaN(serverSizePrice) || serverSizePrice <= 0) && item.pricing && item.pricing.length > 0) {
                        const matchedVariant = item.pricing.find(p => p.id === (item.productSizeId || checkSizeId?.toString()));
                        if (matchedVariant) {
                            serverSizePrice = parseFloat(matchedVariant.price.toString());
                            resolvedPrice = parseFloat((matchedVariant.priceAfterDiscount || 0).toString());
                        }
                    }

                    // Fallback logic for discount (only if resolvedPrice is still missing)
                    if ((isNaN(resolvedPrice) || resolvedPrice <= 0) && detail.productOffer && serverSizePrice > 0) {
                        const match = detail.productOffer.match(/(\d+)\s*%?|(\d+)\s*OFF/i);
                        if (match) {
                            const percent = parseFloat(match[1] || match[2]);
                            if (!isNaN(percent)) {
                                const discountVal = (serverSizePrice * percent) / 100;
                                resolvedPrice = Math.round(serverSizePrice - discountVal);
                            }
                        }
                    }
                    if (isNaN(resolvedPrice) || resolvedPrice <= 0) resolvedPrice = serverSizePrice;

                    // Log for debugging


                    // FORCE UPDATE Strict Validation
                    if (resolvedPrice > 0) {
                        const previousEffective = item.priceAfterDiscount || item.price;

                        // 1. Sync Base Price (Silent unless it creates a visual anomaly we handle elsewhere)
                        // This ensures the "strikethrough" price is correct.
                        if (serverSizePrice > 0 && item.price !== serverSizePrice) {

                            item.price = serverSizePrice;
                        }

                        // 2. Sync Effective Price (The Price User Pays)
                        // If item.priceAfterDiscount differs from resolvedPrice (or is missing), we MUST update it.
                        if (item.priceAfterDiscount !== resolvedPrice) {

                            // Only block/notify if the EFFECTIVE price changes for the user
                            if (previousEffective !== resolvedPrice) {
                                blockingChanges = true;
                                changedProductIds.add(item.id);
                                pushChange(`Price for "${item.name}" (${detail.productSize}) updated from ₹${previousEffective} to ₹${resolvedPrice}.`, item.cartItemId);
                            } else {

                            }
                            // Always apply the correct discount value
                            item.priceAfterDiscount = resolvedPrice;
                        }
                    }


                    // 4. Validate sizeQuantity (Stock)
                    if (detail.sizeQuantity !== null && detail.sizeQuantity !== undefined) {
                        const szLimit = Number(detail.sizeQuantity);
                        const szKey = `${detail.productId}-sz-${detail.sizeId}`;
                        const szConsumed = stockUsageMap.get(szKey) || 0;
                        const remainingSz = szLimit - szConsumed;

                        if (!isNaN(szLimit)) {
                            if (item.quantity > remainingSz) {
                                blockingChanges = true;
                                if (remainingSz <= 0) {
                                    changedProductIds.add(item.id);
                                    pushChange(`"${item.name}" (${detail.productSize}) is out of stock and has been removed.`);
                                    item.cartItemId = 'REMOVE_ME';
                                } else {
                                    pushChange(`"${item.name}" (${detail.productSize}) quantity updated to available stock: ${remainingSz}.`, item.cartItemId);
                                    item.quantity = remainingSz;
                                    stockUsageMap.set(szKey, szConsumed + item.quantity);
                                }
                            } else {
                                stockUsageMap.set(szKey, szConsumed + item.quantity);
                            }
                        }
                    }
                }
                // CASE 3: Product Colour Variant (NO Size)
                else if (detail.productColourId !== null && detail.productColourId !== undefined && (detail.sizeId === null || detail.sizeId === undefined)) {


                    // 1. Validate colourStatus
                    if (detail.colourStatus && detail.colourStatus !== 'ACTIVE') {
                        blockingChanges = true;
                        changedProductIds.add(item.id);
                        pushChange(`"${item.name}" (${detail.colour}) is currently unavailable and has been removed.`);
                        item.cartItemId = 'REMOVE_ME';
                        return;
                    }

                    // 2. Validate colour (Name)
                    if (detail.colour && item.selectedColour?.name) {
                        const serverColor = detail.colour.trim().toLowerCase();
                        const cartColor = item.selectedColour.name.trim().toLowerCase();
                        if (serverColor !== cartColor) {
                            blockingChanges = true;
                            changedProductIds.add(item.id);
                            pushChange(`Colour mismatch for "${item.name}" (Server: ${detail.colour}, Cart: ${item.selectedColour.name}). Removed.`);
                            item.cartItemId = 'REMOVE_ME';
                            return;
                        }
                    }

                    // 3. Validate Prices
                    const serverProdPrice = parseFloat((detail.productPrice || 0).toString());
                    let resolvedProdPrice = parseFloat((detail.productPriceAfterDiscount || 0).toString());

                    // Fallback logic for discount
                    if ((isNaN(resolvedProdPrice) || resolvedProdPrice <= 0) && detail.productOffer && serverProdPrice > 0) {
                        const match = detail.productOffer.match(/(\d+)\s*%?|(\d+)\s*OFF/i);
                        if (match) {
                            const percent = parseFloat(match[1] || match[2]);
                            if (!isNaN(percent)) {
                                const discountVal = (serverProdPrice * percent) / 100;
                                resolvedProdPrice = Math.round(serverProdPrice - discountVal);
                            }
                        }
                    }
                    if (isNaN(resolvedProdPrice) || resolvedProdPrice <= 0) resolvedProdPrice = serverProdPrice;

                    // Log for debugging


                    if (resolvedProdPrice > 0) {
                        const previousEffective = item.priceAfterDiscount || item.price;

                        // 1. Sync Base Price (Silent)
                        if (serverProdPrice > 0 && item.price !== serverProdPrice) {

                            item.price = serverProdPrice;
                        }

                        // 2. Sync Effective Price
                        if (item.priceAfterDiscount !== resolvedProdPrice) {
                            if (previousEffective !== resolvedProdPrice) {
                                blockingChanges = true;
                                changedProductIds.add(item.id);
                                pushChange(`Price for "${item.name}" (${detail.colour}) updated from ₹${previousEffective} to ₹${resolvedProdPrice}.`, item.cartItemId);
                            } else {

                            }
                            item.priceAfterDiscount = resolvedProdPrice;
                        }
                    }

                    // 4. Validate colourQuantityAvailable
                    if (detail.colourQuantityAvailable !== null && detail.colourQuantityAvailable !== undefined) {
                        const colLimit = Number(detail.colourQuantityAvailable);
                        const colKey = `${detail.productId}-col-${detail.productColourId}`;
                        const colConsumed = stockUsageMap.get(colKey) || 0;
                        const remainingCol = colLimit - colConsumed;

                        if (!isNaN(colLimit)) {
                            if (item.quantity > remainingCol) {
                                blockingChanges = true;
                                if (remainingCol <= 0) {
                                    changedProductIds.add(item.id);
                                    pushChange(`"${item.name}" (${detail.colour}) is out of stock and has been removed.`);
                                    item.cartItemId = 'REMOVE_ME';
                                } else {
                                    pushChange(`"${item.name}" (${detail.colour}) quantity updated to available stock: ${remainingCol}.`, item.cartItemId);
                                    item.quantity = remainingCol;
                                    stockUsageMap.set(colKey, colConsumed + item.quantity);
                                }
                            } else {
                                stockUsageMap.set(colKey, colConsumed + item.quantity);
                            }
                        }
                    }
                }
                // CASE 4: Product Only (No Size, No Colour)
                else if (detail.productId !== null && detail.productId !== undefined) {


                    // 1. Validate Prices
                    const serverProdPrice = parseFloat((detail.productPrice || 0).toString());
                    let resolvedProdPrice = parseFloat((detail.productPriceAfterDiscount || 0).toString());

                    if ((isNaN(resolvedProdPrice) || resolvedProdPrice <= 0) && detail.productOffer && serverProdPrice > 0) {
                        const match = detail.productOffer.match(/(\d+)\s*%?|(\d+)\s*OFF/i);
                        if (match) {
                            const percent = parseFloat(match[1] || match[2]);
                            if (!isNaN(percent)) {
                                const discountVal = (serverProdPrice * percent) / 100;
                                resolvedProdPrice = Math.round(serverProdPrice - discountVal);
                            }
                        }
                    }
                    if (isNaN(resolvedProdPrice) || resolvedProdPrice <= 0) resolvedProdPrice = serverProdPrice;

                    // Log for debugging


                    if (resolvedProdPrice > 0) {
                        const previousEffective = item.priceAfterDiscount || item.price;

                        // 1. Sync Base Price (Silent)
                        if (serverProdPrice > 0 && item.price !== serverProdPrice) {

                            item.price = serverProdPrice;
                        }

                        // 2. Sync Effective Price
                        if (item.priceAfterDiscount !== resolvedProdPrice) {
                            if (previousEffective !== resolvedProdPrice) {
                                blockingChanges = true;
                                changedProductIds.add(item.id);
                                pushChange(`Price for "${item.name}" updated from ₹${previousEffective} to ₹${resolvedProdPrice}.`, item.cartItemId);
                            } else {

                            }
                            item.priceAfterDiscount = resolvedProdPrice;
                        }
                    }

                    // 2. Validate productQuantityAvailable
                    if (detail.productQuantityAvailable !== null && detail.productQuantityAvailable !== undefined) {
                        const prodLimit = Number(detail.productQuantityAvailable);
                        const prodKey = `${detail.productId}-master`; // Shared master stock
                        const prodConsumed = stockUsageMap.get(prodKey) || 0;
                        const remainingProd = prodLimit - prodConsumed;

                        if (!isNaN(prodLimit)) {
                            if (item.quantity > remainingProd) {
                                blockingChanges = true;
                                if (remainingProd <= 0) {
                                    changedProductIds.add(item.id);
                                    pushChange(`"${item.name}" is out of stock and has been removed.`);
                                    item.cartItemId = 'REMOVE_ME';
                                } else {
                                    pushChange(`"${item.name}" quantity updated to available stock: ${remainingProd}.`, item.cartItemId);
                                    item.quantity = remainingProd;
                                    stockUsageMap.set(prodKey, prodConsumed + item.quantity);
                                }
                            } else {
                                stockUsageMap.set(prodKey, prodConsumed + item.quantity);
                            }
                        }
                    }
                }


                if (item.cartItemId === 'REMOVE_ME') return;


                // --- GLOBAL VALIDATIONS (ALL CASES) ---

                // 1. Validate productStatus
                if (detail.productStatus !== 'ACTIVE') {
                    blockingChanges = true;
                    changedProductIds.add(item.id);
                    pushChange(`"${item.name}" is currently unavailable (Product Inactive) and has been removed.`);
                    item.cartItemId = 'REMOVE_ME';
                    return;
                }

                // 2. Validate productOffer
                if (item.productOffer !== detail.productOffer) {
                    const oldOffer = item.productOffer;
                    item.productOffer = detail.productOffer;
                    if (oldOffer !== detail.productOffer) {
                        blockingChanges = true;
                        changedProductIds.add(item.id);
                        if (!detail.productOffer) {
                            pushChange(`Sorry, the offer for "${item.name}" has expired.`, item.cartItemId);
                        } else {
                            pushChange(`Offer for "${item.name}" updated: ${detail.productOffer}`, item.cartItemId);
                        }
                    }
                }

                // 3. Validate multipleSetDiscount
                const normalizeDiscount = (s: string | null | undefined) => {
                    if (!s) return "";
                    return String(s).split('&&&').sort().join('&&&');
                };

                const cartSetDiscount = normalizeDiscount(item.multipleSetDiscount);
                const serverSetDiscount = normalizeDiscount(detail.multipleSetDiscount);

                // Helper: Get description of the BEST rule currently active (Copied for scope)
                const getActiveRuleDescription = (rule: string, qty: number) => {
                    if (!rule || qty <= 0) return null;
                    const segments = String(rule).split('&&&');
                    let bestParams: { t: number, p: number } | null = null;
                    for (const seg of segments) {
                        const [thresholdStr, percentStr] = String(seg).split('-');
                        const threshold = parseFloat(thresholdStr);
                        const percent = parseFloat(percentStr);
                        if (!isNaN(threshold) && !isNaN(percent) && qty >= threshold) {
                            if (!bestParams || threshold > bestParams.t) {
                                bestParams = { t: threshold, p: percent };
                            }
                        }
                    }
                    if (bestParams) return `Buy ${bestParams.t} Get ${bestParams.p}% Off`;
                    return null;
                };

                if (cartSetDiscount !== serverSetDiscount) {
                    const totalQty = productQuantities[item.id] || item.quantity;
                    const activeRuleDesc = getActiveRuleDescription(item.multipleSetDiscount || "", totalQty);
                    const newActiveRuleDesc = getActiveRuleDescription(detail.multipleSetDiscount, totalQty);

                    if (activeRuleDesc) {
                        if (activeRuleDesc === newActiveRuleDesc) {
                            // Do nothing
                        } else {
                            blockingChanges = true;
                            changedProductIds.add(item.id);
                            pushChange(`Selected discount (${activeRuleDesc}) is removed/updated.`, item.cartItemId);
                        }
                    }
                    item.multipleSetDiscount = detail.multipleSetDiscount;
                }

                // 4. Validate multipleDiscountMoreThan
                const cartMoreThan = (item.multipleDiscountMoreThan || "").trim();
                const serverMoreThan = (detail.multipleDiscountMoreThan || "").trim();

                const isUsingMoreThan = (rule: string, qty: number) => {
                    if (!rule || qty <= 0) return false;
                    const [thresholdStr] = String(rule).split('-');
                    const threshold = parseFloat(thresholdStr);
                    return !isNaN(threshold) && qty > threshold;
                };

                if (cartMoreThan !== serverMoreThan) {
                    const totalQty = productQuantities[item.id] || item.quantity;
                    const wasUsing = isUsingMoreThan(item.multipleDiscountMoreThan || "", totalQty);

                    if (wasUsing) {
                        blockingChanges = true;
                        changedProductIds.add(item.id);
                        if (!serverMoreThan) {
                            pushChange(`Special bulk offer for "${item.name}" has been removed.`, item.cartItemId);
                        } else {
                            pushChange(`Special bulk offer for "${item.name}" has been updated.`, item.cartItemId);
                        }
                    }
                    item.multipleDiscountMoreThan = detail.multipleDiscountMoreThan;
                }
            });

            // --- PHASE 0 CHECK: CONFLICT RESOLUTION ---
            // We do this AFTER Phase 1 so we have the updated stock limits and prices
            const currentConflicts: StockConflict[] = [];
            stockGroups.forEach((items, key) => {
                const limitInfo = stockLimits.get(key);
                if (!limitInfo) return;
                const totalRequested = items.reduce((sum, it) => sum + it.quantity, 0);

                // If total demand exceeds limit, this is a conflict user must resolve manually
                if (totalRequested > limitInfo.limit) {
                    // Create deep copies for popup editing
                    const itemCopies = items.map(i => ({ ...i }));
                    currentConflicts.push({
                        stockKey: key,
                        productName: limitInfo.name,
                        availableStock: limitInfo.limit,
                        items: itemCopies,
                        totalRequested: totalRequested
                    });
                }
            });

            if (currentConflicts.length > 0) {
                // CHAINED POPUP LOGIC:
                // If we also have Price Updates (blockingChanges), we prioritize showing the Price Popup first.
                // We defer the Stock Conflict popup to Step 2 (after user accepts price changes).
                if (blockingChanges) {

                    setPendingStockConflicts(currentConflicts);
                    // We DO NOT return here. We allow the function to proceed to 'setValidationErrors' (Price Popup).
                } else {
                    // Only Stock Conflicts -> Show immediately
                    setStockConflicts(currentConflicts);
                    setShowConflictPopup(true);
                    setIsCheckingOut(false);
                    return; // HALT VALIDATION
                }
            }

            // --- PHASE 1.5: COUPON VALIDATION ---
            if (couponCode) {
                const couponsList = freshCompanyDetails.companyCoupon ? String(freshCompanyDetails.companyCoupon).split(',') : [];
                const isStillValid = couponsList.some(c => c.startsWith(couponCode + '&&&'));
                if (!isStillValid) {
                    blockingChanges = true;
                    pushChange(`The coupon "${couponCode}" is no longer available and has been removed from your order.`);
                    setCouponCode('');
                    if (typeof setExtraDiscount === 'function') setExtraDiscount(0);
                }
            }

            // --- PHASE 1.6: SHIPPING VALIDATION ---
            const oldThreshold = companyDetails?.freeDeliveryCost ? parseFloat(companyDetails.freeDeliveryCost) : 0;
            const newThreshold = freshCompanyDetails?.freeDeliveryCost ? parseFloat(freshCompanyDetails.freeDeliveryCost) : 0;
            const wasEligible = oldThreshold > 0 && subtotal >= oldThreshold;
            const isNowEligible = newThreshold > 0 && subtotal >= newThreshold;

            if (wasEligible && !isNowEligible) {
                blockingChanges = true;
                const shippingCost = (newThreshold <= 0 && freshCompanyDetails?.deliveryCost) ? parseFloat(freshCompanyDetails.deliveryCost) : (freshCompanyDetails?.deliveryBetween ? parseFloat(freshCompanyDetails.deliveryBetween) : 40);
                if (newThreshold <= 0) {
                    pushChange(`Free delivery is no longer available. A shipping charge of ₹${shippingCost} has been added to your order.`);
                } else {
                    pushChange(`The free delivery threshold has increased to ₹${newThreshold}. A shipping charge of ₹${shippingCost} has been added to your order.`);
                }
            }

            const finalCart = newCart.filter(item => item.cartItemId !== 'REMOVE_ME');

            // --- SYNC PRODUCTS GLOBALLY ---
            // ONLY sync products that actually had changes detected during validation
            const productsToSyncCount = changedProductIds.size;
            if (productsToSyncCount > 0) {

                Promise.all(Array.from(changedProductIds).map(async (pid) => {
                    const freshProd = await fetchProductDetails(pid);
                    if (freshProd) {
                        useProduct.getState().syncProductGlobally(freshProd);
                    }
                })).catch(err => console.error("Global sync failed", err));
            }

            // Always update cart and company details to reflect latest server data (silent updates included)
            useCart.setState({
                cart: finalCart,
                companyDetails: freshCompanyDetails
            });

            if (blockingChanges && changes.length > 0) {
                setValidationErrors(changes);

                setValidatedCart(newCart);
                setShowValidationPopup(true);
            } else {
                // All Good -> Switch to Address Selection
                loadCustomerData();
                setView('list');
            }

        } catch (error) {
            console.error("Checkout validation failed", error);
            toast({ variant: "destructive", description: "Something went wrong. Please try again.", duration: 2000 });
        } finally {
            setIsCheckingOut(false);
        }
    };


    // Free Delivery Celebration
    useEffect(() => {
        // If already eligible on first render, mark as celebrated silently
        if (isFreeDelivery && isFirstRender.current) {
            setCelebrated(true);
            return;
        }

        if (isFreeDelivery && !celebrated && isCartOpen && !isFirstRender.current) {
            const end = Date.now() + 1500;
            const colors = ['#10B981', '#34D399', '#6EE7B7', '#FFD700'];

            (function frame() {
                confetti({
                    particleCount: 2,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: colors,
                    zIndex: 9999
                });
                confetti({
                    particleCount: 2,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: colors,
                    zIndex: 9999
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
            setCelebrated(true);
            setShowFreeDeliveryPopup(true);
            setTimeout(() => setShowFreeDeliveryPopup(false), 1500);
        } else if (!isFreeDelivery && celebrated) {
            setCelebrated(false);
        }
    }, [isFreeDelivery, celebrated, isCartOpen]);

    return (
        <Sheet open={isCartOpen} onOpenChange={(open) => {
            setCartOpen(open);
            // If closing, reset view to cart after animation
            if (!open) {
                setTimeout(() => setView('cart'), 300);
            }
        }}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent
                onInteractOutside={(e) => {
                    // Prevent closing if we are in the payment screen
                    if (view === 'payment') {
                        e.preventDefault();
                    }
                }}
                className="w-full sm:max-w-md h-[100dvh] flex flex-col p-0 gap-0 border-l border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 shadow-2xl">

                {/* Coupon Unlocked Popup Overlay */}
                {showCouponPopup && (
                    <div className="absolute inset-x-4 top-1/4 z-[100] animate-in zoom-in-95 fade-in slide-in-from-bottom-10 duration-500 pointer-events-none">
                        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-primary-foreground p-6 rounded-3xl shadow-2xl relative overflow-hidden border border-white/20 pointer-events-auto">
                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-background/20 rounded-full blur-2xl" />
                            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black/10 rounded-full blur-xl" />

                            <div className="flex flex-col items-center text-center relative z-10">
                                <div className="w-14 h-14 bg-background/20 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm shadow-inner">
                                    <Tag className="w-7 h-7 text-primary-foreground animate-bounce" />
                                </div>
                                <h3 className="text-2xl font-bold mb-1 tracking-tight">Coupon Applied!</h3>
                                <p className="text-primary-foreground/90 text-sm font-medium">You saved money with <span className="font-bold underline decoration-wavy decoration-white/50 underline-offset-4">{couponCode}</span></p>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 text-primary-foreground/60 hover:text-primary-foreground hover:bg-background/10 rounded-full h-8 w-8"
                                onClick={() => setShowCouponPopup(false)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Default QR Payment Popup Overlay (Static/Razorpay Fallback) */}
                {showQrPopup && !smePayData && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                        <div className="w-full max-w-sm bg-background/90 backdrop-blur-2xl rounded-[32px] overflow-hidden shadow-2xl border border-white/50 relative animate-in zoom-in-95 slide-in-from-bottom-5 duration-500 my-auto max-h-[90vh] flex flex-col">

                            {/* Premium Gradient Header */}
                            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 opacity-100 shadow-[inset_0_-40px_40px_-20px_rgba(255,255,255,0.1)]" />
                            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-background/20 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute top-24 left-0 -ml-10 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-4 right-4 text-primary-foreground/90 hover:text-primary-foreground hover:bg-background/20 rounded-full z-30 backdrop-blur-md border border-white/10"
                                onClick={() => setShowExitConfirmation(true)}
                            >
                                <X className="w-5 h-5" />
                            </Button>

                            <div className="relative flex-1 overflow-y-auto custom-scrollbar pt-8 pb-8 px-6 flex flex-col items-center">

                                {/* Header Section */}
                                <div className="text-center mb-6 w-full animate-in slide-in-from-top-4 duration-500">
                                    <div className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-full mb-3 shadow-sm">
                                        <div className="w-12 h-12 relative">
                                            <Image
                                                src={companyDetails?.logo || "/placeholder.png"}
                                                alt="Logo"
                                                fill
                                                className="object-cover rounded-full"
                                            />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black text-foreground tracking-tight font-headline">
                                        Payment Options
                                    </h3>
                                    <p className="text-xs font-medium text-muted-foreground/60 mt-1">
                                        Choose how you'd like to pay
                                    </p>
                                </div>

                                {/* TOTAL AMOUNT DISPLAY */}
                                <div className="w-full bg-secondary/30 border border-secondary/30 rounded-2xl p-4 mb-6 flex flex-col items-center justify-center shadow-sm">
                                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-1">Total Amount</span>
                                    <span className="text-3xl font-black text-foreground font-headline">
                                        {formatCurrency(finalTotal - extraDiscount)}
                                    </span>
                                </div>

                                {/* -------- PAYMENT OPTIONS UI -------- */}
                                <div className="space-y-4">

                                    {/* Timer & Total Badge */}
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/60">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                            </span>
                                            Expires in:
                                            <span className="font-mono text-orange-600 tabular-nums">{formatTime(timeLeft)}</span>
                                        </div>
                                        <div className="text-xs font-bold bg-secondary/50 text-muted-foreground/80 px-2 py-1 rounded-md border border-border">
                                            Total: {formatCurrency(finalTotal)}
                                        </div>
                                    </div>

                                    {/* SELECTION TABS (Radio Style) */}
                                    <div className="grid grid-cols-2 p-1 bg-secondary/50/80 rounded-2xl border border-border">
                                        <button
                                            onClick={() => setPaymentTab('qr')}
                                            className={cn(
                                                "relative z-10 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2",
                                                paymentTab === 'qr'
                                                    ? "bg-background text-foreground/90 shadow-sm ring-1 ring-black/5"
                                                    : "text-muted-foreground/60 hover:text-muted-foreground"
                                            )}
                                        >
                                            <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
                                                {paymentTab === 'qr' && <div className="w-2 h-2 rounded-full bg-current" />}
                                            </div>
                                            Scanner
                                        </button>
                                        <button
                                            onClick={() => setPaymentTab('upi')}
                                            className={cn(
                                                "relative z-10 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2",
                                                paymentTab === 'upi'
                                                    ? "bg-background text-foreground/90 shadow-sm ring-1 ring-black/5"
                                                    : "text-muted-foreground/60 hover:text-muted-foreground"
                                            )}
                                        >
                                            <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
                                                {paymentTab === 'upi' && <div className="w-2 h-2 rounded-full bg-current" />}
                                            </div>
                                            UPI Apps
                                        </button>
                                    </div>


                                    {/* CONTENT AREA */}
                                    <div className="bg-background rounded-3xl p-4 border border-secondary/30 shadow-xl shadow-slate-200/40 relative overflow-hidden min-h-[300px] flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
                                        {/* Background Decor */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />


                                        {/* MODE: SCANNER */}
                                        {paymentTab === 'qr' && (
                                            <div className="relative z-10 w-full flex flex-col items-center animate-in fade-in slide-in-from-left-4 duration-300">
                                                <div className="relative aspect-square w-48 overflow-hidden rounded-2xl bg-background border-4 border-slate-50 shadow-inner p-2 mb-4 group">
                                                    <Image
                                                        src={companyDetails?.upiQrCode || "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"}
                                                        alt="UPI QR Code"
                                                        fill
                                                        className="object-contain"
                                                    />
                                                    {/* Scan Line Animation */}
                                                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-[scan_2s_ease-in-out_infinite] opacity-60" />
                                                </div>
                                                <div className="flex items-center gap-2 bg-secondary/30/80 backdrop-blur px-4 py-2 rounded-full border border-secondary/30 mb-2">
                                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                    <span className="text-[10px] font-bold text-muted-foreground/80 tracking-wide select-all">
                                                        {companyDetails?.upiId || "No UPI ID"}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground/40 font-medium">Scan with any UPI App</p>
                                            </div>
                                        )}


                                        {/* MODE: UPI APPS */}
                                        {paymentTab === 'upi' && (
                                            <div className="relative z-10 w-full space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                                                <div className="text-center mb-4">
                                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-2 text-indigo-600">
                                                        <CreditCard className="w-6 h-6" />
                                                    </div>
                                                    <h4 className="text-sm font-bold text-muted-foreground">Pay via App</h4>
                                                    <p className="text-[10px] text-muted-foreground/40">Select your preferred app</p>
                                                </div>

                                                <a
                                                    href={`phonepe://pay?pa=${companyDetails?.upiId}&pn=${encodeURIComponent(companyDetails?.companyName || '')}&am=${(finalTotal - extraDiscount).toFixed(2)}&tr=${Date.now()}&tn=Order-${Date.now()}&cu=INR`}
                                                    className="flex items-center gap-3 w-full bg-[#5f259f] hover:bg-[#5f259f]/90 text-primary-foreground p-3 rounded-2xl shadow-lg shadow-purple-200 transition-transform active:scale-95 relative overflow-hidden group"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                                    <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                                                        <span className="text-[#5f259f] font-bold text-xs">Pe</span>
                                                    </div>
                                                    <div className="flex-1 text-left">
                                                        <span className="block text-sm font-bold">PhonePe</span>
                                                        <span className="text-[10px] opacity-80">Tap to pay</span>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 opacity-60" />
                                                </a>

                                                <a
                                                    href={`tez://upi/pay?pa=${companyDetails?.upiId}&pn=${encodeURIComponent(companyDetails?.companyName || '')}&am=${(finalTotal - extraDiscount).toFixed(2)}&tr=${Date.now()}&tn=Order-${Date.now()}&cu=INR`}
                                                    className="flex items-center gap-3 w-full bg-background hover:bg-secondary/30 text-foreground/90 p-3 rounded-2xl shadow-lg shadow-slate-100 border border-secondary/30 transition-transform active:scale-95 group relative overflow-hidden"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                                    <div className="w-10 h-10 bg-background border border-secondary/30 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                                                        <span className="text-muted-foreground font-bold text-xs">GPay</span>
                                                    </div>
                                                    <div className="flex-1 text-left">
                                                        <span className="block text-sm font-bold text-muted-foreground">Google Pay</span>
                                                        <span className="text-[10px] text-muted-foreground/40">Tap to pay</span>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/60" />
                                                </a>


                                            </div>
                                        )}
                                    </div>

                                    {/* UTR / Reference Input - Always Visible */}
                                    <div className="bg-secondary/30/80 rounded-2xl p-4 border border-border/60 backdrop-blur-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <Label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                                                <Tag className="w-3 h-3" /> UTR / Reference No
                                            </Label>
                                            <span className="text-[9px] font-medium text-muted-foreground/40 bg-background border border-secondary/30 px-2 py-0.5 rounded-md shadow-sm">Optional</span>
                                        </div>
                                        <Input
                                            placeholder="Paste your UTR number after payment"
                                            value={manualProof || ''}
                                            onChange={(e) => setManualProof(e.target.value)}
                                            className="bg-background border-border focus-visible:ring-indigo-500/50 rounded-xl h-11 text-sm shadow-sm transition-all focus:shadow-md"
                                        />
                                    </div>

                                    {/* Confirm Button */}
                                    <Button
                                        onClick={() => {
                                            setShowQrPopup(false);
                                            executeSaveOrder();
                                        }}
                                        className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-primary-foreground shadow-lg shadow-indigo-200 h-14 text-base font-bold tracking-wide transition-all active:scale-[0.98]"
                                        style={{ backgroundColor: `hsl(${theme.colors.primary})` }}
                                    >
                                        <span className="drop-shadow-sm">Confirm Payment</span>
                                        <ArrowRight className="w-5 h-5 ml-2 animate-pulse" />
                                    </Button>

                                </div>

                                {/* Exit Confirmation Overlay */}
                                {showExitConfirmation && (
                                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 rounded-[32px] animate-in fade-in duration-200">
                                        <div className="bg-background items-center text-center p-6 rounded-3xl shadow-2xl w-full max-w-[280px]">
                                            <h4 className="text-lg font-bold text-gray-900 mb-2">Return to Cart?</h4>
                                            <p className="text-sm text-gray-500 mb-6">Payment process will be cancelled.</p>
                                            <div className="flex gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 rounded-xl"
                                                    onClick={() => setShowExitConfirmation(false)}
                                                >
                                                    No
                                                </Button>
                                                <Button
                                                    className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-primary-foreground"
                                                    onClick={() => {
                                                        setShowExitConfirmation(false);
                                                        setShowQrPopup(false);
                                                        setSmePayData(null);
                                                        setView('cart'); // Return specifically to cart view
                                                        setTimeLeft(300); // Reset timer
                                                    }}
                                                >
                                                    Yes
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                )}

                {/* SME Pay Popup Overlay */}
                {showQrPopup && smePayData && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                        <div className="w-full max-w-sm bg-background/90 backdrop-blur-2xl rounded-[32px] overflow-hidden shadow-2xl border border-white/50 relative animate-in zoom-in-95 slide-in-from-bottom-5 duration-500 my-auto flex flex-col pt-0">

                            {/* Header Panel */}
                            <div className="bg-[#0a2e1d] p-5 pb-8 flex items-start justify-between text-white relative">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute -top-1 -right-1 text-white/50 hover:text-white hover:bg-white/10 rounded-full z-30"
                                    onClick={() => setShowExitConfirmation(true)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                                <div className="flex flex-col gap-1 pr-2 mt-2">
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="font-bold text-sm tracking-tight truncate max-w-[150px] uppercase">
                                            {companyDetails?.companyName || "STORE NAME"}
                                        </h3>
                                        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                            <Check className="w-2.5 h-2.5 text-[#0a2e1d] stroke-[3]" />
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-white/70 font-medium">SMEPay Trusted Business</span>
                                </div>

                                <div className="flex flex-col items-end gap-0.5 mt-2">
                                    <span className="text-[10px] font-semibold text-white/90">Price Summary</span>
                                    <span className="text-xl font-bold tracking-tight">₹{(finalTotal - extraDiscount).toString()}</span>
                                    <span className="text-[9px] text-white/50">Secured by SMEPay</span>
                                </div>
                            </div>

                            {/* Body Section */}
                            <div className="flex flex-col items-center p-6 bg-white border-b-2 border-slate-100 rounded-t-[32px] -mt-5 relative z-10">
                                <h4 className="text-base font-bold text-slate-800 mb-5 tracking-tight">Scan to Pay</h4>

                                <div className="relative aspect-square w-48 overflow-hidden rounded-xl bg-white border shadow-sm p-1.5 mb-5">
                                    <Image
                                        src={smePayData.qr_code}
                                        alt="SMEPay QR Code"
                                        fill
                                        className="object-contain"
                                    />
                                    {/* Scan Line Animation */}
                                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-[scan_2s_ease-in-out_infinite] opacity-60" />
                                </div>

                                <div className="text-red-500 font-bold text-lg mb-5 tabular-nums tracking-wider">
                                    {formatTime(timeLeft)}
                                </div>

                                <p className="text-[11px] font-semibold text-slate-500 mb-4 tracking-wide text-center">Scan using any UPI app</p>

                                {/* Generic UPI App Intents */}
                                <div className="flex items-center justify-center gap-4 w-full px-2 mb-2">
                                    {smePayData?.intents?.gpay && (
                                        <a href={smePayData.intents.gpay} className="w-10 h-10 bg-white rounded-full flex flex-col items-center justify-center hover:scale-105 transition-transform border shadow-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48"><path fill="#fbbc05" d="M10.5 45.3L6.9 28 32.7 7.6 36.3 25z" /><path fill="#ea4335" d="M10.5 45.3L7 28l-5.6 2.5 9.1 14.8z" /><path fill="#34a853" d="M37.8 28l-5.1-20.4L18 3.5l5.1 20.4z" /><path fill="#4285f4" d="M37.8 28L41.3 45.3 26.6 30.5z" /></svg>
                                        </a>
                                    )}
                                    {smePayData?.intents?.phonepe && (
                                        <a href={smePayData.intents.phonepe} className="w-10 h-10 bg-[#5f259f] rounded-full flex flex-col items-center justify-center hover:scale-105 transition-transform shadow-sm">
                                            <span className="text-white font-bold text-[10px] leading-none">Pe</span>
                                        </a>
                                    )}
                                    {smePayData?.intents?.paytm && (
                                        <a href={smePayData.intents.paytm} className="w-10 h-10 bg-white rounded-full flex flex-col items-center justify-center border shadow-sm hover:scale-105 transition-transform">
                                            <span className="text-[#00B9F5] font-black text-[9px] leading-none tracking-tight">Paytm</span>
                                        </a>
                                    )}
                                </div>

                                <p className="text-[10px] font-bold text-slate-400 mt-5">Powered by SMEPay</p>
                            </div>

                            {/* Verification Footer */}
                            <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col gap-3 rounded-b-[32px]">
                                <div className="bg-white rounded-xl p-3 border shadow-sm">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                            <Tag className="w-3 h-3" /> UTR / Reference No
                                        </Label>
                                        <span className="text-[8px] font-semibold text-slate-400 bg-slate-50 border px-1.5 py-0.5 rounded shadow-sm">Optional</span>
                                    </div>
                                    <Input
                                        placeholder="Paste UTR after payment"
                                        value={manualProof || ''}
                                        onChange={(e) => setManualProof(e.target.value)}
                                        className="bg-transparent border-slate-200 focus-visible:ring-emerald-500/30 rounded-lg h-9 text-xs shadow-none transition-all placeholder:text-slate-300"
                                    />
                                </div>

                                <Button
                                    onClick={() => {
                                        setShowQrPopup(false);
                                        setSuccessOrderData({ success: true, orderId: smePayData.order_id });
                                        if (customer?.customerId) {
                                            orderService.getCustomerOrders(customer.customerId.toString(), true).catch(err => console.error("Cache update failed", err));
                                        }
                                        clearCart();
                                        setView('success');
                                        setContactInfo({ name: '', email: '', mobile: '' });
                                        setSelectedAddressId(null);
                                        setManualProof(null);
                                        setSmePayData(null);
                                    }}
                                    className="w-full rounded-xl bg-[#0a2e1d] hover:bg-[#061f12] text-white shadow h-11 text-sm font-bold tracking-wide transition-all"
                                >
                                    Confirm Payment
                                    <Check className="w-4 h-4 ml-2" />
                                </Button>
                            </div>

                            {/* Exit Confirmation Overlay For SMEPay */}
                            {showExitConfirmation && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 rounded-[32px] animate-in fade-in duration-200">
                                    <div className="bg-white items-center text-center p-6 rounded-3xl shadow-2xl w-full max-w-[280px]">
                                        <h4 className="text-base font-bold text-slate-900 mb-2">Cancel Payment?</h4>
                                        <p className="text-xs font-medium text-slate-500 mb-6">Are you sure you want to go back?</p>
                                        <div className="flex gap-3">
                                            <Button
                                                variant="outline"
                                                className="flex-1 rounded-xl h-10 text-xs"
                                                onClick={() => setShowExitConfirmation(false)}
                                            >
                                                No
                                            </Button>
                                            <Button
                                                className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white h-10 text-xs shadow-sm"
                                                onClick={() => {
                                                    setShowExitConfirmation(false);
                                                    setShowQrPopup(false);
                                                    setSmePayData(null);
                                                    setView('cart'); // Return specifically to cart view
                                                    setTimeLeft(300); // Reset timer
                                                }}
                                            >
                                                Yes
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                )}

                {/* Free Delivery Popup Overlay */}
                {
                    showFreeDeliveryPopup && (
                        <div className="absolute inset-x-4 top-1/4 z-[100] animate-in zoom-in-95 fade-in slide-in-from-bottom-10 duration-500 pointer-events-none">
                            <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 rounded-3xl shadow-2xl relative overflow-hidden border border-white/20 pointer-events-auto">
                                {/* Decorative Background */}
                                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-background/20 rounded-full blur-2xl" />
                                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black/10 rounded-full blur-xl" />

                                <div className="flex flex-col items-center text-center relative z-10">
                                    <div className="w-14 h-14 bg-background/20 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm shadow-inner">
                                        <Gift className="w-7 h-7 text-primary-foreground animate-bounce" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-1 tracking-tight">Free Shipment!</h3>
                                    <p className="text-primary-foreground/90 text-sm font-medium">You've unlocked free delivery for this order.</p>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 text-primary-foreground/60 hover:text-primary-foreground hover:bg-background/10 rounded-full h-8 w-8"
                                    onClick={() => setShowFreeDeliveryPopup(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )
                }

                {/* Stock Conflict Resolution Popup */}
                {
                    showConflictPopup && stockConflicts.length > 0 && (
                        <div className="absolute inset-0 z-[120] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-background w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-border animate-in zoom-in-95 slide-in-from-bottom-5">
                                {(() => {
                                    const hasUnresolved = stockConflicts.some(c => c.items.reduce((s, i) => s + i.quantity, 0) > c.availableStock);
                                    return (
                                        <div className={cn(
                                            "p-6 flex flex-col items-center text-center border-b transition-colors duration-300",
                                            hasUnresolved ? "bg-rose-500/10 border-rose-500/20" : "bg-primary/10 border-emerald-500/20"
                                        )}>
                                            <div className={cn(
                                                "w-14 h-14 rounded-full flex items-center justify-center mb-3 shadow-inner transition-colors duration-300",
                                                hasUnresolved
                                                    ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-500"
                                                    : "bg-emerald-100 dark:bg-emerald-900/30 text-primary dark:text-primary"
                                            )}>
                                                {hasUnresolved ? <AlertTriangle className="w-7 h-7" /> : <Check className="w-7 h-7" />}
                                            </div>
                                            <h3 className="text-xl font-bold text-foreground tracking-tight transition-all">
                                                {hasUnresolved ? "Stock Limit Exceeded" : "Issues Resolved"}
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-2 px-4 leading-relaxed transition-all">
                                                {hasUnresolved
                                                    ? "You have requested more items than are currently available. Please adjust quantities below."
                                                    : "All quantity issues have been resolved. You can now update your cart."}
                                            </p>
                                        </div>
                                    );
                                })()}

                                <ScrollArea className="max-h-[60vh]">
                                    <div className="p-6 space-y-8">
                                        {stockConflicts.map((conflict, idx) => {
                                            const totalSelected = conflict.items.reduce((sum, i) => sum + i.quantity, 0);
                                            const isOverLimit = totalSelected > conflict.availableStock;

                                            return (
                                                <div key={idx} className="space-y-4">
                                                    <div className="flex items-center justify-between border-b pb-2">
                                                        <h4 className="font-bold text-base">{conflict.productName}</h4>
                                                        <Badge variant={isOverLimit ? "destructive" : "secondary"} className="text-xs">
                                                            Limit: {conflict.availableStock}
                                                        </Badge>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {conflict.items.map((item) => (
                                                            <div key={item.cartItemId} className="flex items-center justify-between bg-secondary/30 p-3 rounded-xl">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-medium">{item.name}</span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {item.selectedVariants?.['Quantity'] || item.selectedColour?.name || "Standard Identity"}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-3 bg-background rounded-lg p-1 border shadow-sm">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 rounded-md"
                                                                        onClick={() => {
                                                                            const updatedItems = [...conflict.items];
                                                                            const target = updatedItems.find(i => i.cartItemId === item.cartItemId);
                                                                            if (target && target.quantity > 0) target.quantity--;

                                                                            const newConflicts = [...stockConflicts];
                                                                            newConflicts[idx].items = updatedItems;
                                                                            setStockConflicts(newConflicts);
                                                                        }}
                                                                    >
                                                                        <Minus className="w-3 h-3" />
                                                                    </Button>
                                                                    <span className={`text-sm font-bold w-4 text-center ${item.quantity === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                                        {item.quantity}
                                                                    </span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 rounded-md"
                                                                        onClick={() => {
                                                                            const updatedItems = [...conflict.items];
                                                                            const target = updatedItems.find(i => i.cartItemId === item.cartItemId);
                                                                            if (target) target.quantity++;

                                                                            const newConflicts = [...stockConflicts];
                                                                            newConflicts[idx].items = updatedItems;
                                                                            setStockConflicts(newConflicts);
                                                                        }}
                                                                    >
                                                                        <Plus className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex justify-between items-center text-sm font-medium pt-2">
                                                        <span className="text-muted-foreground">Total Selected:</span>
                                                        <span className={isOverLimit ? "text-rose-500 font-bold" : "text-primary font-bold"}>
                                                            {totalSelected} / {conflict.availableStock}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>

                                <div className="p-6 pt-0 bg-background/50 backdrop-blur-sm">
                                    <Button
                                        className="w-full h-11 rounded-xl font-bold shadow-lg"
                                        disabled={stockConflicts.some(c => c.items.reduce((s, i) => s + i.quantity, 0) > c.availableStock)}
                                        onClick={() => {
                                            // Apply Resolved Changes to Main Cart
                                            const resolvedMap = new Map<string, number>();
                                            stockConflicts.forEach(c => {
                                                c.items.forEach(i => resolvedMap.set(i.cartItemId, i.quantity));
                                            });

                                            const updatedCart = cart.map(item => {
                                                if (resolvedMap.has(item.cartItemId)) {
                                                    const newQty = resolvedMap.get(item.cartItemId)!;
                                                    return { ...item, quantity: newQty };
                                                }
                                                return item;
                                            }).filter(i => i.quantity > 0);

                                            useCart.setState({ cart: updatedCart });
                                            setCart(updatedCart); // Added this line as per instruction
                                            setStockConflicts([]);
                                            setShowConflictPopup(false);
                                            // Ideally, trigger checkout again or let user review
                                        }}
                                    >
                                        Update Cart & Continue
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Validation Popup */}
                {
                    showValidationPopup && (
                        <div className="absolute inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-background w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-border animate-in zoom-in-95 slide-in-from-bottom-5">
                                <div className="bg-amber-500/10 p-6 flex flex-col items-center text-center border-b border-amber-500/20">
                                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-3 text-amber-600 dark:text-amber-500">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground">Cart Updated</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Some items have changed since you added them.</p>
                                </div>

                                <div className="p-6 space-y-4">
                                    <ul className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {validationErrors.map((err, i) => (
                                            <li key={i} className="text-sm border-l-2 border-amber-500 pl-3 py-1 text-muted-foreground flex items-start justify-between gap-2 bg-amber-50/50 dark:bg-amber-950/10 rounded-r-md">
                                                <span className="leading-snug">{err.message}</span>

                                            </li>
                                        ))}
                                    </ul>

                                    <Button className="w-full" onClick={() => {

                                        // Manual Review Logic:
                                        // 1. Mark this as an internal update so useEffect doesn't clear validation
                                        isInternalUpdate.current = true;

                                        // 2. Apply Changes
                                        if (validatedCart.length > 0) {
                                            setCart(validatedCart);
                                        } else {
                                            console.error('CartSheet: validatedCart is empty!');
                                        }
                                        setValidatedCart([]);
                                        setShowValidationPopup(false);

                                        // 3. Set Validated Flag
                                        setIsValidated(true);

                                        // CHAINED POPUP LOGIC:
                                        // Check if we deferred any stock conflicts
                                        if (pendingStockConflicts.length > 0) {

                                            setStockConflicts(pendingStockConflicts);
                                            setShowConflictPopup(true);
                                            setPendingStockConflicts([]); // Clear buffer
                                        } else {
                                            // All Good -> Stay on Cart View (Manual Review Request)

                                            // We DO NOT auto-advance to 'list' view.
                                            // When user clicks "Checkout" again, handleCheckout will see isValidated=true and skip API.
                                        }
                                    }}>
                                        <RefreshCw className="mr-2 w-4 h-4" />
                                        Review & Continue
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Delete Confirmation Popup */}
                <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                    <AlertDialogContent className="w-[90%] sm:max-w-[400px] border-none bg-background/80 backdrop-blur-xl shadow-2xl rounded-3xl p-6 gap-0">
                        <div className="flex flex-col items-center text-center space-y-4 pt-2">
                            {/* Animated Icon */}
                            <div className="relative group">
                                <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full animate-pulse" />
                                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center relative border border-destructive/20 shadow-inner group-hover:scale-105 transition-transform duration-300">
                                    <Trash className="w-7 h-7 text-destructive animate-bounce" />
                                </div>
                            </div>

                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl font-bold tracking-tight">Remove Item?</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground text-sm font-medium leading-relaxed max-w-[260px] mx-auto">
                                    Are you sure you want to remove this item from your cart? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                        </div>
                        <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-8">
                            <AlertDialogCancel className="rounded-xl h-11 border-border/50 bg-secondary/50 hover:bg-secondary hover:text-foreground font-semibold transition-all duration-200 mt-0">
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    if (itemToDelete) {
                                        removeFromCart(itemToDelete);
                                        setItemToDelete(null);
                                        toast({
                                            description: "Item removed from cart",
                                            className: "bg-background border-border"
                                        });
                                    }
                                }}
                                className="rounded-xl h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold shadow-lg shadow-destructive/20 transition-all duration-200 hover:shadow-destructive/40 hover:-translate-y-0.5"
                            >
                                Remove
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Premium Login Required Popup */}
                {
                    showLoginPopup && (
                        <div className="absolute inset-0 z-[120] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-background w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border/50 animate-in zoom-in-95 slide-in-from-bottom-5 relative">
                                {/* Close Button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-secondary"
                                    onClick={() => setShowLoginPopup(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>

                                <div className="p-8 flex flex-col items-center text-center">
                                    {/* Animated Lock Icon */}
                                    <div className="relative mb-6 group">
                                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                                        <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center relative border border-primary/20 shadow-inner">
                                            <Lock className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-500" strokeWidth={2.5} />
                                        </div>
                                        <div className="absolute top-0 right-0 w-6 h-6 bg-background rounded-full flex items-center justify-center shadow-sm border border-border z-10">
                                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-bold tracking-tight mb-2">Login Required</h3>
                                    <p className="text-muted-foreground leading-relaxed text-sm mb-8">
                                        Please log in to your account to verify your identity and secure your order.
                                    </p>

                                    <Button
                                        className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300 bg-gradient-to-r from-primary to-primary/90"
                                        onClick={() => {
                                            setShowLoginPopup(false); // Clear popup
                                            setCartOpen(false); // Close Cart Sidebar
                                            // Set flag to reopen cart after login
                                            if (typeof window !== 'undefined') {
                                                sessionStorage.setItem('loginRedirect', 'cart');
                                            }
                                            // Small timeout to allow cart close animation to start/finish
                                            setTimeout(() => {
                                                window.dispatchEvent(new Event('open-profile-sidebar'));
                                            }, 300);
                                        }}
                                    >
                                        Log In / Sign Up
                                    </Button>

                                    <p className="text-xs text-muted-foreground mt-6">
                                        Don't have an account? No problem, we'll create one for you instantly using your phone number.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Header */}
                <SheetHeader className="px-6 py-5 border-b border-border/40 bg-background/50 backdrop-blur-md sticky top-0 z-20">
                    {view === 'cart' ? (
                        <div className="flex items-center gap-3">
                            <SheetClose asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="-ml-2 h-8 w-8 rounded-full"
                                >
                                    <ArrowRight className="w-4 h-4 rotate-180" />
                                </Button>
                            </SheetClose>
                            <SheetTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
                                <div className="relative group/icon">
                                    <ShoppingCart className="w-5 h-5 text-primary group-hover/icon:scale-110 transition-transform duration-300" />
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover/icon:opacity-100 transition-opacity duration-500" />
                                </div>
                                My Cart
                            </SheetTitle>
                            {cartItemCount > 0 && (
                                <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-secondary text-primary">
                                    {cartItemCount} items
                                </span>
                            )}
                        </div>
                    ) : view === 'success' ? (
                        <SheetTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-primary">
                            Order Confirmed
                        </SheetTitle>
                    ) : view === 'failed' ? (
                        <SheetTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-rose-600">
                            Action Required
                        </SheetTitle>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="-ml-2 h-8 w-8 rounded-full"
                                onClick={() => {
                                    if (view === 'add') setView('list');
                                    else if (view === 'payment') setView('list');
                                    else setView('cart');
                                }}
                            >
                                <ArrowRight className="w-4 h-4 rotate-180" />
                            </Button>
                            <SheetTitle className="text-xl font-bold font-headline flex items-center gap-2">
                                {view === 'add' ? 'Add New Address' : view === 'payment' ? 'Verify Details' : 'Select Delivery Address'}
                            </SheetTitle>
                        </div>
                    )}
                </SheetHeader>

                {view !== 'success' && view !== 'failed' && (
                    <CheckoutProgressBar currentView={view} />
                )}

                {
                    view === 'cart' ? (
                        cart.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                <div className="relative mb-2">
                                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                                    <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center relative backdrop-blur-sm border border-white/10">
                                        <ShoppingCart className="w-10 h-10 text-muted-foreground/60" />
                                    </div>
                                </div>
                                <div className="space-y-2 max-w-[250px]">
                                    <h3 className="font-bold text-xl tracking-tight">Your cart is empty</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        Looks like you haven't added anything yet. Discover our best sellers!
                                    </p>
                                </div>
                                <SheetClose asChild>
                                    <Button className="rounded-full w-full max-w-[200px] h-11 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all">
                                        Start Shopping
                                    </Button>
                                </SheetClose>
                            </div>
                        ) : (
                            <>
                                <ScrollArea className="flex-1 px-6">
                                    <ul className="py-6 space-y-6">
                                        {
                                            Array.from(new Set(cart.map(item => item.id))).sort((a, b) => a.localeCompare(b)).map((productId, productIndex) => {
                                                const groupItems = cart.filter(item => item.id === productId);
                                                // Get product-level info from the first item (since they are variants of same product)
                                                const representativeItem = groupItems[0];
                                                const ruleKey = productRules[productId] || "";
                                                const moreThanRule = representativeItem.multipleDiscountMoreThan || "";
                                                const totalQty = productQuantities[productId.toString()] || 0;

                                                // --- Upsell Calculation (Compact) ---
                                                let upsellNode: React.ReactNode = null;

                                                const cyclicTiers: { threshold: number, percent: number }[] = [];
                                                const flatTiers: { threshold: number, percent: number }[] = [];

                                                // 1. Parse Rule (Cyclic)
                                                if (ruleKey) {
                                                    String(ruleKey).split('&&&').forEach(seg => {
                                                        const [t, p] = String(seg).split('-');
                                                        if (t && p) cyclicTiers.push({ threshold: parseFloat(t), percent: parseFloat(p) });
                                                    });
                                                }
                                                // 2. Parse MoreThan (Flat)
                                                if (moreThanRule) {
                                                    const [t, p] = String(moreThanRule).split('-');
                                                    if (t && p) {
                                                        flatTiers.push({ threshold: parseFloat(t) + 1, percent: parseFloat(p) });
                                                    }
                                                }

                                                // 3. Determine 'Remainder' for Cyclic Logic
                                                let remainder = totalQty;
                                                const sortedCyclic = [...cyclicTiers].sort((a, b) => b.threshold - a.threshold);

                                                if (sortedCyclic.length > 0) {
                                                    // Simulate greedy consumption
                                                    while (remainder > 0) {
                                                        const best = sortedCyclic.find(t => t.threshold <= remainder);
                                                        if (best) {
                                                            remainder -= best.threshold;
                                                        } else {
                                                            break; // No tier fits, remainder is pending
                                                        }
                                                    }
                                                }

                                                // 4. Find Best Next Goal
                                                // Option A: Cyclic (Base on Remainder) - Only if we have a partial set started (>0)
                                                const cyclicGoals = (remainder > 0)
                                                    ? cyclicTiers
                                                        .filter(t => t.threshold > remainder)
                                                        .map(t => ({ needed: t.threshold - remainder, percent: t.percent }))
                                                    : [];

                                                // Option B: Flat (Base on Total)
                                                const flatGoals = flatTiers
                                                    .filter(t => t.threshold > totalQty)
                                                    .map(t => ({ needed: t.threshold - totalQty, percent: t.percent }));

                                                // Combine and Pick Best (Shortest Path to Discount)
                                                const allGoals = [...cyclicGoals, ...flatGoals].sort((a, b) => a.needed - b.needed);
                                                const bestGoal = allGoals[0];

                                                if (bestGoal) {
                                                    upsellNode = (
                                                        <div className="mt-2 animate-in slide-in-from-bottom-2 duration-500">
                                                            <div className="group flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 cursor-default mx-auto w-fit">
                                                                <Tag className="w-4 h-4 text-primary-foreground fill-white/20" />
                                                                <span className="text-xs font-bold text-primary-foreground uppercase tracking-wide">
                                                                    Add {bestGoal.needed} more to get {bestGoal.percent}% Off
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <li key={`group-${productId}`} className="bg-card border border-border/40 rounded-xl p-3 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${productIndex * 50}ms` }}>
                                                        {/* Product Items List (Grouped) */}
                                                        <div className="space-y-4">
                                                            {groupItems.map((item, itemIndex) => {
                                                                const isNew = lastAddedItemId === item.cartItemId;
                                                                // Calculate Rendered Discount for this specific line item
                                                                // We now use the pre-calculated itemDiscountMap which honors price sorting
                                                                const distribution = productDiscounts[item.cartItemId] || [];

                                                                // The distribution array corresponds 1:1 to the units in this specific cart item
                                                                // So we don't need to slice based on group offset anymore, because the map is keyed by cartItemId.
                                                                let itemDiscounts = distribution; // It should already be length == item.quantity

                                                                // Fallback safety
                                                                if (!itemDiscounts || itemDiscounts.length !== item.quantity) {
                                                                    // If mismatch (shouldn't happen with correct logic), fill 0 or trim
                                                                    // console.warn("Discount mismatch for item", item.cartItemId);
                                                                    itemDiscounts = itemDiscounts ? itemDiscounts.slice(0, item.quantity) : [];
                                                                    while (itemDiscounts.length < item.quantity) itemDiscounts.push(0);
                                                                }

                                                                // Group by Discount Percentage
                                                                const groups: Record<number, number> = {};
                                                                itemDiscounts.forEach(d => groups[d] = (groups[d] || 0) + 1);
                                                                const distinctDiscounts = Object.keys(groups).map(Number).sort((a, b) => b - a);

                                                                return distinctDiscounts.map((discountPercent, dIdx) => {
                                                                    const qty = groups[discountPercent];
                                                                    const isDiscounted = discountPercent > 0;
                                                                    const basePrice = item.priceAfterDiscount || item.price;
                                                                    // Note: we don't have item-specific sizeColours easily here if splitting variants.
                                                                    // Actually item is the cart item. SizeColours are on the item.
                                                                    const sizeColoursCost = item.selectedSizeColours?.reduce((acc, sc) => acc + sc.price, 0) || 0;
                                                                    const singleItemTotal = basePrice + sizeColoursCost;
                                                                    const finalTotal = singleItemTotal * qty * (1 - discountPercent / 100);

                                                                    return (
                                                                        <div key={`${item.cartItemId}-${discountPercent}`} className={cn("relative group/item flex gap-4", isNew && "ring-2 ring-primary/20 rounded-xl p-2 -m-2 bg-primary/5 transition-all duration-1000")}>
                                                                            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-border/50 bg-secondary/30">
                                                                                <Image
                                                                                    src={item.selectedSizeColours?.[0]?.productPics || item.selectedColour?.image || (item.images && item.images.length > 0 ? item.images[0] : item.imageUrl)}
                                                                                    alt={item.name}
                                                                                    fill
                                                                                    className={cn("object-cover", (item.productStatus === 'INACTIVE' || item.productStatus === 'OUTOFSTOCK') && "grayscale opacity-60")}
                                                                                />
                                                                                {(item.productStatus === 'INACTIVE' || item.productStatus === 'OUTOFSTOCK') && (
                                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                                                                                        <span className="text-[10px] font-bold text-primary-foreground bg-rose-500/90 px-1.5 py-0.5 rounded-full shadow-sm">
                                                                                            {item.productStatus === 'OUTOFSTOCK' ? 'SOLD OUT' : 'UNAVAILABLE'}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div className="flex flex-1 flex-col justify-between py-0.5">
                                                                                <div className="flex justify-between items-start gap-2">
                                                                                    <div className="space-y-1">
                                                                                        <Link href={`/product/${item.id}`} className="font-bold text-sm leading-tight hover:text-primary line-clamp-2">
                                                                                            {item.name}
                                                                                        </Link>
                                                                                        {(item.selectedVariants || item.selectedSizeColours || item.selectedColour) && (
                                                                                            <div className="flex flex-wrap gap-1">
                                                                                                {Object.values(item.selectedVariants || {}).map((v, i) => (
                                                                                                    <span key={i} className="text-[10px] uppercase font-medium text-muted-foreground">{v}</span>
                                                                                                ))}
                                                                                                {item.selectedSizeColours?.map((sc) => (
                                                                                                    <div key={sc.id} className="flex items-center px-2 py-0.5 bg-background border border-border/50 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                                                                                        <span className="text-[10px] font-bold text-foreground tracking-tight leading-none">{sc.name}</span>
                                                                                                    </div>
                                                                                                ))}
                                                                                                {item.selectedColour && (
                                                                                                    <div className="flex items-center px-2 py-0.5 bg-background border border-border/50 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                                                                                        <span className="text-[10px] font-bold text-foreground tracking-tight leading-none">{item.selectedColour.name}</span>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="text-right">
                                                                                        {isDiscounted ? (
                                                                                            <div className="flex flex-col items-end">
                                                                                                <span className="text-[10px] text-muted-foreground line-through">₹{(singleItemTotal * qty).toFixed(0)}</span>
                                                                                                <span className="font-bold text-sm text-primary">₹{finalTotal.toFixed(0)}</span>
                                                                                                <span className="text-[9px] font-bold text-primary-foreground bg-primary px-1.5 py-0.5 rounded-sm shadow-sm mt-0.5">
                                                                                                    {discountPercent}% OFF
                                                                                                </span>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className="font-bold text-sm">₹{finalTotal.toFixed(0)}</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex items-center justify-between mt-2">
                                                                                    <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5 border border-border/50 h-7">
                                                                                        <Button variant="ghost" className="h-6 w-6 rounded-md hover:bg-background p-0"
                                                                                            onClick={() => updateQuantity(item.cartItemId, Math.max(0, item.quantity - 1))}>
                                                                                            <Minus className="h-3 w-3" />
                                                                                        </Button>
                                                                                        <span className="w-6 text-center text-xs font-bold tabular-nums">{qty}</span>
                                                                                        <Button variant="ghost" className="h-6 w-6 rounded-md hover:bg-background p-0"
                                                                                            onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}>
                                                                                            <Plus className="h-3 w-3" />
                                                                                        </Button>
                                                                                    </div>
                                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => {
                                                                                        if (qty < item.quantity) {
                                                                                            updateQuantity(item.cartItemId, Math.max(0, item.quantity - qty));
                                                                                        } else {
                                                                                            setItemToDelete(item.cartItemId);
                                                                                        }
                                                                                    }}>
                                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                });
                                                            })}
                                                        </div>

                                                        {/* Compact Upsell Nudge (Bottom of Group) */}
                                                        {upsellNode}
                                                    </li>
                                                );
                                            })
                                        }
                                    </ul>
                                    {/* Summary Content Moved to ScrollArea */}
                                    <div className="pb-6">
                                        {/* Smart Reward Progress Bar (Combined) */}
                                        {(() => {
                                            const milestones = [];

                                            // Add Free Delivery Milestone
                                            if (freeDeliveryThreshold > 0) {
                                                milestones.push({
                                                    type: 'delivery',
                                                    value: freeDeliveryThreshold,
                                                    label: 'Free Delivery',
                                                    icon: Gift
                                                });
                                            }

                                            // Add Coupon Milestones
                                            if (companyDetails?.companyCoupon) {
                                                String(companyDetails.companyCoupon).split(',').forEach(c => {
                                                    const [code, , minStr] = String(c).split('&&&');
                                                    const min = parseInt(minStr || '0');
                                                    if (code && min > 0) {
                                                        milestones.push({
                                                            type: 'coupon',
                                                            value: min,
                                                            label: `Unlock ${code}`,
                                                            icon: Tag
                                                        });
                                                    }
                                                });
                                            }

                                            // Sort by value
                                            milestones.sort((a, b) => a.value - b.value);

                                            // Find first unreached milestone
                                            const nextMilestone = milestones.find(m => subtotal < m.value);

                                            // If all unlocked (or no milestones), show generic success or nothing
                                            if (!nextMilestone) {
                                                if (milestones.length > 0 && subtotal >= milestones[milestones.length - 1].value) {
                                                    return (
                                                        <div className="mb-6 bg-primary/10 p-3 rounded-lg border border-primary/20 text-center">
                                                            <p className="text-xs font-bold text-primary flex items-center justify-center gap-2">
                                                                <Gift className="w-3.5 h-3.5 fill-primary/60" />
                                                                Awesome! All rewards unlocked on this order.
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }

                                            const amountNeeded = nextMilestone.value - subtotal;
                                            const progress = (subtotal / nextMilestone.value) * 100;

                                            return (
                                                <div className="mb-6 bg-secondary/30 p-3 rounded-xl border border-border/60 shadow-sm relative overflow-hidden group">
                                                    {/* Background Shimmer */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:animate-shimmer" />

                                                    <div className="flex justify-between items-center mb-2 relative z-10">
                                                        <p className="text-xs font-bold text-foreground/80 flex items-center gap-2">
                                                            <div className="bg-primary/10 p-1 rounded-full text-primary">
                                                                <nextMilestone.icon className="w-3 h-3" />
                                                            </div>
                                                            Add <span className="text-primary text-sm font-extrabold">₹{amountNeeded.toFixed(0)}</span> for <span className="uppercase">{nextMilestone.label}</span>
                                                        </p>
                                                        <span className="text-[10px] font-medium text-muted-foreground">{Math.round(progress)}%</span>
                                                    </div>

                                                    <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border/50 relative z-10">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-all duration-700 ease-out",
                                                                nextMilestone.type === 'delivery' ? "bg-primary" : "bg-primary"
                                                            )}
                                                            style={{ width: `${Math.min(100, progress)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Coupon Section */}
                                        <div className="mb-6 space-y-3">
                                            {/* Available Coupons List (Simple Version) */}
                                            {companyDetails?.companyCoupon ? (
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    {(() => {
                                                        const coupons = String(companyDetails.companyCoupon).split(',').map((cStr, idx) => {
                                                            const [code, discountStr, minOrderStr] = String(cStr).split('&&&');
                                                            const discount = parseFloat(discountStr || '0');
                                                            const minOrder = parseFloat(minOrderStr || '0');
                                                            if (!code) return null;

                                                            return {
                                                                code,
                                                                discount,
                                                                minOrder,
                                                                isEligible: subtotal >= minOrder,
                                                                idx
                                                            };
                                                        }).filter((c): c is NonNullable<typeof c> => c !== null);

                                                        coupons.sort((a, b) => a.discount - b.discount);
                                                        const selectedCouponData = coupons.find(c => c.code === couponCode);
                                                        const hasActiveCoupon = !!selectedCouponData;

                                                        return coupons.map((coupon) => {
                                                            const isBlocked = hasActiveCoupon && coupon.code !== couponCode;
                                                            const isDisabled = !coupon.isEligible || isBlocked;

                                                            return (
                                                                <button
                                                                    key={coupon.idx}
                                                                    onClick={() => {
                                                                        if (!isDisabled) {
                                                                            setCouponCode(coupon.code);
                                                                        }
                                                                    }}
                                                                    disabled={isDisabled}
                                                                    className={cn(
                                                                        "group relative flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-all duration-300 overflow-hidden",
                                                                        !isDisabled
                                                                            ? "bg-background border-primary/30 shadow-sm hover:border-primary hover:shadow-md cursor-pointer"
                                                                            : "bg-secondary/30 border-border cursor-not-allowed opacity-60"
                                                                    )}
                                                                >
                                                                    {couponCode === coupon.code && coupon.isEligible && (
                                                                        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                                                                    )}

                                                                    <div className="flex flex-col">
                                                                        <span className={cn(
                                                                            "text-sm font-black tracking-wide font-mono leading-none",
                                                                            coupon.isEligible ? "text-foreground" : "text-muted-foreground/40"
                                                                        )}>{coupon.code}</span>
                                                                        <span className="text-[10px] font-medium text-muted-foreground leading-none mt-1">
                                                                            {coupon.isEligible ? `Get ${coupon.discount}% OFF` : `${coupon.discount}% OFF • Orders above ₹${coupon.minOrder}`}
                                                                        </span>
                                                                    </div>

                                                                    {couponCode === coupon.code && coupon.isEligible ? (
                                                                        <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center shadow-sm">
                                                                            <div className="h-1.5 w-1.5 bg-background rounded-full" />
                                                                        </div>
                                                                    ) : (
                                                                        coupon.isEligible && (
                                                                            <div className="h-4 w-4 rounded-full border border-primary/30 group-hover:border-primary transition-colors" />
                                                                        )
                                                                    )}
                                                                </button>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-secondary/20 border border-border/40 rounded-xl text-center">
                                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
                                                        No coupons available at this moment
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3 mb-6">
                                            <div className="flex justify-between text-sm text-muted-foreground">
                                                <span>Subtotal</span>
                                                <span>₹{subtotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-muted-foreground">
                                                <span>Shipping</span>
                                                <span className={cn(isFreeDelivery ? "text-green-600 font-medium" : "")}>
                                                    {isFreeDelivery ? "FREE" : "₹" + shipping.toFixed(2)}
                                                </span>
                                            </div>
                                            {discountAmount > 0 && (
                                                <div className="flex justify-between text-sm text-primary font-medium animate-in slide-in-from-left-2">
                                                    <span>Coupon ({couponCode})</span>
                                                    <span>-₹{discountAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                                        </div>
                                    </div>
                                </ScrollArea>

                                {/* Minimal Footer */}
                                <div className="p-4 bg-background/80 backdrop-blur-xl border-t border-border/50 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-20">
                                    {/* Delivery Method Selection in Cart */}
                                    {features?.enableStorePickup && (
                                        <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                            <div className="grid grid-cols-2 gap-2">
                                                <button 
                                                    onClick={() => setIsPickup(false)}
                                                    className={cn(
                                                        "py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all",
                                                        !isPickup ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/20" : "bg-transparent border-border hover:bg-secondary/20"
                                                    )}
                                                >
                                                    <Truck className={cn("w-4 h-4", !isPickup ? "text-primary" : "text-muted-foreground")} />
                                                    <span className={cn("text-[10px] font-bold uppercase tracking-tight", !isPickup ? "text-primary transition-colors" : "text-muted-foreground")}>Delivery</span>
                                                </button>
                                                <button 
                                                    onClick={() => setIsPickup(true)}
                                                    className={cn(
                                                        "py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all",
                                                        isPickup ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/20" : "bg-transparent border-border hover:bg-secondary/20"
                                                    )}
                                                >
                                                    <Building2 className={cn("w-4 h-4", isPickup ? "text-primary" : "text-muted-foreground")} />
                                                    <span className={cn("text-[10px] font-bold uppercase tracking-tight", isPickup ? "text-primary transition-colors" : "text-muted-foreground")}>Pickup</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-baseline mb-4">
                                        <span className="font-semibold text-lg">Total</span>
                                        <span className="font-bold text-2xl text-primary tracking-tight">₹{finalTotal.toFixed(2)}</span>
                                    </div>

                                    {!canCheckout && (
                                        <p className="text-xs text-destructive text-center mb-2 font-medium bg-destructive/10 py-1 px-2 rounded-lg">
                                            Minimum order amount is ₹{minOrder.toFixed(0)}
                                        </p>
                                    )}

                                    <Button
                                        className={cn(
                                            "w-full h-12 rounded-full text-base font-bold shadow-lg transition-all duration-300",
                                            canCheckout
                                                ? "shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 bg-gradient-to-r from-primary to-primary/90"
                                                : "bg-muted text-muted-foreground shadow-none cursor-not-allowed"
                                        )}
                                        disabled={!canCheckout || isCheckingOut}
                                        onClick={canCheckout ? handleCheckout : undefined}
                                    >
                                        {canCheckout ? (
                                            <div className="flex items-center w-full justify-center">
                                                {isCheckingOut ? (
                                                    <>Validating <RefreshCw className="ml-2 w-4 h-4 animate-spin" /></>
                                                ) : (
                                                    <> {text.checkoutButton || "Checkout securely"} <ArrowRight className="ml-2 w-4 h-4" /></>
                                                )}
                                            </div>
                                        ) : (
                                            <span>Checkout Disabled</span>
                                        )}
                                    </Button>
                                </div>
                            </>
                        )) : (
                        <>
                            {view !== 'success' && (
                                <ScrollArea className="flex-1 bg-secondary/10">
                                    <div className="p-6 space-y-8">
                                        {/* Address List View */}
                                        {view === 'list' && (
                                            <>
                                                {/* Delivery Method Selection - Moved to sidebar/footer */}
                                                {/* Contact Details */}
                                                <div className="space-y-4 mb-6">
                                                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-1">Contact Details</h3>
                                                    <div className="bg-background p-5 rounded-2xl border shadow-sm space-y-4">
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="cName">
                                                                Full Name <span className="text-destructive">*</span>
                                                            </Label>
                                                            <Input
                                                                id="cName"
                                                                placeholder="John Doe"
                                                                value={contactInfo.name}
                                                                onChange={e => setContactInfo({ ...contactInfo, name: e.target.value })}
                                                                className="bg-secondary/20 border-transparent focus:bg-background focus:border-input rounded-xl"
                                                            />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="cPhone">Phone Number</Label>
                                                            <Input
                                                                id="cPhone"
                                                                placeholder="9876543210"
                                                                value={contactInfo.mobile}
                                                                readOnly
                                                                className="bg-secondary/10 border-transparent text-muted-foreground focus-visible:ring-0 cursor-not-allowed rounded-xl opacity-90 font-medium"
                                                            />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="cEmail">
                                                                Email Address
                                                            </Label>
                                                            <Input
                                                                id="cEmail"
                                                                placeholder="john@example.com"
                                                                value={contactInfo.email}
                                                                onChange={e => setContactInfo({ ...contactInfo, email: e.target.value })}
                                                                className="bg-secondary/20 border-transparent focus:bg-background focus:border-input rounded-xl"
                                                            />
                                                            <div className="flex items-center gap-2 mt-2 px-1 opacity-80">
                                                                <Info className="w-3 h-3 text-primary animate-pulse" />
                                                                <p className="text-[10px] text-muted-foreground font-medium">
                                                                    Please enter correctly for order confirmation.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Saved Addresses */}
                                                <div className="space-y-4">
                                                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-1">Saved Addresses</h3>

                                                    {loadingAddresses ? (
                                                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                                            <p className="text-xs font-medium">Loading addresses...</p>
                                                        </div>
                                                    ) : addresses.length === 0 ? (
                                                        <div className="text-center py-10 px-4 bg-background rounded-3xl border border-dashed border-border/60">
                                                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                                                                <MapPin className="w-6 h-6" />
                                                            </div>
                                                            <p className="font-semibold text-foreground">No addresses found</p>
                                                            <Button onClick={() => setView('add')} variant="secondary" className="mt-4 rounded-full">
                                                                Add First Address
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="grid gap-4">
                                                            {[...addresses].sort((a, b) => a.customerAddressId === selectedAddressId ? -1 : b.customerAddressId === selectedAddressId ? 1 : 0).map((addr) => {
                                                                const isSelected = selectedAddressId === addr.customerAddressId;
                                                                return (
                                                                    <div
                                                                        key={addr.customerAddressId}
                                                                        onClick={() => setSelectedAddressId(addr.customerAddressId)}
                                                                        className={cn(
                                                                            "relative group cursor-pointer p-4 rounded-2xl border transition-all duration-300",
                                                                            isSelected
                                                                                ? "bg-primary/5 border-primary shadow-sm"
                                                                                : "bg-background border-border hover:border-primary/30 hover:shadow-md"
                                                                        )}
                                                                    >
                                                                        <div className="flex items-start gap-4">
                                                                            <div className={cn(
                                                                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                                                                isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground group-hover:bg-secondary/80"
                                                                            )}>
                                                                                <Home className="w-5 h-5" />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center justify-between mb-1">
                                                                                    <span className={cn(
                                                                                        "font-bold text-base truncate",
                                                                                        isSelected ? "text-primary" : "text-foreground"
                                                                                    )}>
                                                                                        {addr.addressName}
                                                                                    </span>
                                                                                    {isSelected && (
                                                                                        <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0 text-center rounded-full flex items-center gap-1">
                                                                                            <Check className="w-3 h-3" /> Selected
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                                                                    {addr.customerDrNum}, {addr.customerRoad}, {addr.customerCity} - {addr.customerPin}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                            <button
                                                                onClick={() => setView('add')}
                                                                className="flex items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                                            >
                                                                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                                    <Plus className="w-4 h-4" />
                                                                </div>
                                                                <span className="font-semibold text-sm text-muted-foreground group-hover:text-primary">Add New Address</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="pt-4 sticky bottom-0 bg-background/95 backdrop-blur pb-6 mt-auto border-t space-y-4 px-4">
                                                    {/* Delivery Method Selection in Checkout */}
                                                    {features?.enableStorePickup && (
                                                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button 
                                                                    onClick={() => setIsPickup(false)}
                                                                    className={cn(
                                                                        "py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all",
                                                                        !isPickup ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/20" : "bg-transparent border-border hover:bg-secondary/20"
                                                                    )}
                                                                >
                                                                    <Truck className={cn("w-4 h-4", !isPickup ? "text-primary" : "text-muted-foreground")} />
                                                                    <span className={cn("text-[10px] font-bold uppercase tracking-tight", !isPickup ? "text-primary transition-colors" : "text-muted-foreground")}>Delivery</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => setIsPickup(true)}
                                                                    className={cn(
                                                                        "py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all",
                                                                        isPickup ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/20" : "bg-transparent border-border hover:bg-secondary/20"
                                                                    )}
                                                                >
                                                                    <Building2 className={cn("w-4 h-4", isPickup ? "text-primary" : "text-muted-foreground")} />
                                                                    <span className={cn("text-[10px] font-bold uppercase tracking-tight", isPickup ? "text-primary transition-colors" : "text-muted-foreground")}>Pickup</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <Button
                                                        className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all bg-gradient-to-r from-primary to-primary/90"
                                                        disabled={!isPickup && !selectedAddressId}
                                                        onClick={async () => {
                                                            if (!contactInfo.name) {
                                                                toast({
                                                                    variant: "destructive",
                                                                    title: "Missing Details",
                                                                    description: "Please enter your Full Name."
                                                                });
                                                                return;
                                                            }

                                                            // Optional Email Validation
                                                            if (contactInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.email)) {
                                                                toast({
                                                                    variant: "destructive",
                                                                    title: "Invalid Email",
                                                                    description: "Please enter a valid email address."
                                                                });
                                                                return;
                                                            }

                                                            // Update customer details if changed
                                                            if (customer && (
                                                                contactInfo.name !== customer.customerName ||
                                                                contactInfo.email !== customer.customerEmailId ||
                                                                contactInfo.mobile !== customer.customerMobileNumber
                                                            )) {
                                                                try {
                                                                    const updatedCustomer = await customerService.updateCustomer({
                                                                        customerId: customer.customerId,
                                                                        companyId: customer.companyId || companyDetails?.companyId || '',
                                                                        customerName: contactInfo.name,
                                                                        customerEmailId: contactInfo.email,
                                                                        customerMobileNumber: contactInfo.mobile,
                                                                        customerStatus: customer.customerStatus,
                                                                        createdAt: customer.createdAt,
                                                                        customerImage: customer.customerImage
                                                                    });

                                                                    // Update local state without fetching
                                                                    if (updatedCustomer) {
                                                                        setCustomer(updatedCustomer);
                                                                        // Notify other components with the NEW data
                                                                        window.dispatchEvent(new CustomEvent('profile-updated', { detail: updatedCustomer }));
                                                                        toast({ description: "Profile details updated." });
                                                                    }
                                                                } catch (error) {
                                                                    console.error("Failed to update profile", error);
                                                                    // We continue anyway so they can pay? Or stop? 
                                                                    // Let's continue but warn? Or maybe just log. User wants update, so best to try.
                                                                }
                                                            }

                                                            setView('payment');
                                                        }}
                                                    >
                                                        Proceed to Payment <ArrowRight className="w-5 h-5 ml-2 Group-hover:translate-x-1 transition-transform" />
                                                    </Button>
                                                </div>
                                            </>
                                        )}

                                        {/* Add Address View */}
                                        {view === 'add' && (
                                            <div className="animate-in slide-in-from-right-8 fade-in duration-300 space-y-6">
                                                <div className="space-y-4 bg-background p-6 rounded-3xl border shadow-sm">
                                                    <div className="grid gap-2">
                                                        <Label>Address Label</Label>
                                                        <div className="flex gap-3">
                                                            {[
                                                                { id: 'Home', icon: Home, label: 'Home' },
                                                                { id: 'Work', icon: Briefcase, label: 'Work' },
                                                                { id: 'Other', icon: MapPin, label: 'Other' }
                                                            ].map((type) => (
                                                                <button
                                                                    key={type.id}
                                                                    onClick={() => handleLabelChange(type.id as any)}
                                                                    className={cn(
                                                                        "flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all duration-200 text-sm font-medium",
                                                                        addressLabel === type.id
                                                                            ? "bg-teal-600 text-primary-foreground border-teal-600 shadow-md shadow-teal-500/20"
                                                                            : "bg-background text-muted-foreground/80 border-border hover:border-teal-200 hover:bg-teal-50"
                                                                    )}
                                                                >
                                                                    <type.icon className={cn("w-4 h-4", addressLabel === type.id ? "text-primary-foreground" : "text-muted-foreground/40")} />
                                                                    {type.label}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {addressLabel === 'Other' && (
                                                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-2 relative">
                                                                <Label htmlFor="customName" className="sr-only">Custom Name</Label>
                                                                <Input
                                                                    id="customName"
                                                                    placeholder="e.g. Grandma's House, My Office"
                                                                    className="h-12 bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all rounded-xl"
                                                                    value={newAddress.addressName === 'Other' ? '' : newAddress.addressName}
                                                                    onChange={(e) => setNewAddress({ ...newAddress, addressName: e.target.value })}
                                                                    autoFocus
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="grid gap-4">
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="road">Street Address</Label>
                                                            <div className="relative">
                                                                <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                                                                <textarea
                                                                    id="road"
                                                                    placeholder="e.g. 123 Main St, Apt 4B"
                                                                    className="w-full min-h-[80px] pl-10 pt-3 rounded-xl border-transparent bg-secondary/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:bg-background focus:border-input"
                                                                    value={newAddress.customerRoad}
                                                                    onChange={e => setNewAddress({ ...newAddress, customerRoad: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="pincode">Pincode</Label>
                                                                <Input
                                                                    id="pincode"
                                                                    placeholder="560001"
                                                                    value={newAddress.customerPin}
                                                                    onChange={e => handlePincodeChange(e.target.value)}
                                                                    className="bg-secondary/20 border-transparent focus:bg-background focus:border-input rounded-xl"
                                                                />
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="city">City</Label>
                                                                <Input
                                                                    id="city"
                                                                    placeholder="City"
                                                                    value={newAddress.customerCity}
                                                                    readOnly
                                                                    className="bg-secondary/10 border-transparent text-muted-foreground cursor-not-allowed rounded-xl"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="state">State</Label>
                                                            <Input
                                                                id="state"
                                                                placeholder="State"
                                                                value={newAddress.customerState}
                                                                readOnly
                                                                className="bg-secondary/10 border-transparent text-muted-foreground cursor-not-allowed rounded-xl"
                                                            />
                                                        </div>

                                                    </div>
                                                </div>

                                                <div className="bg-blue-50 text-blue-800 p-4 rounded-2xl text-xs font-medium leading-relaxed border border-blue-100 flex gap-3">
                                                    <div className="bg-blue-100 p-1.5 rounded-full h-fit">
                                                        <Info className="w-4 h-4" />
                                                    </div>
                                                    <p>Ensure your address details are accurate to avoid delivery delays. Pincode is crucial for serviceability checks.</p>
                                                </div>

                                                <Button
                                                    className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20"
                                                    onClick={handleSaveAddress}
                                                    disabled={savingAddress}
                                                >
                                                    {savingAddress ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                                        </>
                                                    ) : (
                                                        "Save Address"
                                                    )}
                                                </Button>
                                            </div>
                                        )}

                                        {/* View: Payment Method */}
                                        {view === 'payment' && (
                                            <div className="animate-in slide-in-from-right-8 fade-in duration-500 space-y-6">

                                                {/* Premium Payment Selection Card */}
                                                <div
                                                    onClick={() => setSelectedPaymentMethod('ONLINE')}
                                                    className={cn(
                                                        "relative overflow-hidden cursor-pointer p-6 rounded-3xl border transition-all duration-500 group",
                                                        selectedPaymentMethod === 'ONLINE'
                                                            ? "border-transparent bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-primary-foreground shadow-2xl shadow-slate-900/20"
                                                            : "bg-background border-border hover:border-slate-300"
                                                    )}
                                                >
                                                    {/* Animated Background Effects */}
                                                    {selectedPaymentMethod === 'ONLINE' && (
                                                        <div className="absolute inset-0 opacity-20">
                                                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-[100px] -mr-32 -mt-32" />
                                                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] -ml-32 -mb-32" />
                                                        </div>
                                                    )}

                                                    <div className="relative z-10 flex items-start gap-5">
                                                        <div className={cn(
                                                            "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 shadow-lg",
                                                            selectedPaymentMethod === 'ONLINE'
                                                                ? "bg-background/10 backdrop-blur-md border border-white/10 text-primary-foreground"
                                                                : "bg-secondary/50 text-muted-foreground/60"
                                                        )}>
                                                            <CreditCard className="w-7 h-7" />
                                                        </div>

                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className={cn(
                                                                    "font-bold text-xl tracking-tight",
                                                                    selectedPaymentMethod === 'ONLINE' ? "text-primary-foreground" : "text-foreground"
                                                                )}>
                                                                    Online Payment
                                                                </span>
                                                                {selectedPaymentMethod === 'ONLINE' && (
                                                                    <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 scale-100 opacity-100 transition-all">
                                                                        <Check className="w-3.5 h-3.5 text-primary-foreground stroke-[3]" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <p className={cn(
                                                                "text-sm leading-relaxed max-w-[90%]",
                                                                selectedPaymentMethod === 'ONLINE' ? "text-muted-foreground/30" : "text-muted-foreground/60"
                                                            )}>
                                                                Secure instant payment via UPI.
                                                            </p>

                                                            <div className="pt-3 flex items-center gap-3">
                                                                <div className={cn(
                                                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                                                    selectedPaymentMethod === 'ONLINE' ? "bg-background/10 text-primary-foreground/90" : "bg-secondary/50 text-muted-foreground/80"
                                                                )}>
                                                                    <Lock className="w-3 h-3" /> 100% Secure
                                                                </div>
                                                                <span className={cn(
                                                                    "text-[10px] font-medium opacity-60",
                                                                    selectedPaymentMethod === 'ONLINE' ? "text-primary-foreground" : "text-muted-foreground/60"
                                                                )}>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Delivery Details Card */}
                                                <div className="bg-background p-5 rounded-3xl border border-secondary/30 shadow-sm relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

                                                    <h3 className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <MapPin className="w-3 h-3" /> Delivery To
                                                    </h3>

                                                    <div className="flex items-start gap-4 sticky z-10">
                                                        <div className="w-10 h-10 rounded-full bg-secondary/30 border border-secondary/30 flex items-center justify-center shrink-0 text-muted-foreground/80">
                                                            <User className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            {(() => {
                                                                const addr = addresses.find(a => a.customerAddressId === selectedAddressId);
                                                                return addr ? (
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-bold text-foreground">{contactInfo.name}</span>
                                                                            <span className="text-[10px] font-bold bg-secondary/50 px-2 py-0.5 rounded text-muted-foreground/80 uppercase tracking-wider">
                                                                                {addr.addressName || 'Home'}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm text-muted-foreground/60 leading-relaxed font-medium">
                                                                            {[addr.customerDrNum, addr.customerRoad, addr.customerCity].filter(Boolean).join(', ')} - {addr.customerPin}
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground/40 font-medium">
                                                                            {contactInfo.mobile}
                                                                        </p>
                                                                    </div>
                                                                ) : <p className="text-sm text-destructive">No address selected</p>;
                                                            })()}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 text-xs font-bold text-primary hover:bg-primary/5 hover:text-primary rounded-full px-3"
                                                            onClick={() => setView('list')}
                                                        >
                                                            Change
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Order Summary Card */}
                                                <div className="bg-background rounded-3xl border border-secondary/30 shadow-sm overflow-hidden">
                                                    <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                                                        <h3 className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest flex items-center gap-2">
                                                            <ShoppingCart className="w-3 h-3" /> Order Summary
                                                        </h3>
                                                        <span className="text-xs font-bold text-foreground bg-secondary/30 px-2.5 py-1 rounded-full">{cartItemCount} Items</span>
                                                    </div>

                                                    <div className="max-h-[220px] overflow-y-auto p-2">
                                                        {cart.map((item) => (
                                                            <div key={item.cartItemId} className="flex gap-3 p-3 rounded-2xl hover:bg-secondary/30 transition-colors group">
                                                                {/* Minimal Image */}
                                                                <div className="h-12 w-12 rounded-lg bg-secondary/50 overflow-hidden shrink-0 relative">
                                                                    {item.images && item.images.length > 0 ? (
                                                                        <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover" />
                                                                    ) : item.imageUrl ? (
                                                                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                                                    ) : null}
                                                                </div>

                                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                    <div className="flex justify-between items-start">
                                                                        <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-tight flex-1 mr-2">{item.name}</h4>
                                                                        <div className="text-right flex flex-col items-end shrink-0">
                                                                            {(() => {
                                                                                const sizeColoursCost = item.selectedSizeColours?.reduce((acc, sc) => acc + sc.price, 0) || 0;
                                                                                const basePrice = item.priceAfterDiscount || item.price;
                                                                                const unitOriginal = item.price + sizeColoursCost;

                                                                                // Calculate total using itemDiscountMap
                                                                                const unitDiscounts = itemDiscountMap[item.cartItemId] || new Array(item.quantity).fill(0);
                                                                                let finalItemTotal = 0;
                                                                                unitDiscounts.forEach(d => {
                                                                                    finalItemTotal += (basePrice + sizeColoursCost) * (1 - d / 100);
                                                                                });

                                                                                const hasDiscount = finalItemTotal < (unitOriginal * item.quantity) - 0.1; // Small epsilon for float comparison

                                                                                return (
                                                                                    <>
                                                                                        {hasDiscount && (
                                                                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                                                                <span className="text-[10px] text-muted-foreground/40 line-through leading-none">
                                                                                                    ₹{(unitOriginal * item.quantity).toFixed(0)}
                                                                                                </span>
                                                                                                <span className="text-[9px] font-bold text-primary bg-primary/10 px-1 rounded-sm leading-tight border border-primary/20">
                                                                                                    {Math.round(((unitOriginal * item.quantity - finalItemTotal) / (unitOriginal * item.quantity)) * 100)}% OFF
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                        <span className="font-bold text-sm text-foreground leading-none">
                                                                                            ₹{finalItemTotal.toFixed(0)}
                                                                                        </span>
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground/40 mt-0.5">Qty: {item.quantity} {
                                                                        Object.values(item.selectedVariants || {}).length > 0 && `• ${Object.values(item.selectedVariants || {}).join(', ')}`
                                                                    }
                                                                        {item.selectedSizeColours?.[0]?.name && ` ${item.selectedSizeColours[0].name.toUpperCase()}`}
                                                                        {item.selectedColour?.name && ` ${item.selectedColour.name.toUpperCase()}`}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Delivery Method Selection in Payment Review */}
                                                    {features?.enableStorePickup && (
                                                        <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button 
                                                                    onClick={() => setIsPickup(false)}
                                                                    className={cn(
                                                                        "py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all",
                                                                        !isPickup ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/20" : "bg-transparent border-border hover:bg-secondary/20"
                                                                    )}
                                                                >
                                                                    <Truck className={cn("w-4 h-4", !isPickup ? "text-primary" : "text-muted-foreground")} />
                                                                    <span className={cn("text-[10px] font-bold uppercase tracking-tight", !isPickup ? "text-primary transition-colors" : "text-muted-foreground")}>Delivery</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => setIsPickup(true)}
                                                                    className={cn(
                                                                        "py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all",
                                                                        isPickup ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/20" : "bg-transparent border-border hover:bg-secondary/20"
                                                                    )}
                                                                >
                                                                    <Building2 className={cn("w-4 h-4", isPickup ? "text-primary" : "text-muted-foreground")} />
                                                                    <span className={cn("text-[10px] font-bold uppercase tracking-tight", isPickup ? "text-primary transition-colors" : "text-muted-foreground")}>Pickup</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Bill Breakdown */}
                                                    <div className="bg-secondary/30/50 p-5 space-y-3">
                                                        <div className="flex justify-between text-sm text-muted-foreground/60">
                                                            <span>Item Total</span>
                                                            <span className="font-medium text-foreground">₹{subtotal.toFixed(2)}</span>
                                                        </div>
                                                        {discountAmount > 0 && (
                                                            <div className="flex justify-between text-sm text-primary font-bold">
                                                                <span>Discount</span>
                                                                <span>-₹{discountAmount.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        {extraDiscount > 0 && (
                                                            <div className="flex justify-between text-sm text-rose-600 font-bold">
                                                                <span>Extra Discount</span>
                                                                <span>-₹{extraDiscount.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between text-sm text-muted-foreground/60">
                                                            <span>{isPickup ? 'Store Pickup' : 'Delivery'}</span>
                                                            <span className={(isFreeDelivery || isPickup) ? "text-primary font-bold" : "text-foreground"}>
                                                                {(isFreeDelivery || isPickup) ? "FREE" : "₹" + shipping.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="h-px bg-slate-200/60 my-2" />
                                                        <div className="flex justify-between items-end">
                                                            <span className="font-bold text-base text-foreground">To Pay</span>
                                                            <span className="font-black text-xl text-primary font-headline">₹{(finalTotal - extraDiscount).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            )}


                            {/* Footer for Payment View */}
                            {view === 'payment' && (
                                <div className="p-6 bg-background pt-4 border-t border-border/50 backdrop-blur-md">
                                    <Button
                                        size="lg"
                                        className={cn(
                                            "w-full h-14 rounded-2xl text-lg font-bold shadow-xl transition-all",
                                            (companyDetails?.razorpay === false || companyDetails?.smePay || companyDetails?.cashFree)
                                                ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                                                : "bg-primary hover:bg-primary/90 shadow-primary/30"
                                        )}
                                        onClick={(companyDetails?.razorpay === false || companyDetails?.smePay || companyDetails?.cashFree) ? handleManualPayment : handlePaymentInitialize}
                                        disabled={isInitializingPayment || (companyDetails?.razorpay === false && !companyDetails?.smePay && !companyDetails?.cashFree && timeLeft === 0)}
                                    >
                                        {isInitializingPayment ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                                            </>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                Place Order & Pay <ArrowRight className="w-5 h-5" />
                                            </span>
                                        )}
                                    </Button>
                                    <div className="flex items-center justify-center gap-2 mt-3 opacity-60">
                                        <CreditCard className="w-3 h-3" />
                                        <span className="text-[10px] font-medium">Safe & Secure Payment</span>
                                    </div>
                                </div>
                            )}

                            {/* Success View */}
                            {view === 'success' && (
                                <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in duration-500">
                                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-100/50 animate-bounce">
                                        <Check className="w-12 h-12 text-green-600 stroke-[3]" />
                                    </div>

                                    <h2 className="text-3xl font-black text-foreground mb-2 font-headline tracking-tight">Order Placed!</h2>
                                    {successOrderData?.orderNumber && (
                                        <div className="mb-4 inline-block bg-secondary/50 px-3 py-1 rounded-lg border border-border">
                                            <p className="text-xs font-mono text-muted-foreground/60 font-medium tracking-wider">
                                                ORDER #{successOrderData.orderNumber}
                                            </p>
                                        </div>
                                    )}
                                    <p className="text-muted-foreground/60 mb-8 max-w-[280px] leading-relaxed">
                                        Thank you for your purchase. Your order has been received and is confirmed.
                                    </p>

                                    <div className="bg-secondary/30 p-6 rounded-2xl border border-secondary/30 w-full max-w-sm mb-8 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-sm text-muted-foreground/60 font-medium">Status</span>
                                            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wider">CONFIRMED</span>
                                        </div>
                                        {successOrderData?.finalTotalAmount && (
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-muted-foreground/60 font-medium">Total Amount</span>
                                                <span className="text-lg font-black text-foreground font-headline">
                                                    {formatCurrency(successOrderData.finalTotalAmount)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="h-px bg-slate-200/60 my-2" />
                                        <p className="text-xs text-muted-foreground/40 mt-2">
                                            We'll send you delivery updates via WhatsApp/SMS.
                                        </p>
                                    </div>

                                    <Button
                                        size="lg"
                                        className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/30"
                                        onClick={() => {
                                            setCartOpen(false);
                                            // Reset view after closing so next open shows cart
                                            setTimeout(() => setView('cart'), 300);
                                        }}
                                    >
                                        Continue Shopping
                                    </Button>
                                </div>
                            )}

                            {/* Failed View */}
                            {view === 'failed' && (
                                <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in duration-500">
                                    <div className="w-24 h-24 bg-rose-100/80 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-rose-100/50">
                                        <XCircle className="w-12 h-12 text-rose-600 stroke-[3]" />
                                    </div>

                                    <h2 className="text-3xl font-black text-foreground mb-2 font-headline tracking-tight">Payment Failed</h2>
                                    <p className="text-muted-foreground/80 mb-8 max-w-[280px] leading-relaxed">
                                        We couldn't process your payment. Please try again or use a different payment method.
                                    </p>

                                    <div className="bg-secondary/30 p-6 rounded-2xl border border-rose-100 w-full max-w-sm mb-8 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-rose-50/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-foreground font-medium">Status</span>
                                            <span className="text-xs font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full uppercase tracking-wider">FAILED</span>
                                        </div>
                                        <div className="h-px bg-slate-200/60 my-2" />
                                        <p className="text-xs text-muted-foreground/60 mt-2 text-left">
                                            Note: If money was deducted from your account, it will be refunded automatically by your bank within 3-5 business days.
                                        </p>
                                    </div>

                                    <Button
                                        size="lg"
                                        className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/30 mb-3"
                                        onClick={() => {
                                            setView('payment');
                                        }}
                                    >
                                        Try Again
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="w-full h-14 rounded-2xl text-base font-bold text-muted-foreground"
                                        onClick={() => setView('cart')}
                                    >
                                        Back to Cart
                                    </Button>
                                </div>
                            )}
                        </>
                    )
                }
            </SheetContent >
        </Sheet >
    );
}