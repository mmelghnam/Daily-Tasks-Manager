import { lazy, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { QueryClientProvider, useIsFetching } from '@tanstack/react-query';
import { ClerkProvider, Show, SignIn, SignUp, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { arSA } from '@clerk/localizations';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { OnboardingGuard } from '@/components/onboarding-guard';
import { DashboardHydrationGuard } from '@/components/dashboard-hydration-guard';
import { CommandCenterLoader } from '@/components/command-center-loader';
import { createAccountQueryClient } from '@/account-query-client';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const Home = lazy(() => import('@/pages/home-optimized'));
const Landing = lazy(() => import('@/pages/landing'));
const Admin = lazy(() => import('@/pages/admin'));
const NotFound = lazy(() => import('@/pages/not-found'));

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');

const clerkAppearance = {
  cssLayerName: 'clerk',
  theme: 'simple' as const,
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: 'bottom' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
  variables: {
    colorPrimary: '#2e625b', colorForeground: '#203d3a', colorMutedForeground: '#657b76',
    colorDanger: '#cf6050', colorBackground: '#fffdf8', colorInput: '#f5f0e7',
    colorInputForeground: '#203d3a', colorNeutral: '#ded4c4', fontFamily: 'Cairo, sans-serif', borderRadius: '0.9rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'w-[440px] max-w-full overflow-hidden rounded-[1.5rem] bg-[#fffdf8] shadow-xl shadow-primary/10',
    card: '!border-0 !bg-transparent !shadow-none', footer: '!border-0 !bg-transparent !shadow-none',
    headerTitle: 'text-[#203d3a] font-extrabold', headerSubtitle: 'text-[#657b76] font-semibold',
    socialButtonsBlockButtonText: 'text-[#203d3a] font-bold', formFieldLabel: 'text-[#203d3a] font-bold',
    footerActionLink: 'text-[#2e625b] font-extrabold', footerActionText: 'text-[#657b76] font-semibold',
    dividerText: 'text-[#657b76] font-semibold', identityPreviewEditButton: 'text-[#2e625b] font-bold',
    formFieldSuccessText: 'text-[#2e625b] font-bold', alertText: 'text-[#203d3a] font-semibold', logoBox: 'mb-2',
    logoImage: 'h-12 w-12', socialButtonsBlockButton: 'border-[#ded4c4] bg-white hover:bg-[#f5f0e7]',
    formButtonPrimary: 'bg-[#2e625b] hover:bg-[#244e48] text-[#fffdf8] font-extrabold',
    formFieldInput: 'border-[#ded4c4] bg-[#f5f0e7] text-[#203d3a]', footerAction: 'bg-[#f5f0e7]',
    dividerLine: 'bg-[#ded4c4]', alert: 'border-[#ead3ca] bg-[#fff2ed]',
    otpCodeFieldInput: 'border-[#ded4c4] bg-[#f5f0e7] text-[#203d3a]', formFieldRow: 'gap-2', main: 'gap-5',
  },
};

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

function HomeRedirect() {
  const { isLoaded } = useUser();
  if (!isLoaded) return <Landing />;
  return <><Show when="signed-in"><Redirect to="/app" /></Show><Show when="signed-out"><Landing /></Show></>;
}

function AccountLoadingScreen() {
  return <div className="min-h-[100dvh] task-shell noise-overlay flex items-center justify-center px-6" dir="rtl" data-testid="status-account-loading"><div className="rounded-3xl border border-border bg-card/85 px-8 py-7 text-center shadow-xl"><div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-primary/20 border-t-primary"/><p className="text-base font-extrabold">جارٍ تجهيز مساحتك</p></div></div>;
}

function RouteLoadingScreen() {
  return <div className="task-shell flex min-h-[100dvh] items-center justify-center" dir="rtl"><div className="flex items-center gap-3 rounded-2xl border bg-card/80 px-5 py-4 text-sm font-extrabold"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary"/>جارٍ تحميل الجزء المطلوب...</div></div>;
}

function AppRoute() {
  const { isLoaded } = useUser();
  if (!isLoaded) return <AccountLoadingScreen />;
  return <><Show when="signed-in"><OnboardingGuard><DashboardHydrationGuard><><Home /><CommandCenterLoader /></></DashboardHydrationGuard></OnboardingGuard></Show><Show when="signed-out"><Redirect to="/" /></Show></>;
}

function AuthShell({ children }: { children: ReactNode }) {
  return <div className="noise-overlay task-shell flex min-h-[100dvh] items-center justify-center px-4 py-10"><div className="relative w-full">{children}</div></div>;
}

function SignInPage() { return <AuthShell><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthShell>; }
function SignUpPage() { return <AuthShell><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthShell>; }

function AccountQueryClientProvider({ children }: { children: ReactNode }) {
  const { isLoaded, user } = useUser();
  const accountId = isLoaded ? user?.id ?? 'signed-out' : 'loading';
  const accountQueryClient = useMemo(createAccountQueryClient, [accountId]);
  useEffect(() => () => { void accountQueryClient.cancelQueries(); accountQueryClient.clear(); }, [accountQueryClient]);
  return <QueryClientProvider key={accountId} client={accountQueryClient}>{children}</QueryClientProvider>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { isLoaded, user } = useUser();
  const isFetching = useIsFetching();
  const accountId = isLoaded ? user?.id ?? 'signed-out' : 'loading';
  return <ErrorBoundary resetKey={`${location}:${accountId}:${isFetching}`}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Suspense fallback={<RouteLoadingScreen />}><Switch>
    <Route path="/" component={HomeRedirect}/><Route path="/app" component={AppRoute}/><Route path="/admin" component={Admin}/>
    <Route path="/sign-in/*?" component={SignInPage}/><Route path="/sign-up/*?" component={SignUpPage}/><Route component={NotFound}/>
  </Switch></Suspense></RoutedErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={arSA} routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}>
    <AccountQueryClientProvider><TooltipProvider><Router/><Toaster/></TooltipProvider></AccountQueryClientProvider>
  </ClerkProvider>;
}

export default function AppOptimized() {
  return <WouterRouter base={basePath}><ClerkProviderWithRoutes/></WouterRouter>;
}
