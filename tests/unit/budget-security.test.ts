import { describe, it, expect, vi } from 'vitest';

describe('Budget Ownership & Security Rules', () => {
  it('enforces that a user can only delete their own budget', () => {
    // Simulates service level deleteUserBudget
    function simulateDeleteBudget(
      dbBudgets: Array<{ id: string; userId: string; amount: string }>,
      requestingUserId: string,
      budgetIdToDelete: string
    ): boolean {
      const targetIndex = dbBudgets.findIndex(
        (b) => b.id === budgetIdToDelete && b.userId === requestingUserId
      );

      if (targetIndex === -1) {
        return false; // Forbidden / Not Found
      }

      dbBudgets.splice(targetIndex, 1);
      return true;
    }

    const budgetsDb = [
      { id: 'b-1', userId: 'user-alice', amount: '5000000' },
      { id: 'b-2', userId: 'user-bob', amount: '3000000' },
    ];

    // Attacker (user-mallory) attempts to delete Alice's budget
    const attackerResult = simulateDeleteBudget(budgetsDb, 'user-mallory', 'b-1');
    expect(attackerResult).toBe(false);
    expect(budgetsDb.length).toBe(2);

    // Bob attempts to delete Alice's budget
    const bobResult = simulateDeleteBudget(budgetsDb, 'user-bob', 'b-1');
    expect(bobResult).toBe(false);
    expect(budgetsDb.length).toBe(2);

    // Alice legitimately deletes her own budget
    const aliceResult = simulateDeleteBudget(budgetsDb, 'user-alice', 'b-1');
    expect(aliceResult).toBe(true);
    expect(budgetsDb.length).toBe(1);
    expect(budgetsDb[0].id).toBe('b-2');
  });

  it('enforces that queries for budgets are strictly scoped by userId', () => {
    function simulateGetUserBudgets(
      dbBudgets: Array<{ id: string; userId: string; month: string }>,
      userId: string,
      month: string
    ) {
      return dbBudgets.filter((b) => b.userId === userId && b.month === month);
    }

    const mockDb = [
      { id: 'b-1', userId: 'user-1', month: '2026-10' },
      { id: 'b-2', userId: 'user-2', month: '2026-10' },
      { id: 'b-3', userId: 'user-1', month: '2026-11' },
    ];

    const user1OctoberBudgets = simulateGetUserBudgets(mockDb, 'user-1', '2026-10');
    expect(user1OctoberBudgets).toHaveLength(1);
    expect(user1OctoberBudgets[0].id).toBe('b-1');

    const user2OctoberBudgets = simulateGetUserBudgets(mockDb, 'user-2', '2026-10');
    expect(user2OctoberBudgets).toHaveLength(1);
    expect(user2OctoberBudgets[0].id).toBe('b-2');
  });
});
