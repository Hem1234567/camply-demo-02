import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, query, where, doc, deleteDoc, orderBy } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, EyeOff, Download, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

const AdminPanel = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userJournals, setUserJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.email === "admin@gmail.com") {
      setIsAdmin(true);
      fetchUsers();
    }
  }, [user]);

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

  const fetchUsers = async () => {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const usersData = usersSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((user: any) => user.email !== "admin@gmail.com");
    setUsers(usersData);
  };

  const viewUserJournals = async (userId: string) => {
    const user = users.find(u => u.userId === userId);
    setSelectedUser(user);

    const tasksSnapshot = await getDocs(
      query(collection(db, 'dailyTasks'), where('userId', '==', userId), orderBy('date', 'desc'))
    );
    const diarySnapshot = await getDocs(
      query(collection(db, 'diaryEntries'), where('userId', '==', userId), orderBy('date', 'desc'))
    );

    const journals = [
      ...tasksSnapshot.docs.map(doc => ({ type: 'task', ...doc.data() })),
      ...diarySnapshot.docs.map(doc => ({ type: 'diary', ...doc.data() }))
    ].sort((a: any, b: any) => new Date(b.date || b.completedAt).getTime() - new Date(a.date || a.completedAt).getTime());

    setUserJournals(journals);
  };

  const downloadUserData = () => {
    if (!selectedUser || userJournals.length === 0) {
      toast.error("No data to download");
      return;
    }

    const data = userJournals.map(journal => ({
      Date: journal.date || journal.completedAt,
      Type: journal.type,
      Content: journal.type === 'task' 
        ? journal.questions?.map((q: any) => `${q.question}: ${q.response}`).join('\n')
        : `Gratitude: ${journal.gratitude}\nAffirmation: ${journal.affirmation}\nNotes: ${journal.notes}`
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Journals");
    XLSX.writeFile(wb, `${selectedUser.displayName}_journals.xlsx`);
    toast.success("Data downloaded successfully");
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await deleteDoc(doc(db, 'users', userId));
      await fetchUsers();
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
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>XP</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.displayName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.level}</TableCell>
                    <TableCell>{user.totalXP}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => viewUserJournals(user.userId)}>
                        View Journals
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteUser(user.userId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedUser?.displayName}'s Journals
                <Button size="sm" className="ml-4" onClick={downloadUserData}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Excel
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {userJournals.map((journal, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <p className="font-semibold mb-2">
                      {new Date(journal.date || journal.completedAt).toLocaleDateString()}
                      <span className="ml-2 text-xs text-primary">{journal.type}</span>
                    </p>
                    <div className="text-sm text-muted-foreground">
                      {journal.type === 'task' ? (
                        journal.questions?.map((q: any, i: number) => (
                          <div key={i} className="mb-2">
                            <p className="font-medium">{q.question}</p>
                            <p>{q.response}</p>
                          </div>
                        ))
                      ) : (
                        <div>
                          {journal.gratitude && <p><strong>Gratitude:</strong> {journal.gratitude}</p>}
                          {journal.affirmation && <p><strong>Affirmation:</strong> {journal.affirmation}</p>}
                          {journal.notes && <p><strong>Notes:</strong> {journal.notes}</p>}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminPanel;
