import { doc, updateDoc, increment, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const BADGES = [
  {
    id: 'getting_started',
    name: 'Getting Started',
    description: 'Complete the onboarding journey',
    icon: '🌟',
    criteria: { type: 'onboarding', threshold: 1 }
  },
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
  const oldLevel = userData?.level || 1;
  
  if (newLevel > oldLevel) {
    await updateDoc(userRef, { level: newLevel });
    return { levelUp: true, newLevel, oldLevel };
  }
  
  return { levelUp: false, newLevel: oldLevel, oldLevel };
};

export const checkDailyBonus = async (userId: string): Promise<number> => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const userData = userDoc.data();
  
  const lastLogin = userData?.lastLoginDate ? new Date(userData.lastLoginDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let lastLoginDate: Date | null = null;
  if (lastLogin) {
    lastLoginDate = new Date(lastLogin);
    lastLoginDate.setHours(0, 0, 0, 0);
  }
  
  const daysDiff = lastLoginDate 
    ? Math.floor((today.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24)) 
    : -1;
  
  // Award bonus if it's a new day
  if (daysDiff !== 0) {
    const bonusXP = 5;
    await updateDoc(userRef, {
      totalXP: increment(bonusXP),
      lastLoginDate: new Date().toISOString()
    });
    
    // Check for level up after bonus
    const updatedDoc = await getDoc(userRef);
    const updatedData = updatedDoc.data();
    const newLevel = calculateLevel(updatedData?.totalXP || 0);
    const oldLevel = updatedData?.level || 1;
    
    if (newLevel > oldLevel) {
      await updateDoc(userRef, { level: newLevel });
    }
    
    return bonusXP;
  }
  
  return 0;
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let lastActiveDate: Date | null = null;
  if (lastActive) {
    lastActiveDate = new Date(lastActive);
    lastActiveDate.setHours(0, 0, 0, 0);
  }
  
  const daysDiff = lastActiveDate 
    ? Math.floor((today.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)) 
    : -1;
  
  if (daysDiff === 0) {
    // Same day - maintain current streak but ensure it's at least 1
    const currentStreak = Math.max(userData?.currentStreak || 1, 1);
    await updateDoc(userRef, {
      currentStreak,
      lastActive: new Date().toISOString()
    });
    return currentStreak;
  } else if (daysDiff === 1) {
    // Next day - increment streak
    const newStreak = (userData?.currentStreak || 0) + 1;
    await updateDoc(userRef, {
      currentStreak: newStreak,
      maxStreak: Math.max(newStreak, userData?.maxStreak || 0),
      lastActive: new Date().toISOString()
    });
    
    if (newStreak === 7) await checkAndAwardBadge(userId, 'week_streak');
    if (newStreak === 30) await checkAndAwardBadge(userId, 'month_streak');
    
    return newStreak;
  } else {
    // Missed days - reset to 1
    await updateDoc(userRef, {
      currentStreak: 1,
      lastActive: new Date().toISOString()
    });
    return 1;
  }
};
