import React from 'react';
import { Star } from 'lucide-react';

interface DifficultyStarsProps {
  difficulty: number;
  size?: 'sm' | 'md';
}

const DifficultyStars: React.FC<DifficultyStarsProps> = ({ difficulty, size = 'md' }) => {
  const fullStars = Math.floor(difficulty);
  const partialFill = (difficulty - fullStars) * 100;
  const starClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center relative">
        {[1, 2, 3, 4, 5].map((star) => (
          <div key={star} className={`relative ${starClass}`}>
            <Star className={`${starClass} text-slate-300 absolute`} />
            {star <= fullStars ? (
              <Star className={`${starClass} text-amber-400 fill-amber-400 absolute`} />
            ) : star === fullStars + 1 && partialFill > 0 ? (
              <div className={`absolute overflow-hidden ${starClass}`} style={{ width: `${partialFill}%` }}>
                <Star className={`${starClass} text-amber-400 fill-amber-400`} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <span className={`font-bold text-slate-400 ml-1 ${size === 'sm' ? 'text-[10px]' : 'text-sm'}`}>
        {difficulty.toFixed(2).replace('.', ',')}
      </span>
    </div>
  );
};

export default DifficultyStars;
