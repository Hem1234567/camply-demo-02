import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, ChevronRight, ChevronLeft } from "lucide-react";
import { VoiceRecognition } from "@/utils/voiceRecognition";
import { awardXP, updateStreak, checkAndAwardBadge } from "@/utils/gamification";
import { toast } from "sonner";
import Layout from "@/components/Layout";

const DAILY_QUESTIONS = [
  { category: "mindfulness", text: "What was one thing you were grateful for today?" },
  { category: "growth", text: "What was a win today, big or small?" },
  { category: "emotion", text: "How are you feeling right now, honestly?" },
  { category: "social", text: "Who made you smile or supported you today?" },
  { category: "futureFocused", text: "What are you most looking forward to this week?" }
];

const Tasks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<string[]>(Array(5).fill(""));
  const [isListening, setIsListening] = useState(false);
  const [voiceRecognition, setVoiceRecognition] = useState<VoiceRecognition | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    checkTaskCompletion();
  }, [user]);

  useEffect(() => {
    return () => {
      if (voiceRecognition) {
        voiceRecognition.stop();
      }
    };
  }, [voiceRecognition]);

  const checkTaskCompletion = async () => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const tasksRef = collection(db, 'dailyTasks');
    const q = query(tasksRef, where('userId', '==', user.uid), where('date', '==', today));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      setCompleted(true);
    }
    setLoading(false);
  };

  const toggleVoice = () => {
    if (isListening && voiceRecognition) {
      voiceRecognition.stop();
      setIsListening(false);
    } else {
      const recognition = new VoiceRecognition(
        (transcript) => {
          setResponses(prev => {
            const newResponses = [...prev];
            newResponses[currentQuestion] = transcript;
            return newResponses;
          });
        },
        () => setIsListening(false)
      );
      recognition.start();
      setVoiceRecognition(recognition);
      setIsListening(true);
    }
  };

  const handleNext = () => {
    if (currentQuestion < 4) {
      if (voiceRecognition) voiceRecognition.stop();
      setIsListening(false);
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      if (voiceRecognition) voiceRecognition.stop();
      setIsListening(false);
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const taskData = {
      userId: user.uid,
      date: today,
      questions: DAILY_QUESTIONS.map((q, i) => ({
        question: q.text,
        response: responses[i],
        category: q.category
      })),
      completed: true,
      completedAt: new Date().toISOString(),
      xpEarned: 50
    };

    try {
      await setDoc(doc(collection(db, 'dailyTasks')), taskData);
      await awardXP(user.uid, 50);
      await updateStreak(user.uid);
      await checkAndAwardBadge(user.uid, 'first_entry');
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const entriesCount = userDoc.data()?.entriesCount || 0;
      await setDoc(doc(db, 'users', user.uid), { entriesCount: entriesCount + 1 }, { merge: true });

      toast.success("Task completed! +50 XP");
      navigate("/");
    } catch (error) {
      console.error("Error completing task:", error);
      toast.error("Failed to complete task");
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

  if (completed) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center space-y-6">
          <div className="text-6xl">✅</div>
          <h2 className="text-2xl font-bold">Task Completed!</h2>
          <p className="text-muted-foreground">Come back tomorrow for new questions</p>
          <Button onClick={() => navigate("/")} size="lg">
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  const progress = ((currentQuestion + 1) / 5) * 100;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Question {currentQuestion + 1} of 5</p>
          <Progress value={progress} className="h-2 mt-2" />
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div>
              <p className="text-xs text-primary font-semibold mb-2">
                {DAILY_QUESTIONS[currentQuestion].category.toUpperCase()}
              </p>
              <h3 className="text-xl font-semibold">
                {DAILY_QUESTIONS[currentQuestion].text}
              </h3>
            </div>

            <Textarea
              value={responses[currentQuestion]}
              onChange={(e) => {
                const newResponses = [...responses];
                newResponses[currentQuestion] = e.target.value;
                setResponses(newResponses);
              }}
              placeholder="Type your response or use voice input..."
              className="min-h-[200px]"
            />

            <Button
              variant={isListening ? "destructive" : "outline"}
              className="w-full"
              onClick={toggleVoice}
            >
              {isListening ? (
                <>
                  <MicOff className="mr-2 h-5 w-5" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-5 w-5" />
                  Start Voice Input
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Previous
          </Button>
          
          {currentQuestion < 4 ? (
            <Button
              className="flex-1"
              onClick={handleNext}
              disabled={!responses[currentQuestion]?.trim()}
            >
              Next
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button
              className="flex-1"
              onClick={handleComplete}
              disabled={!responses[currentQuestion]?.trim()}
            >
              Complete Task
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Tasks;
