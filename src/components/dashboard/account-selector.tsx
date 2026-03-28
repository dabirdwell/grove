'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Building } from 'lucide-react';
import type { SafeAccount } from '@/types';

interface AccountSelectorProps {
  accounts: SafeAccount[];
  selectedAccountId?: string;
  onSelect: (accountId: string) => void;
  title?: string;
  description?: string;
}

export function AccountSelector({
  accounts,
  selectedAccountId,
  onSelect,
  title = 'Select Master Account',
  description = 'Choose which account receives your income',
}: AccountSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {accounts.map((account) => (
            <Button
              key={account.accountId}
              variant={selectedAccountId === account.accountId ? 'default' : 'outline'}
              className="w-full justify-start h-auto py-3 px-4"
              onClick={() => onSelect(account.accountId)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="flex-shrink-0">
                  {selectedAccountId === account.accountId ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Building className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">
                    {account.nickname || account.name}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    {account.institutionName && (
                      <span>{account.institutionName}</span>
                    )}
                    {account.mask && (
                      <span>****{account.mask}</span>
                    )}
                    {account.plaidSubtype && (
                      <Badge variant="secondary" className="text-xs">
                        {account.plaidSubtype}
                      </Badge>
                    )}
                  </div>
                </div>
                {account.balance !== undefined && (
                  <div className="text-right">
                    <span className="font-semibold money-amount">
                      ${account.balance.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
