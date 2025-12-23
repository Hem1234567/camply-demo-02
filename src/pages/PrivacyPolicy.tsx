import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Shield, Lock, Eye, FileText } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!user) return;
    if (!accepted) {
      toast.error("Please accept the privacy policy to continue");
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        hasAcceptedPrivacyPolicy: true,
        privacyPolicyAcceptedAt: new Date().toISOString(),
      });
      
      toast.success("Welcome! Let's get you started");
      navigate("/onboarding", { replace: true });
    } catch (error) {
      console.error("Error accepting privacy policy:", error);
      toast.error("Failed to continue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Privacy Policy & Terms</CardTitle>
          <p className="text-muted-foreground mt-2">
            Please review and accept our privacy policy to continue
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <ScrollArea className="h-64 rounded-md border p-4">
            <div className="space-y-6 text-sm text-muted-foreground">
              <section>
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4" />
                  1. Introduction
                </h3>
                <p>
                  Welcome to Camply. We are committed to protecting your personal information 
                  and your right to privacy. This Privacy Policy explains how we collect, use, 
                  disclose, and safeguard your information when you use our application.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4" />
                  2. Information We Collect
                </h3>
                <p className="mb-2">We collect information that you provide directly to us:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Account information (name, email address)</li>
                  <li>Profile information (profile picture)</li>
                  <li>Journal entries and personal reflections</li>
                  <li>Goals and progress tracking data</li>
                  <li>Usage data and app interactions</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4" />
                  3. How We Use Your Information
                </h3>
                <p className="mb-2">We use the information we collect to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Track your personal growth journey</li>
                  <li>Send you notifications and updates</li>
                  <li>Personalize your experience</li>
                  <li>Ensure the security of your account</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">4. Data Security</h3>
                <p>
                  We implement appropriate technical and organizational measures to protect 
                  your personal information. Your journal entries and personal data are 
                  encrypted and stored securely. We do not sell your personal information 
                  to third parties.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">5. Your Rights</h3>
                <p className="mb-2">You have the right to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Export your data</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">6. Contact Us</h3>
                <p>
                  If you have any questions about this Privacy Policy, please contact us 
                  through the app settings or email support.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">7. Updates to This Policy</h3>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you 
                  of any changes by posting the new Privacy Policy on this page and updating 
                  the "Last Updated" date.
                </p>
                <p className="mt-2 text-xs">Last Updated: December 2024</p>
              </section>
            </div>
          </ScrollArea>

          <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
            <Checkbox 
              id="accept" 
              checked={accepted} 
              onCheckedChange={(checked) => setAccepted(checked === true)}
            />
            <label 
              htmlFor="accept" 
              className="text-sm font-medium cursor-pointer leading-relaxed"
            >
              I have read and agree to the Privacy Policy and Terms of Service
            </label>
          </div>

          <Button
            className="w-full h-12"
            onClick={handleAccept}
            disabled={!accepted || loading}
          >
            {loading ? "Processing..." : "Accept & Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;
