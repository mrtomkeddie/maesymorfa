
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';

const wordPairs = [
  { en: 'Dog', cy: 'Ci' },
  { en: 'Cat', cy: 'Cath' },
  { en: 'House', cy: 'Tŷ' },
  { en: 'School', cy: 'Ysgol' },
  { en: 'Book', cy: 'Llyfr' },
  { en: 'Red', cy: 'Coch' },
  { en: 'Friend', cy: 'Ffrind' },
  { en: 'Morning', cy: 'Bore' },
];

type GameCard = {
  id: number;
  pairId: number;
  word: string;
  language: 'en-GB' | 'cy-GB';
};

const shuffleArray = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export default function WelshWordMatch() {
  const [cards, setCards] = useState<GameCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const speak = useCallback((text: string, lang: 'en-GB' | 'cy-GB') => {
    if (isMuted || !window.speechSynthesis) return;
    // Cancel any ongoing speech to prevent overlap
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  const createGameBoard = useCallback(() => {
    const gameCards: GameCard[] = [];
    wordPairs.forEach((pair, index) => {
      gameCards.push({ id: index * 2, pairId: index, word: pair.en, language: 'en-GB' });
      gameCards.push({ id: index * 2 + 1, pairId: index, word: pair.cy, language: 'cy-GB' });
    });
    setCards(shuffleArray(gameCards));
    setFlippedIndices([]);
    setMatchedPairIds([]);
    setMoves(0);
    if(window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
  }, []);
  
  useEffect(() => {
    createGameBoard();
  }, [createGameBoard]);

  const handleCardClick = (index: number) => {
    if (isChecking || flippedIndices.includes(index) || matchedPairIds.includes(cards[index].pairId)) {
      return;
    }

    const newFlippedIndices = [...flippedIndices, index];
    setFlippedIndices(newFlippedIndices);
    const card = cards[index];
    speak(card.word, card.language);
  };

  useEffect(() => {
    if (flippedIndices.length === 2) {
      setIsChecking(true);
      setMoves(moves => moves + 1);
      const [firstIndex, secondIndex] = flippedIndices;
      const firstCard = cards[firstIndex];
      const secondCard = cards[secondIndex];

      if (firstCard.pairId === secondCard.pairId) {
        setMatchedPairIds((prev) => [...prev, firstCard.pairId]);
        setFlippedIndices([]);
        setIsChecking(false);
      } else {
        setTimeout(() => {
          setFlippedIndices([]);
          setIsChecking(false);
        }, 1200);
      }
    }
  }, [flippedIndices, cards]);
  
  const allMatched = matchedPairIds.length === wordPairs.length;

  return (
    <div className="flex flex-col items-center gap-4">
        <div className="w-full grid grid-cols-4 gap-2 md:gap-4 aspect-video">
            {cards.map((card, index) => {
                const isFlipped = flippedIndices.includes(index);
                const isMatched = matchedPairIds.includes(card.pairId);
                return (
                    <motion.div
                        key={card.id}
                        onClick={() => handleCardClick(index)}
                        className="w-full h-full cursor-pointer rounded-lg"
                        style={{ perspective: 1000 }}
                    >
                        <motion.div
                            className="relative w-full h-full"
                            style={{ transformStyle: 'preserve-3d' }}
                            initial={false}
                            animate={{ rotateY: isFlipped || isMatched ? 180 : 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            {/* Card Back */}
                            <div className="absolute w-full h-full bg-primary rounded-lg flex items-center justify-center" style={{ backfaceVisibility: 'hidden' }}>
                                <img src="/icon.png" alt="School Logo" className="h-1/2 w-1/2 object-contain opacity-50" />
                            </div>
                            {/* Card Front */}
                            <div
                                className={cn(
                                    "absolute w-full h-full bg-card rounded-lg flex items-center justify-center p-2 text-center",
                                    isMatched ? 'border-4 border-green-500' : 'border-2 border-primary'
                                )}
                                style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                            >
                                <span className="font-bold text-sm md:text-xl">{card.word}</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )
            })}
        </div>
        <AnimatePresence>
        {allMatched && (
            <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="text-center"
            >
                <h3 className="text-2xl font-bold text-primary">Da iawn! Well done!</h3>
                <p className="text-muted-foreground">You matched all the words in {moves} moves.</p>
            </motion.div>
        )}
        </AnimatePresence>
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setIsMuted(!isMuted)} aria-label={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            <p className="font-semibold text-lg">Moves: {moves}</p>
            <Button onClick={createGameBoard}>Play Again</Button>
        </div>
    </div>
  );
}
