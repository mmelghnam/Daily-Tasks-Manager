import { useMemo, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, Show, SignIn, SignUp, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { arSA } from '@clerk/localizations';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import Landing from '@/pages/landing';
import Admin from '@/pages/admin';
import { OnboardingGuard } from '@/components/onboarding-guard';
import { createAccountQueryClient } from '@/account-query-client';
import {
  Redirect,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

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
    colorPrimary: '#2e625b',
    colorForeground: '#203d3a',
    colorMutedForeground: '#657b76',
    colorDanger: '#cf6050',
    colorBackground: '#fffdf8',
    colorInput: '#f5f0e7',
    colorInputForeground: '#203d3a',
    colorNeutral: '#ded4c4',
    fontFamily: 'Cairo, sans-serif',
    borderRadius: '0.9rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'w-[440px] max-w-full overflow-hidden rounded-[1.5rem] bg-[#fffdf8] shadow-xl shadow-primary/10',
    card: '!border-0 !bg-transparent !shadow-none',
    footer: '!border-0 !bg-transparent !shadow-none',
    headerTitle: 'text-[#203d3a] font-extrabold',
    headerSubtitle: 'text-[#657b76] font-semibold',
    socialButtonsBlockButtonText: 'text-[#203d3a] font-bold',
    formFieldLabel: 'text-[#203d3a] font-bold',
    footerActionLink: 'text-[#2e625b] font-extrabold',
    footerActionText: 'text-[#657b76] font-semibold',
    dividerText: 'text-[#657b76] font-semibold',
    identityPreviewEditButton: 'text-[#2e625b] font-bold',
    formFieldSuccessText: 'text-[#2e625b] font-bold',
    alertText: 'text-[#203d3a] font-semibold',
    logoBox: 'mb-2',
    logoImage: 'h-12 w-12',
    socialButtonsBlockButton: 'border-[#ded4c4] bg-white hover:bg-[#f5f0e7]',
    formButtonPrimary: 'bg-[#2e625b] hover:bg-[#244e48] text-[#fffdf8] font-extrabold',
    formFieldInput: 'border-[#ded4c4] bg-[#f5f0e7] text-[#203d3a]',
    footerAction: 'bg-[#f5f0e7]',
    dividerLine: 'bg-[#ded4c4]',
    alert: 'border-[#ead3ca] bg-[#fff2ed]',
    otpCodeFieldInput: 'border-[#ded4c4] bg-[#f5f0e7] text-[#203d3a]',
    formFieldRow: 'gap-2',
    main: 'gap-5',
  },
};

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/app" /></Show>
      <Show when="signed-out"><Landing /></Show>
    </>
  );
}

function AppRoute() {
  return (
    <>
      <Show when="signed-in">
        <OnboardingGuard>
          <Home />
        </OnboardingGuard>
      </Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="noise-overlay task-shell flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-56 bg-gradient-to-b from-secondary/15 to-transparent" />
      <div className="relative w-full">
        {children}
      </div>
    </div>
  );
}

function SignInPage() {
  return <AuthShell><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthShell>;
}

function SignUpPage() {
  return <AuthShell><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthShell>;
}

function AccountLoadingScreen() {
  return (
    <div
      className="min-h-[100dvh] task-shell noise-overlay"
      dir="rtl"
      data-testid="status-account-loading"
    />
  );
}

function AccountQueryClientProvider({ children }: { children: ReactNode }) {
  const { isLoaded, user } = useUser();
  const accountId = isLoaded ? user?.id ?? 'signed-out' : 'loading';
  const accountQueryClient = useMemo(createAccountQueryClient, [accountId]);

  if (!isLoaded) {
    return <AccountLoadingScreen />;
  }

  return (
    <QueryClientProvider key={accountId} client={accountQueryClient}>
      {children}
    </QueryClientProvider>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/app" component={AppRoute} />
        <Route path="/admin" component={Admin} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={arSA}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <AccountQueryClientProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </AccountQueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
