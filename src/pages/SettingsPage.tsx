import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Palette,
  Lock,
  Trash2,
  LogOut,
  Moon,
  Sun,
  Mail,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { cn, initials } from "@/lib/utils";

type SettingsTab = "profile" | "theme" | "password" | "account";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut, updatePassword } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  const [tab, setTab] = useState<SettingsTab>("profile");
  const [fullName, setFullName] = useState((user?.user_metadata?.full_name as string) || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "theme" as const, label: "Theme", icon: Palette },
    { id: "password" as const, label: "Password", icon: Lock },
    { id: "account" as const, label: "Account", icon: AlertTriangle },
  ];

  async function handleSaveProfile() {
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });
    if (error) {
      toast.error("Update failed", error.message);
    } else {
      await supabase.from("profiles").update({ full_name: fullName }).eq("id", user?.id);
      toast.success("Profile updated");
    }
    setSavingProfile(false);
  }

  async function handleUpdatePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match", "Please make sure both passwords are the same");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password too short", "Password must be at least 6 characters");
      return;
    }
    setSavingPassword(true);
    const { error } = await updatePassword(newPassword);
    if (error) {
      toast.error("Update failed", error);
    } else {
      toast.success("Password updated");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  }

  async function handleDeleteAccount() {
    // Delete user data first
    await supabase.from("pdfs").delete().eq("user_id", user?.id);
    await supabase.from("profiles").delete().eq("id", user?.id);
    // Then sign out
    await signOut();
    navigate("/");
    toast.success("Account deleted", "Your data has been removed");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center",
              tab === t.id ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {tab === "profile" && (
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center text-white text-xl font-bold">
                {initials(fullName || user?.email || "U")}
              </div>
              <div>
                <p className="font-semibold">{fullName || "Student"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{user?.email}</span>
              </div>
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <Button onClick={handleSaveProfile} loading={savingProfile}>
              <Check className="w-4 h-4" /> Save Changes
            </Button>
          </Card>
        )}

        {tab === "theme" && (
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-1">Appearance</h3>
              <p className="text-sm text-muted-foreground">Choose how StudySphere looks to you</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { id: "light" as const, label: "Light", icon: Sun },
                { id: "dark" as const, label: "Dark", icon: Moon },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all",
                    theme === t.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <t.icon className="w-8 h-8" />
                  <span className="font-medium">{t.label}</span>
                  {theme === t.id && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </Card>
        )}

        {tab === "password" && (
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-1">Change Password</h3>
              <p className="text-sm text-muted-foreground">Update your password to keep your account secure</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button onClick={handleUpdatePassword} loading={savingPassword} disabled={!newPassword || !confirmPassword}>
              <Lock className="w-4 h-4" /> Update Password
            </Button>
          </Card>
        )}

        {tab === "account" && (
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Logout</h3>
                  <p className="text-sm text-muted-foreground mt-1">Sign out of your account</p>
                </div>
                <Button
                  variant="outline"
                  onClick={async () => { await signOut(); navigate("/"); }}
                >
                  <LogOut className="w-4 h-4" /> Logout
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-destructive/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-destructive">Delete Account</h3>
                  <p className="text-sm text-muted-foreground mt-1">Permanently delete your account and all data</p>
                </div>
                <Button variant="destructive" onClick={() => setDeleteModal(true)}>
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </div>
            </Card>
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation */}
      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Account"
        description="This action is permanent and cannot be undone. All your PDFs, chats, summaries, and PYQ analyses will be permanently deleted."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Warning</p>
              <p className="text-sm text-muted-foreground mt-1">
                You will lose all your study materials and progress. This cannot be recovered.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDeleteModal(false)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} className="flex-1">
              <Trash2 className="w-4 h-4" /> Delete Forever
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
