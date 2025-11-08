import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Eye,
  EyeOff,
  Download,
  Trash2,
  LogOut,
  Users,
  FileText,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface User {
  userId: string;
  displayName: string;
  email: string;
  photoURL: string;
  totalXP: number;
  level: number;
  entriesCount: number;
  currentStreak: number;
}

interface JournalEntry {
  id: string;
  userId: string;
  question?: string;
  response?: string;
  gratitude?: string;
  affirmation?: string;
  notes?: string;
  date?: string;
  completedAt?: string;
  createdAt?: Date;
  responseType?: string;
  xpEarned?: number;
  type?: string;
  questions?: any[];
}

const AdminPanel = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    if (user?.email === "admin@gmail.com") {
      setIsAdmin(true);
      const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
        const usersData = snapshot.docs
          .map(
            (doc) =>
              ({
                ...doc.data(),
                userId: doc.id,
              } as User)
          )
          .filter((user: User) => user.email !== "admin@gmail.com");
        setUsers(usersData.sort((a, b) => b.totalXP - a.totalXP));
      });
      return () => unsubscribe();
    }
  }, [user]);

  const searchAllCollections = async (userId: string) => {
    setDebugInfo(`Searching for journals for user: ${userId}`);

    const collectionsToCheck = [
      "entries",
      "dailyTasks",
      "diaryEntries",
      "journals",
      "tasks",
      "userEntries",
    ];
    let allEntries: JournalEntry[] = [];

    for (const collectionName of collectionsToCheck) {
      try {
        const q = query(
          collection(db, collectionName),
          where("userId", "==", userId)
        );
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
              collection: collectionName,
              createdAt:
                doc.data().createdAt?.toDate?.() ||
                doc.data().date?.toDate?.() ||
                doc.data().completedAt?.toDate?.() ||
                new Date(),
            } as JournalEntry)
        );

        if (entries.length > 0) {
          setDebugInfo(
            (prev) =>
              prev +
              `\nFound ${entries.length} entries in ${collectionName} collection`
          );
          allEntries = [...allEntries, ...entries];
        }
      } catch (error) {
        console.log(`Error querying ${collectionName}:`, error);
        setDebugInfo(
          (prev) => prev + `\nError querying ${collectionName}: ${error}`
        );
      }
    }

    if (allEntries.length === 0) {
      // Let's check what collections actually exist
      try {
        // This is a hacky way to see what collections might exist
        const userDoc = await getDocs(collection(db, "users"));
        setDebugInfo((prev) => prev + `\nUser exists in users collection`);

        // Try to get any data for this user across all likely collections
        const allCollections = [
          "entries",
          "dailyTasks",
          "diaryEntries",
          "journals",
        ];
        for (const coll of allCollections) {
          try {
            const testQuery = query(
              collection(db, coll),
              where("userId", "==", userId)
            );
            const testSnapshot = await getDocs(testQuery);
            setDebugInfo(
              (prev) =>
                prev + `\n${coll}: ${testSnapshot.docs.length} documents found`
            );
          } catch (e) {
            setDebugInfo(
              (prev) =>
                prev + `\n${coll}: query failed - collection might not exist`
            );
          }
        }
      } catch (error) {
        setDebugInfo((prev) => prev + `\nDebug error: ${error}`);
      }
    }

    return allEntries.sort(
      (a, b) => b.createdAt!.getTime() - a.createdAt!.getTime()
    );
  };

  const viewUserJournals = async (user: User) => {
    setSelectedUser(user);
    setLoading(true);
    setDebugInfo(
      `Starting search for user: ${user.displayName} (${user.userId})`
    );

    try {
      const entries = await searchAllCollections(user.userId);
      setJournalEntries(entries);

      if (entries.length === 0) {
        setDebugInfo(
          (prev) => prev + `\nNo journal entries found in any collection`
        );
        toast.error("No journal entries found for this user");
      } else {
        setDebugInfo(
          (prev) => prev + `\nTotal entries found: ${entries.length}`
        );
        toast.success(`Found ${entries.length} journal entries`);
      }
    } catch (error) {
      console.error("Error fetching journals:", error);
      setDebugInfo((prev) => prev + `\nError: ${error}`);
      toast.error("Error fetching journal entries");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (email !== "admin@gmail.com") {
      toast.error("Invalid admin credentials");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsAdmin(true);
      toast.success("Admin login successful");
    } catch (error: any) {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleExportUserData = (user: User) => {
    try {
      const userData = {
        "User Name": user.displayName,
        Email: user.email,
        Level: user.level,
        "Total XP": user.totalXP,
        "Total Journal Entries": user.entriesCount,
        "Current Streak": user.currentStreak,
      };

      const entriesData = journalEntries.map((entry, index) => {
        const entryDate = entry.createdAt!;
        return {
          "Entry #": index + 1,
          Date: entryDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          }),
          Time: entryDate.toLocaleTimeString("en-US"),
          "Collection Source": entry.collection || "unknown",
          Type: entry.type || "entry",
          Question: entry.question || "N/A",
          Response: entry.response || "N/A",
          Gratitude: entry.gratitude || "N/A",
          Affirmation: entry.affirmation || "N/A",
          Notes: entry.notes || "N/A",
          "Response Type": entry.responseType || "text",
          "XP Earned": entry.xpEarned || 10,
        };
      });

      const wb = XLSX.utils.book_new();
      const userSheet = XLSX.utils.json_to_sheet([userData]);
      XLSX.utils.book_append_sheet(wb, userSheet, "User Information");

      if (entriesData.length > 0) {
        const entriesSheet = XLSX.utils.json_to_sheet(entriesData);
        XLSX.utils.book_append_sheet(wb, entriesSheet, "Journal Entries");
      }

      const fileName = `${user.displayName}_Journal_Entries_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success(`Journal data exported for ${user.displayName}`);
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    }
  };

  const deleteUser = async (userId: string) => {
    if (
      !confirm("Are you sure you want to delete this user and all their data?")
    )
      return;

    try {
      await deleteDoc(doc(db, "users", userId));
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const handleLogout = async () => {
    await signOut();
    setIsAdmin(false);
    navigate("/welcome");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="mr-2 h-5 w-5" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <Users className="w-8 h-8 text-primary mb-2" />
            <p className="text-3xl font-bold">{users.length}</p>
            <p className="text-muted-foreground">Total Users</p>
          </Card>
          <Card className="p-6">
            <FileText className="w-8 h-8 text-primary mb-2" />
            <p className="text-3xl font-bold">
              {users.reduce((sum, u) => sum + u.entriesCount, 0)}
            </p>
            <p className="text-muted-foreground">Total Journal Entries</p>
          </Card>
          <Card className="p-6">
            <Users className="w-8 h-8 text-primary mb-2" />
            <p className="text-3xl font-bold">
              {users.filter((u) => u.currentStreak > 0).length}
            </p>
            <p className="text-muted-foreground">Active Users</p>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <Avatar>
                    <AvatarImage src={user.photoURL} />
                    <AvatarFallback>
                      {getInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Level {user.level} • {user.totalXP} XP •{" "}
                      {user.entriesCount} journals • {user.currentStreak} day
                      streak
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewUserJournals(user)}
                      disabled={loading}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {loading && selectedUser?.userId === user.userId
                        ? "Searching..."
                        : "View Journals"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteUser(user.userId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No users found
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog
          open={!!selectedUser}
          onOpenChange={() => setSelectedUser(null)}
        >
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedUser?.displayName}'s Journal Entries (
                {journalEntries.length})
                <Button
                  size="sm"
                  className="ml-4"
                  onClick={() =>
                    selectedUser && handleExportUserData(selectedUser)
                  }
                  disabled={journalEntries.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Excel
                </Button>
              </DialogTitle>
            </DialogHeader>

            {/* Debug Info */}
            {debugInfo && (
              <Card className="bg-black border-white">
                <CardHeader>
                  <CardTitle className="text-sm">Debug Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs whitespace-pre-wrap">{debugInfo}</pre>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4 mt-4">
              {journalEntries.map((entry, index) => (
                <Card key={entry.id || index} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {entry.createdAt!.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "long",
                        })}
                      </p>
                      <p className="text-xs text-blue-600">
                        From: {entry.collection} • Type: {entry.type || "entry"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {entry.responseType || "text"}
                      </span>
                      <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">
                        +{entry.xpEarned || 10} XP
                      </span>
                    </div>
                  </div>

                  {entry.question && (
                    <div className="mb-3">
                      <p className="font-medium text-sm text-blue-600 mb-1">
                        Question
                      </p>
                      <p className="text-sm">{entry.question}</p>
                    </div>
                  )}

                  {entry.response && (
                    <div className="mb-3">
                      <p className="font-medium text-sm text-green-600 mb-1">
                        Response
                      </p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                        {entry.response}
                      </p>
                    </div>
                  )}

                  {entry.gratitude && (
                    <div className="mb-3">
                      <p className="font-medium text-sm text-purple-600 mb-1">
                        Gratitude
                      </p>
                      <p className="text-sm">{entry.gratitude}</p>
                    </div>
                  )}

                  {entry.affirmation && (
                    <div className="mb-3">
                      <p className="font-medium text-sm text-orange-600 mb-1">
                        Affirmation
                      </p>
                      <p className="text-sm">{entry.affirmation}</p>
                    </div>
                  )}

                  {entry.notes && (
                    <div className="mb-3">
                      <p className="font-medium text-sm text-red-600 mb-1">
                        Notes
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {entry.notes}
                      </p>
                    </div>
                  )}

                  {entry.questions && entry.questions.length > 0 && (
                    <div className="mb-3">
                      <p className="font-medium text-sm text-green-600 mb-1">
                        Questions & Responses
                      </p>
                      {entry.questions.map((q: any, i: number) => (
                        <div key={i} className="mb-2">
                          <p className="font-medium text-sm">{q.question}</p>
                          <p className="text-sm">{q.response}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
              {journalEntries.length === 0 && !loading && (
                <p className="text-center text-muted-foreground py-8">
                  No journal entries found for this user
                </p>
              )}
              {loading && (
                <p className="text-center text-muted-foreground py-8">
                  Searching for journal entries...
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminPanel;
