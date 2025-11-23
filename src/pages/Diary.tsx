import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  History,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { awardXP, updateStreak } from "@/utils/gamification";

interface DiaryEntry {
  id?: string;
  date: string | Date;
  gratitude: string;
  affirmation: string;
  notes: string;
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Helper function to parse Firestore dates
const parseFirestoreDate = (date: any): Date => {
  if (date instanceof Date) {
    return date;
  } else if (date?.toDate) {
    return date.toDate();
  } else if (typeof date === "string") {
    return new Date(date);
  } else {
    return new Date();
  }
};

const Diary = () => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [entry, setEntry] = useState({
    gratitude: "",
    affirmation: "",
    notes: "",
  });
  const [existingEntryId, setExistingEntryId] = useState<string | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [recentEntries, setRecentEntries] = useState<DiaryEntry[]>([]);
  const [entriesMap, setEntriesMap] = useState<Map<string, DiaryEntry>>(
    new Map()
  );
  const [showRecent, setShowRecent] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(false);

  // Real-time listener for entries
  useEffect(() => {
    if (!user) return;

    const entriesRef = collection(db, "diaryEntries");
    const q = query(entriesRef, where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = new Map<string, DiaryEntry>();
      const entriesList: DiaryEntry[] = [];

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const entryDate = parseFirestoreDate(data.date);
        const entryData: DiaryEntry = {
          id: doc.id,
          date: entryDate,
          gratitude: data.gratitude || "",
          affirmation: data.affirmation || "",
          notes: data.notes || "",
          userId: data.userId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        const dateKey = entryDate.toDateString();
        entries.set(dateKey, entryData);
        entriesList.push(entryData);
      });

      setEntriesMap(entries);
      setEntries(entriesList);
      setRecentEntries(
        entriesList
          .sort(
            (a, b) =>
              parseFirestoreDate(b.date).getTime() -
              parseFirestoreDate(a.date).getTime()
          )
          .slice(0, 10)
      );
    });

