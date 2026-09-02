import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  showTagline = true,
  size = 'md',
  asLink = true,
}) => {
  const content = (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Shield SVG matching user's image */}
      <svg
        className={
          size === 'sm'
            ? 'w-7 h-8'
            : size === 'lg'
            ? 'w-11 h-12'
            : 'w-8 h-9 sm:w-9 sm:h-10'
        }
        viewBox="0 0 56 62"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M28 3L48 9V27C48 40.5 39.5 52.8 28 57C16.5 52.8 8 40.5 8 27V9L28 3Z"
          fill="#062341"
          stroke="#0D9488"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <circle cx="28" cy="20" r="4.5" fill="#2DD4BF" />
        <path
          d="M28 27C24.5 27 21 29.5 21 33.5C21 38 28 43.5 28 43.5C28 43.5 35 38 35 33.5C35 29.5 31.5 27 28 27Z"
          fill="#2DD4BF"
        />
      </svg>
      <div className="flex flex-col justify-center">
        <span
          className={`font-black tracking-tight text-[#062341] font-sans leading-none ${
            size === 'sm'
              ? 'text-lg'
              : size === 'lg'
              ? 'text-2xl'
              : 'text-lg sm:text-xl'
          }`}
        >
          OBHOY
        </span>
        {showTagline && (
          <span
            className={`font-semibold text-[#0D9488] tracking-tight leading-tight mt-0.5 font-sans ${
              size === 'sm'
                ? 'text-[8.5px]'
                : size === 'lg'
                ? 'text-[11px]'
                : 'text-[9px] sm:text-[10px]'
            }`}
          >
            Secure. Private. Always with you.
          </span>
        )}
      </div>
    </div>
  );

  if (asLink) {
    return (
      <Link to="/" className="inline-block group focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
};
