-- Shave every 2 days instead of 3 (Yoyo's request). KEEP IN SYNC with src/config/rules.ts.

create or replace function public.game_rules() returns jsonb
language sql immutable set search_path = ''
as $$
  select '{
    "timeZone": "Europe/London",
    "statMin": 5,
    "statMax": 100,
    "moodTreatment": 15,
    "coins": {
      "waterCupApproved": 5, "choreOnTime": 5, "handScorePlus": 2,
      "perfectStreak": 30, "perfectStreakDays": 7, "cookedWish": 10, "shoppingListCleared": 5
    },
    "water": {
      "dailyGoalYoyo": 8, "requestRepingMinutes": 30, "snoozeMinutes": 30, "maxSnoozesPerDay": 2,
      "photoRetentionDays": 14, "selfReminderHours": [10, 13, 16, 19], "paceStartHour": 8, "paceEndHour": 22
    },
    "chores": { "shaveIntervalDays": 2, "nailsIntervalDays": 9, "reminderHour": 9 },
    "bear": {
      "water": { "approvedCup": 10, "missedGoal": -20 },
      "clean": { "handPlus": 5, "handMinus": -10, "overduePerDay": -10, "crackedPawsBelow": 40 },
      "mood": { "perIllDay": -5, "bluesBelow": 40 },
      "energy": { "cooked": 10, "idleDay": -10, "exhaustedBelow": 40 },
      "escalation": { "moderateAfterDays": 2, "severeAfterDays": 4 }
    },
    "treatments": {
      "medicine":  { "cost": 30,  "cures": ["mild"],                       "statBoost": 30, "waitHours": 0 },
      "injection": { "cost": 80,  "cures": ["mild", "moderate"],           "statBoost": 50, "waitHours": 0 },
      "hospital":  { "cost": 200, "cures": ["mild", "moderate", "severe"], "statBoost": 65, "waitHours": 2 }
    }
  }'::jsonb
$$;

update public.chores set interval_days = 2 where kind = 'shave';
