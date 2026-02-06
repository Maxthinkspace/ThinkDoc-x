import React from "react";

interface StarIconProps {
  size?: number;
  className?: string;
}

export const StarIcon: React.FC<StarIconProps> = ({ size = 22, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g filter="url(#filter0_iiii_star)">
        <path
          d="M9.48772 1.04471C10.0032 -0.348281 11.9734 -0.348277 12.4888 1.04471L13.493 3.7583C14.3032 5.94806 16.0297 7.67454 18.2195 8.48482L20.9331 9.48894C22.3261 10.0044 22.3261 11.9746 20.9331 12.4901L18.2195 13.4942C16.0297 14.3045 14.3032 16.0309 13.493 18.2207L12.4888 20.9343C11.9734 22.3273 10.0032 22.3273 9.48772 20.9343L8.4836 18.2207C7.67332 16.0309 5.94683 14.3045 3.75708 13.4942L1.04349 12.4901C-0.349502 11.9746 -0.349498 10.0044 1.04349 9.48894L3.75708 8.48482C5.94684 7.67454 7.67332 5.94805 8.4836 3.7583L9.48772 1.04471Z"
          fill="url(#paint0_linear_star)"
        />
      </g>
      <defs>
        <filter
          id="filter0_iiii_star"
          x="0"
          y="0"
          width="22.9766"
          height="21.979"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="4" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.48 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="1" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.64 0" />
          <feBlend mode="normal" in2="effect1_innerShadow" result="effect2_innerShadow" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx="1" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.545098 0 0 0 0 0.835294 0 0 0 0 0.972549 0 0 0 0.48 0"
          />
          <feBlend mode="normal" in2="effect2_innerShadow" result="effect3_innerShadow" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="0.5" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" />
          <feBlend mode="normal" in2="effect3_innerShadow" result="effect4_innerShadow" />
        </filter>
        <linearGradient
          id="paint0_linear_star"
          x1="-1.06727"
          y1="-6.5105"
          x2="19.9327"
          y2="23.0451"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0F62FE" />
          <stop offset="0.533654" stopColor="#4124FE" />
          <stop offset="1" stopColor="#9419FF" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default StarIcon;

