
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Paperclip, Bot, Apple } from 'lucide-react';
import { cn } from '@/lib/utils';

type BinType = 'paper' | 'plastic' | 'food';

const items = [
  { name: 'Newspaper', type: 'paper' as BinType, emoji: '📰' },
  { name: 'Plastic Bottle', type: 'plastic' as BinType, emoji: '🧴' },
  { name: 'Apple Core', type: 'food' as BinType, emoji: '🍎' },
  { name: 'Cardboard Box', type: 'paper' as BinType, emoji: '📦' },
  { name: 'Yoghurt Pot', type: 'plastic' as BinType, emoji: '🍦' },
  { name: 'Banana Peel', type: 'food' as BinType, emoji: '🍌' },
  { name: 'Magazine', type: 'paper' as BinType, emoji: '📚' },
  { name: 'Milk Carton', type: 'plastic' as BinType, emoji: '🥛' },
  { name: 'Bread Crust', type: 'food' as BinType, emoji: '🍞' },
];

const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const Bin = ({ type, onDrop, children, isOver }: { type: BinType, onDrop: (item: any) => void, children: React.ReactNode, isOver: boolean }) => {
    return (
        <div
            onDrop={(e) => {
                e.preventDefault();
                const item = JSON.parse(e.dataTransfer.getData('item'));
                onDrop(item);
            }}
            onDragOver={(e) => e.preventDefault()}
            className={cn("w-32 h-32 border-4 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors",
                isOver ? 'bg-green-100 border-green-500' : 'bg-secondary'
            )}
        >
            {children}
        </div>
    );
};

export default function RecyclingSort() {
    const [gameItems, setGameItems] = useState([...items]);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [draggedItemBinType, setDraggedItemBinType] = useState<BinType | null>(null);

    useEffect(() => {
        // Shuffle items only on the client-side to prevent hydration mismatch
        setGameItems(shuffleArray([...items]));
    }, []);

    const currentItem = gameItems[currentItemIndex];
    const isGameOver = currentItemIndex >= gameItems.length;

    const handleDrop = (binType: BinType) => {
        if (!currentItem) return;
        if (currentItem.type === binType) {
            setScore(s => s + 1);
            setFeedback('correct');
        } else {
            setFeedback('incorrect');
        }
        
        setTimeout(() => {
            setCurrentItemIndex(i => i + 1);
            setFeedback(null);
            setDraggedItemBinType(null);
        }, 800);
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: typeof currentItem) => {
        e.dataTransfer.setData('item', JSON.stringify(item));
        setDraggedItemBinType(item.type);
    };

    const handleDragEnd = () => {
        setDraggedItemBinType(null);
    }
    
    const restartGame = () => {
        setGameItems(shuffleArray([...items]));
        setCurrentItemIndex(0);
        setScore(0);
        setFeedback(null);
    };

    return (
        <div className="w-full p-4 bg-muted/50 rounded-lg flex flex-col items-center gap-8">
            <div className="flex justify-around w-full items-center">
                <p className="text-xl font-bold">Score: {score}</p>
                <div className="w-48 h-48 relative">
                <AnimatePresence>
                    {!isGameOver && currentItem ? (
                        <motion.div
                            key={currentItemIndex}
                            initial={{ scale: 0.5, y: -100, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.5, y: 100, opacity: 0 }}
                            drag
                            draggable="true"
                            onDragStart={(e: any) => handleDragStart(e, currentItem)}
                            onDragEnd={handleDragEnd}
                            dragSnapToOrigin
                            className={cn("w-48 h-48 rounded-lg bg-card shadow-lg flex flex-col items-center justify-center cursor-grab active:cursor-grabbing",
                                feedback === 'correct' && 'bg-green-200',
                                feedback === 'incorrect' && 'bg-red-200'
                            )}
                        >
                            <span className="text-6xl">{currentItem.emoji}</span>
                            <p className="mt-2 font-semibold">{currentItem.name}</p>
                        </motion.div>
                    ) : (
                         <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center"
                        >
                            <h3 className="text-2xl font-bold text-primary">Da iawn! Well done!</h3>
                            <p className="text-muted-foreground">You scored {score} out of {items.length}.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
                </div>
                 <Button onClick={restartGame} variant="outline">Restart Game</Button>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
                <Bin type="paper" onDrop={() => handleDrop('paper')} isOver={draggedItemBinType === 'paper'}>
                    <Paperclip className="h-10 w-10 text-blue-500" />
                    <span className="font-bold mt-2">Paper</span>
                </Bin>
                <Bin type="plastic" onDrop={() => handleDrop('plastic')} isOver={draggedItemBinType === 'plastic'}>
                    <Bot className="h-10 w-10 text-yellow-500" />
                    <span className="font-bold mt-2">Plastic</span>
                </Bin>
                 <Bin type="food" onDrop={() => handleDrop('food')} isOver={draggedItemBinType === 'food'}>
                    <Apple className="h-10 w-10 text-red-500" />
                    <span className="font-bold mt-2">Food</span>
                </Bin>
            </div>
        </div>
    );
}
