import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, doc, setDoc, getDoc, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, History } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { awardXP, updateStreak } from "@/utils/gamification";

interface DiaryEntry {
  date: string;
  gratitude: string;
  affirmation: string;
  notes: string;
}

const Diary = () => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [entry, setEntry] = useState<DiaryEntry>({ date: "", gratitude: "", affirmation: "", notes: "" });
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [recentEntries, setRecentEntries] = useState<DiaryEntry[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRecentEntries();
  }, [user]);

  useEffect(() => {
    if (selectedDate) {
      loadEntryForDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchRecentEntries = async () => {
    if (!user) return;
    
    const entriesRef = collection(db, 'diaryEntries');
    const q = query(entriesRef, where('userId', '==', user.uid), orderBy('date', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    
    const recentData = snapshot.docs.map(doc => doc.data() as DiaryEntry);
    setRecentEntries(recentData);
  };

  const loadEntryForDate = async (date: Date) => {
    if (!user) return;
    
    const dateStr = date.toISOString().split('T')[0];
    const entryRef = doc(db, 'diaryEntries', `${user.uid}_${dateStr}`);
    const entryDoc = await getDoc(entryRef);
    
    if (entryDoc.exists()) {
      setEntry(entryDoc.data() as DiaryEntry);
    } else {
      setEntry({ date: dateStr, gratitude: "", affirmation: "", notes: "" });
    }
  };

  const handleSave = async () => {
    if (!user || !selectedDate) return;
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    const entryData = { ...entry, date: dateStr, userId: user.uid };

    setLoading(true);
    try {
      await setDoc(doc(db, 'diaryEntries', `${user.uid}_${dateStr}`), entryData);
      await awardXP(user.uid, 10);
      await updateStreak(user.uid);
      
      toast.success("Entry saved! +10 XP");
      fetchRecentEntries();
    } catch (error) {
      console.error("Error saving entry:", error);
      toast.error("Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentMonth(newDate);
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Digital Diary</h2>
          <Button variant="outline" onClick={() => setShowRecent(true)}>
            <History className="mr-2 h-4 w-4" />
            Recent Entries
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle>{monthName}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => changeMonth(1)}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-semibold text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {days.map((date, index) => (
                <button
                  key={index}
                  onClick={() => date && setSelectedDate(date)}
                  disabled={!date}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm
                    ${!date ? 'invisible' : ''}
                    ${isToday(date) ? 'bg-primary text-primary-foreground font-bold' : ''}
                    ${isSelected(date) ? 'ring-2 ring-primary' : ''}
                    ${!isToday(date) && !isSelected(date) ? 'hover:bg-accent' : ''}
                  `}
                >
                  {date?.getDate()}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle>Entry for {selectedDate.toLocaleDateString()}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Gratitude</Label>
                <Textarea
                  value={entry.gratitude}
                  onChange={(e) => setEntry({ ...entry, gratitude: e.target.value })}
                  placeholder="What are you thankful for today?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Affirmation</Label>
                <Textarea
                  value={entry.affirmation}
                  onChange={(e) => setEntry({ ...entry, affirmation: e.target.value })}
                  placeholder="Positive self-statements"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={entry.notes}
                  onChange={(e) => setEntry({ ...entry, notes: e.target.value })}
                  placeholder="General thoughts and reflections"
                  rows={4}
                />
              </div>

              <Button onClick={handleSave} className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Save Entry"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Dialog open={showRecent} onOpenChange={setShowRecent}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Recent Entries</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {recentEntries.map((entry, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedEntry(entry)}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold">{new Date(entry.date).toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.gratitude || entry.affirmation || entry.notes}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedEntry && new Date(selectedEntry.date).toLocaleDateString()}</DialogTitle>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-4">
                {selectedEntry.gratitude && (
                  <div>
                    <Label className="text-primary">Gratitude</Label>
                    <p className="mt-1">{selectedEntry.gratitude}</p>
                  </div>
                )}
                {selectedEntry.affirmation && (
                  <div>
                    <Label className="text-primary">Affirmation</Label>
                    <p className="mt-1">{selectedEntry.affirmation}</p>
                  </div>
                )}
                {selectedEntry.notes && (
                  <div>
                    <Label className="text-primary">Notes</Label>
                    <p className="mt-1">{selectedEntry.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Diary;
