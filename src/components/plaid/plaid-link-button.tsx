'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';
import { AnimatedButton } from '@/components/ui/animated-button';
import { Loader2, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PlaidLinkButtonProps {
  onSuccess?: (accounts: PlaidAccount[]) => void;
  onExit?: () => void;
  className?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'xl';
}

interface PlaidAccount {
  id: string;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  balance?: number;
}

type LinkStatus = 'idle' | 'loading' | 'ready' | 'connecting' | 'success' | 'error';

export function PlaidLinkButton({
  onSuccess,
  onExit,
  className,
  children,
  variant = 'default',
  size = 'default',
}: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState<LinkStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Fetch link token on mount
  useEffect(() => {
    const fetchLinkToken = async () => {
      setStatus('loading');
      setError(null);

      try {
        const response = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create link token');
        }

        const { linkToken } = await response.json();
        setLinkToken(linkToken);
        setStatus('ready');
      } catch (err) {
        console.error('Error fetching link token:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setStatus('error');
      }
    };

    fetchLinkToken();
  }, []);

  // Handle successful link
  const handleSuccess: PlaidLinkOnSuccess = useCallback(
    async (publicToken, metadata) => {
      setStatus('connecting');

      try {
        // Exchange public token for access token
        const response = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicToken,
            metadata,
            userId: 'demo-user',
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to link account');
        }

        const { accounts } = await response.json();

        setStatus('success');
        toast.success('Account linked successfully!', {
          description: `Connected ${accounts.length} account(s) from ${metadata.institution?.name || 'your bank'}`,
        });

        onSuccess?.(accounts);
      } catch (err) {
        console.error('Error exchanging token:', err);
        setError(err instanceof Error ? err.message : 'Failed to link account');
        setStatus('error');
        toast.error('Failed to link account', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [onSuccess]
  );

  // Handle exit
  const handleExit = useCallback(() => {
    onExit?.();
  }, [onExit]);

  // Plaid Link configuration
  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: handleExit,
  };

  const { open, ready } = usePlaidLink(config);

  // Button click handler
  const handleClick = () => {
    if (ready && linkToken) {
      open();
    }
  };

  // Render based on status
  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Initializing...</span>
          </>
        );
      case 'connecting':
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Connecting...</span>
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle2 className="h-4 w-4" />
            <span>Connected!</span>
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="h-4 w-4" />
            <span>Retry Connection</span>
          </>
        );
      default:
        return children || (
          <>
            <Building2 className="h-4 w-4" />
            <span>Connect Bank Account</span>
          </>
        );
    }
  };

  return (
    <AnimatedButton
      onClick={handleClick}
      disabled={!ready || status === 'loading' || status === 'connecting'}
      variant={status === 'success' ? 'success' : status === 'error' ? 'destructive' : variant}
      size={size}
      className={className}
      success={status === 'success'}
      loading={status === 'loading' || status === 'connecting'}
    >
      {renderContent()}
    </AnimatedButton>
  );
}
