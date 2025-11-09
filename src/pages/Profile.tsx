import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Settings as SettingsIcon, LogOut, Edit2, Save, X } from "lucide-react";
import { BADGES } from "@/utils/gamification";
import Layout from "@/components/Layout";
import { xpForNextLevel } from "@/utils/gamification";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ImageUpload from "@/components/ImageUpload";
import { toast } from "sonner";

interface UserData {
  displayName: string;
  photoURL: string;
  level: number;
  totalXP: number;
  currentStreak: number;
  entriesCount: number;
  unlockedBadges: string[];
  createdAt: any;
}

const DEFAULT_AVATAR = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data() as UserData);
      } else {
        const defaultData = {
          displayName: user.displayName || "User",
          photoURL: user.photoURL || "",
          level: 1,
          totalXP: 0,
          currentStreak: 0,
          entriesCount: 0,
          unlockedBadges: [],
          createdAt: new Date().toISOString(),
        };
        setUserData(defaultData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/welcome");
  };

  const handleEditProfile = () => {
    setEditName(userData?.displayName || user?.displayName || "");
    setSelectedImage(null);
    setIsEditDialogOpen(true);
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "unsigned_preset");
      formData.append("folder", "profile_pictures");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dwu0wiz2g/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Cloudinary error:", data);
        throw new Error(data.error?.message || "Failed to upload image");
      }

      return data.secure_url;
    } catch (error: any) {
      console.error("Upload error:", error);
      throw new Error(error.message || "Failed to upload image to Cloudinary");
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setUploading(true);
    try {
      let photoURL = userData?.photoURL || DEFAULT_AVATAR;

      // Only upload if user selected a new image
      if (selectedImage) {
        try {
          photoURL = await uploadToCloudinary(selectedImage);
          toast.success("Image uploaded successfully!");
        } catch (uploadError: any) {
          console.error("Upload error:", uploadError);
          toast.error("Image upload failed. Please check Cloudinary settings or try a smaller image.");
          setUploading(false);
          return;
        }
      }

      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), {
        displayName: editName.trim() || userData?.displayName || "User",
        photoURL: photoURL,
      });

      toast.success("Profile updated successfully!");
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      
      if (error.code === "permission-denied") {
        toast.error("Permission denied. Please check your authentication.");
      } else if (error.code === "not-found") {
        toast.error("User profile not found. Please try logging in again.");
      } else {
        toast.error(error.message || "Failed to update profile");
      }
    } finally {
      setUploading(false);
    }
  };

  // Calculate member days safely
  const calculateMemberDays = () => {
    if (!userData?.createdAt) return 1;

    try {
      let createdDate: Date;

      if (userData.createdAt?.toDate) {
        createdDate = userData.createdAt.toDate();
      } else if (userData.createdAt?.seconds) {
        createdDate = new Date(userData.createdAt.seconds * 1000);
      } else {
        createdDate = new Date(userData.createdAt);
      }

      if (isNaN(createdDate.getTime())) {
        return 1;
      }

      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      return Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    } catch (error) {
      return 1;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  // Safe calculations with defaults
  const safeLevel = userData?.level || 1;
  const safeTotalXP = userData?.totalXP || 0;
  const xpNeeded = xpForNextLevel(safeLevel);
  const currentLevelXP = safeTotalXP % xpNeeded;
  const xpProgress = Math.min(100, (currentLevelXP / xpNeeded) * 100);

  const memberDays = calculateMemberDays();

  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={userData?.photoURL || user?.photoURL || DEFAULT_AVATAR} />
                  <AvatarFallback className="text-2xl">
                    {(userData?.displayName ||
                      user?.displayName ||
                      "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                  onClick={handleEditProfile}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <h2 className="text-2xl font-bold">
                  {userData?.displayName || user?.displayName || "User"}
                </h2>
                <p className="text-muted-foreground">Level {safeLevel}</p>
              </div>

              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{currentLevelXP} XP</span>
                  <span>{xpNeeded} XP</span>
                </div>
                <Progress value={xpProgress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">
                {userData?.currentStreak || 0}
              </p>
              <p className="text-sm text-muted-foreground">days in a row</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">
                {userData?.entriesCount || 0}
              </p>
              <p className="text-sm text-muted-foreground">total journals</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xl font-semibold">{memberDays} days</p>
            <p className="text-sm text-muted-foreground">Member</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {BADGES.map((badge) => {
                const isUnlocked = userData?.unlockedBadges?.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-lg border ${
                      isUnlocked
                        ? "bg-primary/10 border-primary"
                        : "bg-muted/50 opacity-50"
                    }`}
                  >
                    <div className="text-4xl mb-2">{badge.icon}</div>
                    <h3 className="font-semibold text-sm">{badge.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {badge.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/settings")}
          >
            <SettingsIcon className="mr-2 h-5 w-5" />
            Settings
          </Button>

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Logout
          </Button>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Profile Picture</label>
                <ImageUpload
                  currentImage={userData?.photoURL || user?.photoURL || DEFAULT_AVATAR}
                  onImageSelect={(file) => setSelectedImage(file)}
                  onImageRemove={() => setSelectedImage(null)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={uploading}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveProfile}
                  disabled={uploading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {uploading ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Profile;

