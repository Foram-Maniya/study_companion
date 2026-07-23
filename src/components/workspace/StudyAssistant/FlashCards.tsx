import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Flashcard } from "@/types/workspace";

interface FlashCardsProps {
  cards: Flashcard[];
  loading: boolean;
  onGenerate: () => void;
}

export default function FlashCards({
  cards,
  loading,
  onGenerate,
}: FlashCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[40vh]">
        <Sparkles className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-xs font-semibold animate-pulse">
          Generating Interactive Flashcards...
        </p>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[40vh]">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
          <RotateCw className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold">Exam Flashcards</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Generate quick review cards to memorize core concepts and definitions.
        </p>
        <Button onClick={onGenerate} variant="gradient" className="mt-5">
          <Sparkles className="w-4 h-4" /> Generate Flashcards
        </Button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  const handleNext = (known?: boolean) => {
    if (known) setKnownCount((prev) => prev + 1);
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      {/* Progress & Counter */}
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>
          Card {currentIndex + 1} of {cards.length}
        </span>
        <span className="text-emerald-500 font-bold">
          Mastered: {knownCount}
        </span>
      </div>

      {/* Card Container with Flip Animation */}
      <div className="perspective-1000 h-64 w-full cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative w-full h-full rounded-2xl border border-border bg-card shadow-xl p-6 flex flex-col items-center justify-center text-center"
        >
          {/* Front Side */}
          <div
            style={{ backfaceVisibility: "hidden" }}
            className="absolute inset-0 p-6 flex flex-col items-center justify-center space-y-3"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-primary/10">
              Question / Term
            </span>
            <p className="text-sm font-semibold text-foreground leading-relaxed">
              {currentCard.front}
            </p>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-4">
              <RotateCw className="w-3 h-3" /> Click to flip answer
            </span>
          </div>

          {/* Back Side */}
          <div
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
            className="absolute inset-0 p-6 flex flex-col items-center justify-center space-y-3 bg-primary/5 rounded-2xl"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10">
              Answer / Explanation
            </span>
            <p className="text-xs text-foreground leading-relaxed">
              {currentCard.back}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </Button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => handleNext(false)}
          >
            <XCircle className="w-4 h-4" /> Review Later
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
            onClick={() => handleNext(true)}
          >
            <CheckCircle2 className="w-4 h-4" /> Got It
          </Button>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleNext()}
          disabled={currentIndex === cards.length - 1}
        >
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