    return () => unsubscribe();
  }, [user]);

  // Load entry when selected date changes
  useEffect(() => {
    if (selectedDate && user) {
      loadEntryForDate(selectedDate);
    }
  }, [selectedDate, entriesMap]);

  const loadEntryForDate = async (date: Date) => {
    const dateKey = date.toDateString();
    const existingEntry = entriesMap.get(dateKey);

    if (existingEntry) {
      setEntry({
        gratitude: existingEntry.gratitude || "",
        affirmation: existingEntry.affirmation || "",
        notes: existingEntry.notes || "",
      });
      setExistingEntryId(existingEntry.id || null);
    } else {
      setEntry({ gratitude: "", affirmation: "", notes: "" });
      setExistingEntryId(null);
    }
  };

  const handleSave = async () => {
    if (!user || !selectedDate) return;

    const dateStr = selectedDate.toISOString().split("T")[0];
    const entryData = {
      ...entry,
      date: dateStr,
      userId: user.uid,
      updatedAt: serverTimestamp(),
    };

    // Don't save if all fields are empty
    if (
      !entry.gratitude.trim() &&
      !entry.affirmation.trim() &&
      !entry.notes.trim()
    ) {
      toast.error("Please add some content before saving");
      return;
    }

    setLoading(true);
    try {
      if (existingEntryId) {
        // Update existing entry
        await setDoc(doc(db, "diaryEntries", existingEntryId), entryData);
        toast.success("Entry updated! +5 XP");
        await awardXP(user.uid, 5);
      } else {
        // Create new entry
        const docRef = doc(db, "diaryEntries", `${user.uid}_${dateStr}`);
        await setDoc(docRef, {
          ...entryData,
          createdAt: serverTimestamp(),
        });
        toast.success("Entry saved! +10 XP");
        await awardXP(user.uid, 10);
      }

      await updateStreak(user.uid);
    } catch (error) {
      console.error("Error saving entry:", error);
      toast.error("Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  const handleRecentEntryClick = (diaryEntry: DiaryEntry) => {
    setSelectedEntry(diaryEntry);
    setShowRecent(false);
  };

  const handleEditEntry = () => {
    if (!selectedEntry) return;

    const entryDate = parseFirestoreDate(selectedEntry.date);
    setSelectedDate(entryDate);
    setSelectedEntry(null);

    // Update the entry form with the selected entry's data
    setEntry({
      gratitude: selectedEntry.gratitude || "",
      affirmation: selectedEntry.affirmation || "",
      notes: selectedEntry.notes || "",
    });
    setExistingEntryId(selectedEntry.id || null);
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

  const hasEntry = (date: Date | null) => {
    if (!date) return false;
    return entriesMap.has(date.toDateString());
  };

  const getEntryIndicators = (date: Date | null) => {
    if (!date) return null;
    const dateKey = date.toDateString();
    const entry = entriesMap.get(dateKey);

    if (!entry) return null;

    const hasGratitude = entry.gratitude?.trim().length > 0;
    const hasAffirmation = entry.affirmation?.trim().length > 0;
    const hasNotes = entry.notes?.trim().length > 0;

    return (
      <div className="flex justify-center gap-0.5 mt-0.5">
        {hasGratitude && <div className="w-1 h-1 rounded-full bg-green-500" />}
        {hasAffirmation && <div className="w-1 h-1 rounded-full bg-blue-500" />}
        {hasNotes && <div className="w-1 h-1 rounded-full bg-purple-500" />}
      </div>
    );
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Digital Diary</h2>
          </div>
          <Button variant="outline" onClick={() => setShowRecent(true)}>
            <History className="mr-2 h-4 w-4" />
            Recent Entries
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle>{monthName}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => changeMonth(1)}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-muted-foreground"
                >
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
                    aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative
                    ${!date ? "invisible" : ""}
                    ${
                      isToday(date)
                        ? "bg-primary text-primary-foreground font-bold"
                        : ""
                    }
                    ${isSelected(date) ? "ring-2 ring-primary" : ""}
                    ${
                      !isToday(date) && !isSelected(date)
                        ? "hover:bg-accent"
                        : ""
                    }
                    ${hasEntry(date) ? "border border-green-200" : ""}
                  `}
                >
                  {date?.getDate()}
                  {getEntryIndicators(date)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  Entry for{" "}
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                {existingEntryId && (
                  <span className="text-sm font-normal text-muted-foreground">
                    • Existing entry
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Gratitude</Label>
                <Textarea
                  value={entry.gratitude}
                  onChange={(e) =>
                    setEntry({ ...entry, gratitude: e.target.value })
                  }
                  placeholder="What are you thankful for today?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Affirmation</Label>
                <Textarea
                  value={entry.affirmation}
                  onChange={(e) =>
                    setEntry({ ...entry, affirmation: e.target.value })
                  }
                  placeholder="Positive self-statements"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={entry.notes}
                  onChange={(e) =>
                    setEntry({ ...entry, notes: e.target.value })
                  }
                  placeholder="General thoughts and reflections"
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSave}
                className="w-full"
                disabled={
                  loading ||
                  (!entry.gratitude.trim() &&
                    !entry.affirmation.trim() &&
                    !entry.notes.trim())
                }
              >
                {loading
                  ? "Saving..."
                  : existingEntryId
                  ? "Update Entry"
                  : "Save Entry"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Entries Dialog */}
        <Dialog open={showRecent} onOpenChange={setShowRecent}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Recent Entries</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {recentEntries.map((entry, index) => (
                <Card
                  key={entry.id || index}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleRecentEntryClick(entry)}
                >
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold">
                        {parseFirestoreDate(entry.date).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            weekday: "short",
                          }
                        )}
                      </p>
                      <div className="flex gap-1">
                        {entry.gratitude?.trim() && (
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        )}
                        {entry.affirmation?.trim() && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                        {entry.notes?.trim() && (
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.notes ||
                        entry.gratitude ||
                        entry.affirmation ||
                        "No content"}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {recentEntries.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No entries yet. Start writing your first diary entry!
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Entry Detail Dialog - Shows when a recent entry is clicked */}
        <Dialog
          open={!!selectedEntry}
          onOpenChange={() => setSelectedEntry(null)}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>
                  {selectedEntry &&
                    parseFirestoreDate(selectedEntry.date).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                </span>
                <Button variant="outline" size="sm" onClick={handleEditEntry}>
                  Edit Entry
                </Button>
              </DialogTitle>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-6">
                {selectedEntry.gratitude && (
                  <div>
                    <Label className="text-primary font-semibold text-base">
                      Gratitude
                    </Label>
                    <p className="mt-2 p-3 bg-muted/50 rounded-md whitespace-pre-wrap">
                      {selectedEntry.gratitude}
                    </p>
                  </div>
                )}
                {selectedEntry.affirmation && (
                  <div>
                    <Label className="text-primary font-semibold text-base">
                      Affirmation
                    </Label>
                    <p className="mt-2 p-3 bg-muted/50 rounded-md whitespace-pre-wrap">
                      {selectedEntry.affirmation}
                    </p>
                  </div>
                )}
                {selectedEntry.notes && (
                  <div>
                    <Label className="text-primary font-semibold text-base">
                      Notes
                    </Label>
                    <p className="mt-2 p-3 bg-muted/50 rounded-md whitespace-pre-wrap">
                      {selectedEntry.notes}
                    </p>
                  </div>
                )}
                {!selectedEntry.gratitude &&
                  !selectedEntry.affirmation &&
                  !selectedEntry.notes && (
                    <p className="text-muted-foreground text-center py-8">
                      No content in this entry
                    </p>
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
