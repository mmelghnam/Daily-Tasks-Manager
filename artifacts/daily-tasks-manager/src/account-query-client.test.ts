import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createAccountQueryClient } from './account-query-client.ts';

describe('account-scoped query cache', () => {
  it('never exposes the previous account onboarding or daily data', () => {
    const completedAccount = createAccountQueryClient();
    completedAccount.setQueryData(['/api/onboarding/status'], {
      completed: true,
      usageType: 'employee',
    });
    completedAccount.setQueryData(['/api/tasks'], [
      { id: 1, title: 'بيانات الحساب السابق' },
    ]);

    const newAccount = createAccountQueryClient();

    assert.equal(newAccount.getQueryData(['/api/onboarding/status']), undefined);
    assert.equal(newAccount.getQueryData(['/api/tasks']), undefined);

    newAccount.setQueryData(['/api/onboarding/status'], {
      completed: true,
      usageType: 'student',
    });

    const reloadedNewAccount = createAccountQueryClient();
    assert.equal(reloadedNewAccount.getQueryData(['/api/onboarding/status']), undefined);
    assert.equal(reloadedNewAccount.getQueryData(['/api/tasks']), undefined);
    assert.deepEqual(completedAccount.getQueryData(['/api/tasks']), [
      { id: 1, title: 'بيانات الحساب السابق' },
    ]);
  });
});
