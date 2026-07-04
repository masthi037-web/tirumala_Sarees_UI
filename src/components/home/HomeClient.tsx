"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Catalog, ProductWithImage } from '@/lib/types';
import { cn, resolveImageUrl, slugify } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sparkles, Settings, Loader2, Search } from 'lucide-react';
import CatalogGrid from '@/components/products/CatalogGrid';
import { ProductGrid } from '@/components/products/ProductGrid';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { fetchProductsByCategoryAction } from '@/actions/product.actions';
import { ProductCard } from '@/components/products/ProductCard';

import { CompanyDetails } from '@/lib/api-types';
import { ProductInitializer } from '@/components/providers/ProductInitializer';
import { useProduct } from '@/hooks/use-product';
import { useTenant } from '@/components/providers/TenantContext';
import { MOCK_TENANT_CATEGORIES } from '@/data/mock-tenant-data';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { SilkShowcaseCanvas } from '@/components/home/SilkShowcaseCanvas';
import { SectionDivider } from '@/components/common/SectionDivider';

interface HomeClientProps {
    initialCategories: Category[];
    companyDetails: CompanyDetails | null;
    fetchAllAtOnce: boolean;
}

export default function HomeClient({ initialCategories, companyDetails, fetchAllAtOnce }: HomeClientProps) {
    const router = useRouter();

    const { categories, setCategories, isCategoryExpired, markCategoryAsFetched } = useProduct();
    
    const activeCategories = useMemo(() => {
        const baseCats = initialCategories.length > 0 ? initialCategories : categories;
        if (baseCats.length === 0) {
            return MOCK_TENANT_CATEGORIES;
        }
        return baseCats.map(cat => {
            const cachedCat = categories.find(c => c.id === cat.id);
            return {
                ...cat,
                catalogs: (cachedCat && cachedCat.catalogs && cachedCat.catalogs.length > 0)
                    ? cachedCat.catalogs
                    : cat.catalogs
            };
        });
    }, [initialCategories, categories]);

    const tenant = useTenant();
    const { theme, categoryPage, text, typography } = tenant;
    const categoryShape = theme?.categoryFrame || 'circle';

    const getShapeClass = (shape: string) => {
        switch (shape) {
            case 'square': return 'rounded-xl';
            case 'squircle': return 'rounded-[2rem]';
            default: return 'rounded-full';
        }
    };

    const shapeClass = getShapeClass(categoryShape);


    // Auth State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = () => {
            const storedLogin = localStorage.getItem('isLoggedIn') === 'true';
            const storedRole = localStorage.getItem('userRole');
            setIsLoggedIn(storedLogin);
            setUserRole(storedRole);
        };

        checkAuth();
        window.addEventListener('auth-change', checkAuth);
        return () => window.removeEventListener('auth-change', checkAuth);
    }, []);

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const handleCategoryClick = (categoryId: string) => {
        if (categoryPage) {
            const category = activeCategories.find(c => c.id === categoryId);
            const urlSlug = category ? slugify(category.name) : categoryId;
            router.push(`/category/${urlSlug}`);
        } else {
            setSelectedCategory(categoryId);

            setTimeout(() => {
                const element = document.getElementById('first-category-products');
                if (element) {
                    const yOffset = -80;
                    const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            }, 100);
        }
    };

    // --- Dynamic Category Product Grid Logic ---
    const firstCategoryId = activeCategories.length > 0 ? activeCategories[0].id : undefined;

    // If categoryPage is false, display the selected category. Otherwise, always display the first.
    const activeCategoryId = categoryPage ? firstCategoryId : (selectedCategory || firstCategoryId);
    const activeCategory = activeCategories.find(c => c.id === activeCategoryId);

    const [isLoadingCategory, setIsLoadingCategory] = useState<Record<string, boolean>>({});
    const fetchingRef = useRef<Record<string, boolean>>({});
    const mountTime = useRef(Date.now());

    const loadCategoryData = useCallback(async (categoryId: string) => {
        if (!categoryId || categoryId === 'undefined' || categoryId === 'null') return;
        const currentCategories = useProduct.getState().categories;
        if (!currentCategories || currentCategories.length === 0) return;

        const category = currentCategories.find(c => c.id === categoryId);
        if (!category) return;

        const expired = isCategoryExpired(categoryId);
        const serverCat = initialCategories.find(ic => ic.id === categoryId);
        const hasServerCatalogs = serverCat && serverCat.catalogs.length > 0;
        const isPreLoaded = !!hasServerCatalogs;
        const state = useProduct.getState();
        const timestampExists = state.categoryTimestamps && !!state.categoryTimestamps[categoryId];
        const shouldSkipAsPreloaded = isPreLoaded && !timestampExists;

        const timeSinceMount = Date.now() - mountTime.current;
        const isFreshMount = timeSinceMount < 10000;

        if ((category.catalogs.length === 0 || expired) && !isLoadingCategory[categoryId] && !fetchingRef.current[categoryId] && !shouldSkipAsPreloaded) {
            if (isPreLoaded && isFreshMount) return;

            fetchingRef.current[categoryId] = true;
            setIsLoadingCategory(prev => ({ ...prev, [categoryId]: true }));
            try {
                const fetchedCategory = await fetchProductsByCategoryAction(categoryId, companyDetails?.deliveryBetween);
                if (fetchedCategory) {
                    setCategories(prev => prev.map(c => c.id === categoryId ? {
                        ...c,
                        ...fetchedCategory,
                        name: fetchedCategory.name || c.name,
                        categoryImage: fetchedCategory.categoryImage || c.categoryImage,
                        catalogs: fetchedCategory.catalogs
                    } : c));
                    markCategoryAsFetched(categoryId);
                    return fetchedCategory;
                }
            } catch (error) {
                console.error("Failed to load category", error);
            } finally {
                fetchingRef.current[categoryId] = false;
                setIsLoadingCategory(prev => ({ ...prev, [categoryId]: false }));
            }
        }
    }, [initialCategories, companyDetails?.deliveryBetween, isLoadingCategory, isCategoryExpired, markCategoryAsFetched, setCategories]);

    useEffect(() => {
        if (activeCategoryId) {
            loadCategoryData(activeCategoryId);
        }
    }, [activeCategoryId, loadCategoryData]);

    const catalogs: Catalog[] = activeCategory ? activeCategory.catalogs : [];
    const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);

    useEffect(() => {
        if (activeCategory && activeCategory.catalogs.length > 0) {
            if (!selectedCatalogId || !activeCategory.catalogs.some(c => c.id === selectedCatalogId)) {
                setSelectedCatalogId(activeCategory.catalogs[0].id);
            }
        }
    }, [activeCategory, selectedCatalogId]);

    const selectedCatalog = catalogs.find(c => c.id === selectedCatalogId);
    const imageMap = useMemo(() => new Map(PlaceHolderImages.map(img => [img.id, img])), []);

    const [searchQuery, setSearchQuery] = useState("");
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [searchDropdownResults, setSearchDropdownResults] = useState<ProductWithImage[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);

    const allCategoryProducts: ProductWithImage[] = useMemo(() => {
        return activeCategory ? activeCategory.catalogs.flatMap(catalog =>
            catalog.products.map(p => {
                const image = imageMap.get(p.imageId);
                return {
                    ...p,
                    imageHint: image?.imageHint || 'product image',
                    imageUrl: resolveImageUrl(p.productImage || (p.images && p.images.length > 0 ? p.images[0] : '') || '')
                };
            })
        ) : [];
    }, [activeCategory, imageMap]);

    const allNewArrivals: ProductWithImage[] = useMemo(() => {
        return activeCategory ? activeCategory.catalogs.flatMap(c => c.products)
            .filter(p => {
                const created = new Date(p.createdAt);
                const now = new Date();
                return (Math.abs(now.getTime() - created.getTime()) / (1000 * 60 * 60)) <= 48;
            })
            .map(p => {
                const image = imageMap.get(p.imageId);
                return {
                    ...p,
                    imageHint: image?.imageHint || 'product image',
                    imageUrl: resolveImageUrl(p.productImage || (p.images && p.images.length > 0 ? p.images[0] : '') || '')
                }
            })
            .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
            : [];
    }, [activeCategory, imageMap]);
    const newArrivals = useMemo(() => allNewArrivals.slice(0, 5), [allNewArrivals]);

    const allFamousProducts: ProductWithImage[] = useMemo(() => {
        return activeCategory ? activeCategory.catalogs.flatMap(c => c.products)
            .filter(p => p.famous)
            .map(p => {
                const image = imageMap.get(p.imageId);
                return {
                    ...p,
                    imageHint: image?.imageHint || 'product image',
                    imageUrl: resolveImageUrl(p.productImage || (p.images && p.images.length > 0 ? p.images[0] : '') || '')
                }
            })
            .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
            : [];
    }, [activeCategory, imageMap]);
    const famousProducts = useMemo(() => allFamousProducts.slice(0, 8), [allFamousProducts]);

    const baseProducts: ProductWithImage[] = useMemo(() => {
        if (selectedCatalog) {
            return selectedCatalog.products.map(p => {
                const image = imageMap.get(p.imageId);
                return {
                    ...p,
                    imageHint: image?.imageHint || 'product image',
                    imageUrl: resolveImageUrl(p.productImage || (p.images && p.images.length > 0 ? p.images[0] : '') || '')
                };
            });
        }
        if (activeCategory) {
            return activeCategory.catalogs.flatMap(catalog =>
                catalog.products.map(p => {
                    const image = imageMap.get(p.imageId);
                    return {
                        ...p,
                        imageHint: image?.imageHint || 'product image',
                        imageUrl: resolveImageUrl(p.productImage || (p.images && p.images.length > 0 ? p.images[0] : '') || '')
                    };
                })
            );
        }
        return [];
    }, [selectedCatalog, activeCategory, imageMap]);

    useEffect(() => {
        if (searchQuery.trim() && activeCategory) {
            const results = allCategoryProducts.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setSearchDropdownResults(results);
            setShowSearchDropdown(true);
        } else {
            setSearchDropdownResults(prev => prev.length === 0 ? prev : []);
            setShowSearchDropdown(prev => prev === false ? prev : false);
        }
    }, [searchQuery, activeCategory, allCategoryProducts]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchProductClick = (productId: string) => {
        setShowSearchDropdown(false);
        setSearchQuery('');
        router.push(`/product/${productId}`);
    };

    const visibleCategories = activeCategories;
    const spotlightProducts = baseProducts.slice(0, 4);
    const curatedProducts = famousProducts.length > 0 ? famousProducts.slice(0, 3) : baseProducts.slice(0, 3);
    const heroStats = [
        { label: 'Collections', value: String(visibleCategories.length).padStart(2, '0') },
        { label: 'Curated Pieces', value: String(baseProducts.length || allCategoryProducts.length).padStart(2, '0') },
    ];

    // --- End First Category Product Grid Logic ---

    if (userRole?.includes('OWNER')) {
        return (
            <div className="relative min-h-screen flex flex-col items-center justify-center text-center p-4 overflow-hidden">
                <div className="absolute inset-0 bg-dot-grid" />
                <div className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full bg-accent/5 blur-[100px]" />
                <div className="liquid-glass p-8 rounded-3xl max-w-md mx-auto">
                    <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center mb-4 mx-auto">
                        <Settings className="h-10 w-10 text-accent" />
                    </div>
                    <h1 className="text-2xl font-bold font-headline text-foreground">Admin Dashboard</h1>
                    <p className="text-muted-foreground mt-2 max-w-xs mx-auto font-light">
                        Please use the Profile Sidebar {'>'} Settings to access your admin controls.
                    </p>
                    <div className="mt-8 flex gap-4 justify-center">
                        <Button variant="outline" onClick={() => window.dispatchEvent(new Event('open-profile-sidebar'))} className="border-accent/30 text-accent hover:bg-accent/5 rounded-xl">
                            Open Sidebar
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-transparent min-h-screen">
            <div className="relative space-y-14 pb-20">

                {(initialCategories.length > 0 || activeCategories.length > 0) && (
                    <ProductInitializer categories={activeCategories} companyDetails={companyDetails} />
                )}

                {isLoggedIn && userRole?.includes('CUSTOMER') && companyDetails?.companyPhone && (
                    <WhatsAppButton phoneNumber={companyDetails.companyPhone} companyName={companyDetails.companyName} />
                )}

                <div className="container mx-auto px-4 relative z-10 space-y-20">
                    <section id="shop-now" className="scroll-mt-24">
                        <div className="bg-[#f9f6f0] relative border border-[#f2f2f2] p-6 md:p-8 rounded-none">
                            <div className="flex flex-col gap-8">
                                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                    <div className="max-w-2xl space-y-4">
                                        <div className="inline-flex items-center gap-2 rounded-none border border-primary/20 bg-primary/5 px-4 py-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Editorial Selection</span>
                                        </div>
                                        <h2
                                            className="max-w-3xl text-3xl md:text-5xl font-headline leading-tight text-[#1a1a1a]"
                                            style={{
                                                fontWeight: '600',
                                                letterSpacing: '0.02em'
                                            }}
                                        >
                                            Draped in heritage, <br />
                                            <span className="font-script text-primary text-3xl md:text-4xl capitalize tracking-normal block mt-2">styled like a modern boutique.</span>
                                        </h2>
                                        <p className="max-w-xl text-xs md:text-sm leading-relaxed text-[#555]">
                                            We reworked the storefront into a richer fashion editorial experience: deeper contrast, more dramatic product framing, curated rails, and premium browsing moments for every collection.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 md:min-w-[260px]">
                                        {heroStats.map((stat) => (
                                            <div key={stat.label} className="rounded-none border border-[#f2f2f2] bg-white px-3 py-4 text-center">
                                                <div className="font-headline text-3xl font-bold text-primary">{stat.value}</div>
                                                <div className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
                                    <div className="rounded-none border border-[#f2f2f2] bg-white px-5 py-6 text-[#1a1a1a]">
                                        <div className="text-[10px] uppercase tracking-wider text-[#1a1a1a]/60 font-semibold mb-4">Category Atlas</div>
                                        <div className="flex flex-wrap gap-2.5">
                                            {visibleCategories.map((category) => {
                                                const isActive = !categoryPage && (selectedCategory || firstCategoryId) === category.id;

                                                return (
                                                    <button
                                                        key={category.id}
                                                        onClick={() => handleCategoryClick(category.id)}
                                                        className={cn(
                                                            "group flex items-center gap-3 rounded-none border px-3 py-2 transition-all duration-300",
                                                            isActive
                                                                ? "border-primary bg-primary text-white"
                                                                : "border-[#f2f2f2] bg-white hover:border-primary text-[#1a1a1a]"
                                                        )}
                                                    >
                                                        <div className="rounded-none h-9 w-9 overflow-hidden border border-[#f2f2f2] bg-white shrink-0">
                                                            {category.categoryImage ? (
                                                                <img src={resolveImageUrl(category.categoryImage)} alt={category.name} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="flex h-full w-full items-center justify-center text-primary">
                                                                    <Sparkles className="h-3 w-3" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-left text-[10px] font-bold uppercase tracking-wider">{category.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Editorial Poster Card */}
                                        <div className="relative overflow-hidden aspect-[4/3] w-full mt-8 group bg-secondary/15 border border-[#f2f2f2]">
                                            <img
                                                src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop"
                                                alt="Heritage Handloom"
                                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                            />
                                            {/* Luxury Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 flex flex-col justify-end p-6" />
                                            
                                            {/* Text Content */}
                                            <div className="absolute inset-0 p-6 flex flex-col justify-end text-left space-y-2">
                                                <span className="text-[9px] uppercase tracking-[0.25em] text-primary font-bold">The Heritage Edit</span>
                                                <h3 className="font-headline text-lg font-bold text-white uppercase tracking-wider">Classic Weaves</h3>
                                                <p className="text-[11px] text-white/70 font-light leading-relaxed max-w-xs">
                                                    Discover the finest zari borders and traditional handlooms crafted by master artisans.
                                                </p>
                                                <div className="pt-2">
                                                    <button
                                                        onClick={() => router.push('/category/sarees')}
                                                        className="inline-flex items-center text-[10px] uppercase tracking-widest font-bold text-white border-b border-white hover:text-primary hover:border-primary transition-colors pb-0.5"
                                                    >
                                                        Explore Legacy
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-none border border-[#f2f2f2] bg-white p-5">
                                        <div className="mb-4 flex items-center justify-between">
                                            <div className="text-[10px] uppercase tracking-wider text-[#1a1a1a]/60 font-semibold">Spotlight Rail</div>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {curatedProducts.map((product, index) => (
                                                <button
                                                    key={product.id}
                                                    onClick={() => handleSearchProductClick(product.id)}
                                                    className={cn(
                                                        "group relative overflow-hidden rounded-none border border-[#f2f2f2] bg-white p-3.5 text-left transition-all duration-300 hover:border-primary",
                                                        index === 0 && "sm:col-span-2"
                                                    )}
                                                >
                                                    <div className={cn("grid gap-3.5", index === 0 ? "sm:grid-cols-[1fr_0.85fr]" : "")}>
                                                        <div className="space-y-2 flex flex-col justify-between">
                                                            <div>
                                                                <div className="text-[9px] uppercase tracking-wider text-primary font-bold">Editor&apos;s pick</div>
                                                                <h3 className="font-headline text-lg font-bold leading-tight text-[#1a1a1a] mt-1">{product.name}</h3>
                                                                <p className="line-clamp-2 text-xs text-[#555] mt-1">{product.description}</p>
                                                            </div>
                                                            <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Discover piece</div>
                                                        </div>
                                                        <div className={cn("relative overflow-hidden rounded-none bg-[#f2f2f2]", index === 0 ? "min-h-[160px]" : "min-h-[120px]") }>
                                                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Interactive 3D Fabric Explorer */}
                    <div className="w-full relative z-10 my-4">
                        <SilkShowcaseCanvas />
                    </div>

                    <SectionDivider />

                    {/* Categories Showcase Section */}
                    <section className="py-12 bg-white relative z-10 border-y border-border/20">
                        <div className="container mx-auto px-4 text-center space-y-10">
                            <div className="space-y-3">
                                <span className="font-script text-3xl text-primary block leading-none">Curated Rails</span>
                                <h2 className="font-headline text-3xl md:text-5xl font-medium tracking-wide text-[#1a1a1a]">Explore Categories</h2>
                                <div className="w-16 h-px bg-primary/45 mx-auto mt-2" />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                                {activeCategories.map((category) => {
                                    const catSlug = slugify(category.name);
                                    return (
                                        <div
                                            key={category.id}
                                            onClick={() => router.push(`/category/${catSlug}`)}
                                            className="group cursor-pointer relative overflow-hidden bg-[#f9f6f0] border border-[#f2f2f2] aspect-[3/4] rounded-none shadow-sm hover:shadow-md transition-all duration-500 hover:border-primary"
                                        >
                                            {/* Zooming Image */}
                                            <div className="absolute inset-0 overflow-hidden">
                                                <img
                                                    src={resolveImageUrl(category.categoryImage || '') || 'https://picsum.photos/seed/cat/400/500'}
                                                    alt={category.name}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                                {/* Gradient Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                            </div>
                                            
                                            {/* Text Overlay */}
                                            <div className="absolute inset-0 flex flex-col justify-end p-6 text-left">
                                                <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Collection</span>
                                                <h3 className="font-headline text-xl font-bold text-white uppercase tracking-wider mt-1">{category.name}</h3>
                                                <div className="w-8 h-[1px] bg-primary mt-2 group-hover:w-16 transition-all duration-300" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    <SectionDivider />

                    {(() => {
                        const sareesCat = activeCategories.find(c => c.name.toLowerCase() === 'sarees' || slugify(c.name) === 'sarees');
                        const targetCategories = sareesCat ? [sareesCat] : (activeCategories.length > 0 ? [activeCategories[0]] : []);
                        
                        return targetCategories.map((category) => {
                            const catProducts = category.catalogs.flatMap(catalog =>
                                catalog.products.map(p => {
                                    const image = imageMap.get(p.imageId);
                                    return {
                                        ...p,
                                        imageHint: image?.imageHint || 'product image',
                                        imageUrl: resolveImageUrl(p.productImage || (p.images && p.images.length > 0 ? p.images[0] : '') || '')
                                    };
                                })
                            );

                            if (catProducts.length === 0) {
                                if (isLoadingCategory[category.id]) {
                                    return (
                                        <div key={category.id} className="space-y-6 py-10">
                                            <div className="flex items-center justify-between border-b border-[#f2f2f2] pb-4">
                                                <div className="space-y-2">
                                                    <div className="inline-flex items-center gap-2 rounded-none border border-primary/20 bg-primary/5 px-3 py-1">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">{category.name}</span>
                                                    </div>
                                                    <h3 className="font-headline text-3xl font-semibold text-[#1a1a1a] uppercase tracking-wide">
                                                        {category.name} Highlights
                                                    </h3>
                                                </div>
                                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }

                            const previewProducts = catProducts;
                            const catSlug = slugify(category.name);

                            return (
                                <section key={category.id} className="space-y-8 scroll-mt-24">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[#f2f2f2] pb-4">
                                        <div>
                                            <div className="inline-flex items-center gap-2 rounded-none border border-primary/20 bg-primary/5 px-3 py-1 mb-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Current Edit</span>
                                            </div>
                                            <h3 className="font-headline text-3xl font-semibold text-[#1a1a1a] uppercase tracking-wide">
                                                {category.name} Highlights
                                            </h3>
                                        </div>
                                        <button
                                            onClick={() => router.push(`/category/${catSlug}`)}
                                            className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary border-b border-primary pb-0.5 hover:text-[#1a1a1a] hover:border-[#1a1a1a] transition-all duration-300"
                                        >
                                            Explore Full Collection
                                            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6 pb-6">
                                        {previewProducts.map((product) => (
                                            <div key={product.id}>
                                                <ProductCard product={product} hideDescription={true} />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
    );
}
