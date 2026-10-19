import { describe, expect, it } from 'vitest';
import {
  buildCsvBundle,
  parseHabitsCsv,
  parseRepetitionsCsv,
  planFromTexts,
} from './loopCsv';
import { RepValue, type Habit, type Repetition } from '../types';

describe('Loop CSV Compatibility', () => {
  const sampleHabits: Habit[] = [
    {
      id: 'h1',
      name: 'Morning Meditation',
      description: '10 min',
      color: '#00897B',
      frequencyType: 'every_day',
      targetCount: 1,
      targetDays: 1,
      archived: false,
      order: 0,
      createdAt: 1700000000000,
    },
    {
      id: 'h2',
      name: 'Gym Workout',
      color: '#E64A19',
      frequencyType: 'x_days_per_week',
      targetCount: 3,
      targetDays: 7,
      archived: false,
      order: 1,
      createdAt: 1700000000000,
    },
  ];

  const sampleReps: Repetition[] = [
    { id: 'h1_2026-03-01', habitId: 'h1', date: '2026-03-01', value: RepValue.COMPLETED },
    { id: 'h1_2026-03-02', habitId: 'h1', date: '2026-03-02', value: RepValue.SKIPPED },
    { id: 'h2_2026-03-01', habitId: 'h2', date: '2026-03-01', value: RepValue.COMPLETED },
  ];

  it('generates Habits.csv and Repetitions.csv matching Loop schema', () => {
    const bundle = buildCsvBundle(sampleHabits, sampleReps, 20513);

    expect(bundle['Habits.csv']).toContain('Position,Name,Description,Color,Frequency_Num,Frequency_Den,Archived');
    expect(bundle['Habits.csv']).toContain('Morning Meditation');
    expect(bundle['Habits.csv']).toContain('#00897B');
    expect(bundle['Habits.csv']).toContain('Gym Workout');

    expect(bundle['Repetitions.csv']).toContain('Timestamp,Habit_Name,Value');
    expect(bundle['Repetitions.csv']).toContain('2026-03-01,Morning Meditation,2');
    expect(bundle['Repetitions.csv']).toContain('2026-03-02,Morning Meditation,3');
  });

  it('parses exported CSVs back cleanly', () => {
    const bundle = buildCsvBundle(sampleHabits, sampleReps, 20513);
    const parsedHabits = parseHabitsCsv(bundle['Habits.csv']);
    const parsedReps = parseRepetitionsCsv(bundle['Repetitions.csv']);

    expect(parsedHabits).toHaveLength(2);
    expect(parsedHabits[0].name).toBe('Morning Meditation');
    expect(parsedHabits[0].targetCount).toBe(1);
    expect(parsedHabits[0].targetDays).toBe(1);
    expect(parsedHabits[1].name).toBe('Gym Workout');
    expect(parsedHabits[1].targetCount).toBe(3);
    expect(parsedHabits[1].targetDays).toBe(7);

    expect(parsedReps).toHaveLength(3);
    const m1 = parsedReps.find((r) => r.habitName === 'Morning Meditation' && r.date === '2026-03-01');
    const m2 = parsedReps.find((r) => r.habitName === 'Morning Meditation' && r.date === '2026-03-02');
    const g1 = parsedReps.find((r) => r.habitName === 'Gym Workout' && r.date === '2026-03-01');

    expect(m1?.value).toBe(RepValue.COMPLETED);
    expect(m2?.value).toBe(RepValue.SKIPPED);
    expect(g1?.value).toBe(RepValue.COMPLETED);
  });

  it('handles official Loop Android CSV headers', () => {
    const loopAndroidHabitsCsv = `Position,Name,Question,Description,NumRepetitions,Interval,Color
1,Drink Water,Did you drink 2L water?,Daily goal,1,1,#039BE5
2,Running,5km run,,3,7,#F57C00`;

    const parsed = parseHabitsCsv(loopAndroidHabitsCsv);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('Drink Water');
    expect(parsed[0].description).toBe('Did you drink 2L water?');
    expect(parsed[0].targetCount).toBe(1);
    expect(parsed[0].targetDays).toBe(1);
    expect(parsed[0].color).toBe('#039BE5');

    expect(parsed[1].name).toBe('Running');
    expect(parsed[1].targetCount).toBe(3);
    expect(parsed[1].targetDays).toBe(7);
  });

  it('plans import correctly from file mapping', () => {
    const files = {
      'Habits.csv': `Position,Name,Description,Color,Frequency_Num,Frequency_Den\n1,Read,Pages,#7CB342,1,1`,
      'Repetitions.csv': `Timestamp,Habit_Name,Value\n2026-01-01,Read,2`,
    };

    const plan = planFromTexts(files);
    expect(plan.habits).toHaveLength(1);
    expect(plan.habits[0].name).toBe('Read');
    expect(plan.reps).toHaveLength(1);
    expect(plan.reps[0].habitName).toBe('Read');
    expect(plan.reps[0].date).toBe('2026-01-01');
    expect(plan.reps[0].value).toBe(RepValue.COMPLETED);
  });
});
