'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnimatedButton } from '@/components/ui/animated-button';
import { AnimatedProgress } from '@/components/ui/animated-progress';
import { PlaidLinkButton } from '@/components/plaid';
import { BucketForm } from '@/components/buckets';
import { celebrations } from '@/components/ui/confetti';
import {
  Wallet,
  Building2,
  PiggyBank,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  ArrowRight,
} from 'lucide-react';
import type { SafeAccount, BucketConfig } from '@/types';

// Type from PlaidLinkButton
interface PlaidAccount {
  id: string;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  balance?: number;
}

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
  onSkip?: () => void;
}

interface OnboardingData {
  accounts: SafeAccount[];
  buckets: BucketConfig[];
  masterAccountId: string | null;
}

type OnboardingStep = 'welcome' | 'connect' | 'select-master' | 'create-buckets' | 'complete';

const STEPS: { id: OnboardingStep; title: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'welcome',
    title: 'Welcome to Flow',
    description: 'Let\'s set up your financial flow',
    icon: <Wallet className="h-6 w-6" />,
  },
  {
    id: 'connect',
    title: 'Connect Your Bank',
    description: 'Securely link your accounts',
    icon: <Building2 className="h-6 w-6" />,
  },
  {
    id: 'select-master',
    title: 'Choose Master Account',
    description: 'Select your main checking account',
    icon: <PiggyBank className="h-6 w-6" />,
  },
  {
    id: 'create-buckets',
    title: 'Create Buckets',
    description: 'Set up your allocation categories',
    icon: <Sparkles className="h-6 w-6" />,
  },
  {
    id: 'complete',
    title: 'All Set!',
    description: 'Your Flow is ready',
    icon: <Check className="h-6 w-6" />,
  },
];

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [accounts, setAccounts] = useState<SafeAccount[]>([]);
  const [buckets, setBuckets] = useState<BucketConfig[]>([]);
  const [masterAccountId, setMasterAccountId] = useState<string | null>(null);
  const [showBucketForm, setShowBucketForm] = useState(false);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const goToStep = useCallback((step: OnboardingStep) => {
    setCurrentStep(step);
  }, []);

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  }, [currentStepIndex]);

  const prevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  // Handle Plaid success - convert PlaidAccount to SafeAccount
  const handlePlaidSuccess = useCallback((plaidAccounts: PlaidAccount[]) => {
    const safeAccounts: SafeAccount[] = plaidAccounts.map(acc => ({
      accountId: acc.id,
      name: acc.name,
      mask: acc.mask,
      type: acc.type,
      subtype: acc.subtype,
      balance: acc.balance ?? 0,
      isMaster: false,
    }));
    setAccounts((prev) => [...prev, ...safeAccounts]);
    celebrations.bucketCreated();
    // Auto-advance to next step after short delay
    setTimeout(() => nextStep(), 1000);
  }, [nextStep]);

  // Handle master account selection
  const handleSelectMaster = useCallback((accountId: string) => {
    setMasterAccountId(accountId);
    // Mark as master in accounts
    setAccounts((prev) =>
      prev.map((a) => ({
        ...a,
        isMaster: a.accountId === accountId,
      }))
    );
    nextStep();
  }, [nextStep]);

  // Handle bucket creation
  const handleCreateBucket = useCallback((bucketData: Omit<BucketConfig, 'bucketId' | 'priority'>) => {
    const newBucket: BucketConfig = {
      ...bucketData,
      bucketId: `bucket-${Date.now()}`,
      priority: buckets.length + 1,
    };
    setBuckets((prev) => [...prev, newBucket]);
    setShowBucketForm(false);
    celebrations.bucketCreated();
  }, [buckets.length]);

  // Handle completion
  const handleComplete = useCallback(() => {
    celebrations.allocationComplete();
    onComplete({
      accounts,
      buckets,
      masterAccountId,
    });
  }, [accounts, buckets, masterAccountId, onComplete]);

  // Handle skip with demo data
  const handleSkipWithDemo = useCallback(() => {
    onSkip?.();
  }, [onSkip]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6"
          >
            <motion.div
              className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Wallet className="h-12 w-12 text-primary" />
            </motion.div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Welcome to Flow</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Flow helps you visualize and manage your money using the envelope budgeting method.
                Watch your income flow into buckets in real-time!
              </p>
            </div>

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <AnimatedButton size="lg" onClick={nextStep}>
                Get Started
                <ChevronRight className="h-4 w-4 ml-2" />
              </AnimatedButton>

              <Button variant="ghost" onClick={handleSkipWithDemo}>
                Skip and use demo data
              </Button>
            </div>
          </motion.div>
        );

      case 'connect':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6"
          >
            <div className="mx-auto w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Building2 className="h-12 w-12 text-blue-500" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Connect Your Bank</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Securely connect your bank account to see your real balances.
                We use Plaid for bank-level security.
              </p>
            </div>

            {accounts.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">
                      {accounts.length} account{accounts.length > 1 ? 's' : ''} connected!
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {accounts.map((account) => (
                      <li key={account.accountId}>
                        {account.name} (****{account.mask})
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3 justify-center">
                  <PlaidLinkButton
                    variant="outline"
                    onSuccess={handlePlaidSuccess}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Add Another Bank
                  </PlaidLinkButton>

                  <AnimatedButton onClick={nextStep}>
                    Continue
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </AnimatedButton>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <PlaidLinkButton size="lg" onSuccess={handlePlaidSuccess} />

                <Button variant="ghost" onClick={handleSkipWithDemo}>
                  Skip and use demo data
                </Button>
              </div>
            )}
          </motion.div>
        );

      case 'select-master':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
                <PiggyBank className="h-8 w-8 text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold">Choose Your Master Account</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Select the checking account where your income arrives.
                Buckets will be virtual allocations within this account.
              </p>
            </div>

            <div className="grid gap-3 max-w-md mx-auto">
              {accounts.map((account) => (
                <motion.button
                  key={account.accountId}
                  onClick={() => handleSelectMaster(account.accountId)}
                  className={`
                    w-full p-4 rounded-lg border-2 text-left transition-all
                    ${masterAccountId === account.accountId
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {account.institutionName} - ****{account.mask}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        ${account.balance?.toLocaleString() || '0.00'}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {account.plaidSubtype || account.plaidType}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </motion.div>
        );

      case 'create-buckets':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold">Create Your Buckets</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Buckets are categories for your money. Add a few to get started -
                you can always add more later.
              </p>
            </div>

            {buckets.length > 0 && (
              <div className="grid gap-2 max-w-md mx-auto">
                {buckets.map((bucket) => (
                  <div
                    key={bucket.bucketId}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{bucket.emoji || '📦'}</span>
                      <span className="font-medium">{bucket.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {bucket.allocationType === 'fixed_dollar'
                        ? `$${bucket.value}`
                        : `${(bucket.value * 100).toFixed(0)}%`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <AnimatedButton
                variant="outline"
                onClick={() => setShowBucketForm(true)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Add a Bucket
              </AnimatedButton>

              {buckets.length >= 2 && (
                <AnimatedButton onClick={nextStep}>
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </AnimatedButton>
              )}

              {buckets.length < 2 && (
                <p className="text-sm text-muted-foreground text-center">
                  Add at least 2 buckets to continue
                </p>
              )}
            </div>

            <div className="flex justify-center">
              <Button variant="ghost" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>

            {/* Bucket Form Dialog */}
            <BucketForm
              open={showBucketForm}
              onOpenChange={setShowBucketForm}
              onSubmit={handleCreateBucket}
              externalAccounts={accounts.filter((a) => a.accountId !== masterAccountId)}
            />
          </motion.div>
        );

      case 'complete':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center space-y-6"
          >
            <motion.div
              className="mx-auto w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            >
              <motion.div
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Check className="h-12 w-12 text-green-500" />
              </motion.div>
            </motion.div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">You&apos;re All Set!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your Flow is ready. Enter some income to see your money flow
                through your buckets in real-time!
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-muted-foreground">Accounts</p>
                  <p className="text-2xl font-bold">{accounts.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Buckets</p>
                  <p className="text-2xl font-bold">{buckets.length}</p>
                </div>
              </div>
            </div>

            <AnimatedButton size="lg" onClick={handleComplete}>
              Start Using Flow
              <ArrowRight className="h-4 w-4 ml-2" />
            </AnimatedButton>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar at top */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Wallet className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <AnimatedProgress
                value={progress}
                max={100}
                size="sm"
                color="default"
              />
            </div>
            <span className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {STEPS.length}
            </span>
          </div>

          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 text-xs ${
                  index <= currentStepIndex
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                    ${index < currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : index === currentStepIndex
                      ? 'bg-primary/20 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground'
                    }
                  `}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 container py-12">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-8 pb-8">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
