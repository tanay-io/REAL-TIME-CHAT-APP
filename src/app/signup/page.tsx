"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
<<<<<<< HEAD

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

=======
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
>>>>>>> f081092 (done all except ui and users page)
    if (!username || !password) {
      toast.error("Please fill in all fields");
      return;
    }
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to sign up");
      }
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
      toast.success("Account created successfully!");
      router.push("/login");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  };
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md">
        <motion.button
          whileHover={{ x: -5 }}
          onClick={() => router.back()}
          className="flex items-center text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </motion.button>
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl text-white">
              Create an Account
            </CardTitle>
            <CardDescription>Join our community today</CardDescription>
          </CardHeader>
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Username
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  disabled={isLoading}
                  className="bg-[#0a0a0a] border-gray-800 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  className="bg-[#0a0a0a] border-gray-800 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-400">
                  Must be at least 6 characters long
                </p>
              </div>
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  "Sign Up"
                )}
              </Button>
            </form>
          </CardContent>
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
          <CardFooter>
            <p className="text-center w-full text-gray-400">
              Already have an account?{" "}
              <Button
                variant="link"
                onClick={() => router.push("/login")}
                disabled={isLoading}
                className="text-purple-500 hover:text-purple-400 p-0 h-auto font-medium"
              >
                Log in
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </motion.div>
  );
}
