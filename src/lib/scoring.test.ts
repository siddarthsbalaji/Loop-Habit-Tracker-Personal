import { describe, expect, it } from 'vitest';
import {
  computeHabitStats,
  computeScoreStep,
  halfLifeDays,
  smoothingFactor,
} from './scoring';
import { RepValue, type FrequencyType } from '../types';
import { dayToIso } from './dates';

describe('Loop Scoring Algorithm', () => {
  it('calculates half life correctly based on frequency', () => {
    // Daily habit: targetCount = 1, targetDays = 1 -> freq = 1 -> halfLife = 13
    const daily = { targetCount: 1, targetDays: 1 };
    expect(halfLifeDays(daily)).toBeCloseTo(13, 2);

    // 1x a week: targetCount = 1, targetDays = 7 -> freq = 1/7 -> halfLife = 13 / sqrt(1/7) ≈ 34.395
    const weekly1 = { targetCount: 1, targetDays: 7 };
    expect(halfLifeDays(weekly1)).toBeCloseTo(13 * Math.sqrt(7), 2);

    // 4x a week: targetCount = 4, targetDays = 7 -> freq = 4/7
    const weekly4 = { targetCount: 4, targetDays: 7 };
    expect(halfLifeDays(weekly4)).toBeCloseTo(13 / Math.sqrt(4 / 7), 2);
  });

  it('calculates smoothing factor alpha = 0.5^(1/halfLife)', () => {
    const daily = { targetCount: 1, targetDays: 1 };
    const alpha = smoothingFactor(daily);
    expect(alpha).toBeCloseTo(Math.pow(0.5, 1 / 13), 5);
    expect(alpha).toBeGreaterThan(0.94);
    expect(alpha).toBeLessThan(0.96);
  });

  it('computes EMA score step correctly', () => {
    const alpha = 0.95;
    const prevScore = 0.5;
    const value = 1.0;
    // Score_t = prev * alpha + value * (1 - alpha)
    // 0.5 * 0.95 + 1.0 * 0.05 = 0.475 + 0.05 = 0.525
    expect(computeScoreStep(alpha, prevScore, value)).toBeCloseTo(0.525, 4);
  });

  it('computes streaks and scores for daily habit', () => {
    const today = 19000;
    const habit = {
      targetCount: 1,
      targetDays: 1,
      frequencyType: 'every_day' as FrequencyType,
      createdAt: (today - 10) * 86_400_000,
    };

    // 5 consecutive days of completed checkmarks ending today
    const reps = [
      { date: dayToIso(today - 4), value: RepValue.COMPLETED },
      { date: dayToIso(today - 3), value: RepValue.COMPLETED },
      { date: dayToIso(today - 2), value: RepValue.COMPLETED },
      { date: dayToIso(today - 1), value: RepValue.COMPLETED },
      { date: dayToIso(today), value: RepValue.COMPLETED },
    ];

    const stats = computeHabitStats(habit, reps, today);

    expect(stats.totalCompleted).toBe(5);
    expect(stats.currentStreak).toBe(5);
    expect(stats.bestStreak).toBe(5);
    expect(stats.score).toBeGreaterThan(0);
    expect(stats.score).toBeLessThanOrEqual(1.0);
  });

  it('preserves streaks and score when a day is SKIPPED', () => {
    const today = 19000;
    const habit = {
      targetCount: 1,
      targetDays: 1,
      frequencyType: 'every_day' as FrequencyType,
      createdAt: (today - 10) * 86_400_000,
    };

    // 2 days completed, 1 day skipped, 1 day completed today
    const reps = [
      { date: dayToIso(today - 3), value: RepValue.COMPLETED },
      { date: dayToIso(today - 2), value: RepValue.COMPLETED },
      { date: dayToIso(today - 1), value: RepValue.SKIPPED },
      { date: dayToIso(today), value: RepValue.COMPLETED },
    ];

    const stats = computeHabitStats(habit, reps, today);

    // Skipped day counts as positive continuation of streak in Loop!
    expect(stats.currentStreak).toBe(4);
    expect(stats.totalCompleted).toBe(3);
  });

  it('resets current streak when a day is missed', () => {
    const today = 19000;
    const habit = {
      targetCount: 1,
      targetDays: 1,
      frequencyType: 'every_day' as FrequencyType,
      createdAt: (today - 10) * 86_400_000,
    };

    // Checked 4 days ago and 3 days ago, but missed yesterday (today - 1) and today
    const reps = [
      { date: dayToIso(today - 4), value: RepValue.COMPLETED },
      { date: dayToIso(today - 3), value: RepValue.COMPLETED },
    ];

    const stats = computeHabitStats(habit, reps, today);
    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(2);
  });

  it('awards more points on consecutive days than on non-contiguous days', () => {
    const today = 19000;
    const habit = {
      targetCount: 1,
      targetDays: 1,
      frequencyType: 'every_day' as FrequencyType,
      createdAt: (today - 10) * 86_400_000,
    };

    // Scenario A: Two consecutive days (yesterday and today)
    const consecutiveReps = [
      { date: dayToIso(today - 1), value: RepValue.COMPLETED },
      { date: dayToIso(today), value: RepValue.COMPLETED },
    ];
    const statsConsecutive = computeHabitStats(habit, consecutiveReps, today);

    // Scenario B: Two non-contiguous days (2 days ago and today, with yesterday missed)
    const nonConsecutiveReps = [
      { date: dayToIso(today - 2), value: RepValue.COMPLETED },
      { date: dayToIso(today), value: RepValue.COMPLETED },
    ];
    const statsNonConsecutive = computeHabitStats(habit, nonConsecutiveReps, today);

    // Points earned on day 2 of consecutive streak is higher than day 1
    const day1Score = statsConsecutive.scores[statsConsecutive.scores.length - 2];
    const day2Score = statsConsecutive.scores[statsConsecutive.scores.length - 1];
    const day2Gain = day2Score - day1Score;
    expect(day2Gain).toBeGreaterThan(day1Score);

    // Total score for two consecutive days is strictly greater than two non-contiguous days
    expect(statsConsecutive.score).toBeGreaterThan(statsNonConsecutive.score);
  });
});
