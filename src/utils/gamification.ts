import { doc, updateDoc, increment, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const BADGES = [
  {
    id: 'first_entry',
    name: 'Newbie',
    description: 'Complete your first journal entry',
    icon: '🎯',
    criteria: { type: 'entries', threshold: 1 }
  },
  {
    id: 'week_streak',
    name: 'Consistency Champion',
    description: 'Maintain a 7-day journaling streak',
    icon: '🔥',
    criteria: { type: 'streak', threshold: 7 }
  },
  {
    id: 'month_streak',
    name: 'Dedication Master',
    description: 'Maintain a 30-day journaling streak',
    icon: '⭐',
    criteria: { type: 'streak', threshold: 30 }
  },
  {
    id: 'mood_tracker',
    name: 'Mood Tracker',
    description: 'Log your mood for 7 consecutive days',
    icon: '😊',
    criteria: { type: 'mood_entries', threshold: 7 }
  },
  {
    id: 'goal_crusher',
    name: 'Goal Crusher',
    description: 'Complete all 3 weekly goals',
    icon: '🏆',
    criteria: { type: 'weekly_goals', threshold: 3 }
  }
];

export const calculateLevel = (totalXP: number): number => {
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
};

export const xpForNextLevel = (currentLevel: number): number => {
  return Math.pow(currentLevel, 2) * 100;
};

export const awardXP = async (userId: string, xpAmount: number) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    totalXP: increment(xpAmount),
    lastActive: new Date().toISOString()
  });

  const userDoc = await getDoc(userRef);
  const userData = userDoc.data();
  const newLevel = calculateLevel(userData?.totalXP || 0);
  
  if (newLevel > (userData?.level || 1)) {
    await updateDoc(userRef, { level: newLevel });
  }
};

export const checkAndAwardBadge = async (userId: string, badgeId: string) => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const userData = userDoc.data();
  
  if (!userData?.unlockedBadges?.includes(badgeId)) {
    await updateDoc(userRef, {
      unlockedBadges: arrayUnion(badgeId)
    });
    return true;
  }
  return false;
};

export const updateStreak = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const userData = userDoc.data();
  
  const lastActive = userData?.lastActive ? new Date(userData.lastActive) : null;
  const now = new Date();
  const daysDiff = lastActive ? Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  
  if (daysDiff === 1) {
    const newStreak = (userData?.currentStreak || 0) + 1;
    await updateDoc(userRef, {
      currentStreak: newStreak,
      maxStreak: Math.max(newStreak, userData?.maxStreak || 0),
      lastActive: now.toISOString()
    });
    
    if (newStreak === 7) await checkAndAwardBadge(userId, 'week_streak');
    if (newStreak === 30) await checkAndAwardBadge(userId, 'month_streak');
    
    return newStreak;
  } else if (daysDiff > 1) {
    await updateDoc(userRef, {
      currentStreak: 1,
      lastActive: now.toISOString()
    });
    return 1;
  } else if (daysDiff === 0) {
    return userData?.currentStreak || 1;
  }
  
  return 1;
};
