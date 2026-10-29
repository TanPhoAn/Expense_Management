import { describe, it, expect } from 'vitest';

describe('Savings Goal Ownership & Security Rules', () => {
  it('enforces that a user can only delete their own savings goal', () => {
    function simulateDeleteGoal(
      goalsDb: Array<{ id: string; userId: string; name: string }>,
      requestingUserId: string,
      goalIdToDelete: string
    ): boolean {
      const targetIndex = goalsDb.findIndex(
        (g) => g.id === goalIdToDelete && g.userId === requestingUserId
      );

      if (targetIndex === -1) {
        return false;
      }

      goalsDb.splice(targetIndex, 1);
      return true;
    }

    const mockGoals = [
      { id: 'goal-1', userId: 'user-alice', name: 'iPhone 17' },
      { id: 'goal-2', userId: 'user-bob', name: 'Du lịch' },
    ];

    // Attacker Mallory attempts to delete Alice's goal
    expect(simulateDeleteGoal(mockGoals, 'user-mallory', 'goal-1')).toBe(false);
    expect(mockGoals).toHaveLength(2);

    // Bob attempts to delete Alice's goal
    expect(simulateDeleteGoal(mockGoals, 'user-bob', 'goal-1')).toBe(false);
    expect(mockGoals).toHaveLength(2);

    // Alice deletes her own goal
    expect(simulateDeleteGoal(mockGoals, 'user-alice', 'goal-1')).toBe(true);
    expect(mockGoals).toHaveLength(1);
    expect(mockGoals[0].id).toBe('goal-2');
  });

  it('enforces that a user cannot deposit or withdraw from another user goal', () => {
    function simulateActionGoal(
      goalsDb: Array<{ id: string; userId: string; currentAmount: number }>,
      requestingUserId: string,
      goalId: string,
      amount: number,
      type: 'DEPOSIT' | 'WITHDRAW'
    ): boolean {
      const goal = goalsDb.find((g) => g.id === goalId && g.userId === requestingUserId);
      if (!goal) return false;

      if (type === 'WITHDRAW' && amount > goal.currentAmount) return false;
      goal.currentAmount = type === 'DEPOSIT' ? goal.currentAmount + amount : goal.currentAmount - amount;
      return true;
    }

    const mockGoals = [
      { id: 'goal-1', userId: 'user-alice', currentAmount: 10_000_000 },
    ];

    // Bob tries to withdraw Alice's savings
    const bobResult = simulateActionGoal(mockGoals, 'user-bob', 'goal-1', 5_000_000, 'WITHDRAW');
    expect(bobResult).toBe(false);
    expect(mockGoals[0].currentAmount).toBe(10_000_000);

    // Alice legitimately withdraws her own savings
    const aliceResult = simulateActionGoal(mockGoals, 'user-alice', 'goal-1', 2_000_000, 'WITHDRAW');
    expect(aliceResult).toBe(true);
    expect(mockGoals[0].currentAmount).toBe(8_000_000);
  });
});
