import React from "react";

interface ImproveIconProps {
  size?: number;
  className?: string;
}

export const ImproveIcon: React.FC<ImproveIconProps> = ({ size = 16, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 8.03441V6.505L12.5882 1.91675L14.1177 3.44616L9.52942 8.03441H8Z"
        stroke="currentColor"
        strokeWidth="1.22353"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.55341 8.03442H3.41223C2.56756 8.03442 1.88281 8.71917 1.88281 9.56384C1.88281 10.4085 2.56756 11.0933 3.41223 11.0933H12.5887C13.4334 11.0933 14.1181 11.778 14.1181 12.6227C14.1181 13.4673 13.4334 14.1521 12.5887 14.1521H9.83697"
        stroke="currentColor"
        strokeWidth="1.22353"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.49219 4.05786H5.55102"
        stroke="currentColor"
        strokeWidth="1.22353"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.02344 2.52832V5.58715"
        stroke="currentColor"
        strokeWidth="1.22353"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.16406 13.999H7.99936"
        stroke="currentColor"
        strokeWidth="0.91765"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.08203 13.0813V14.9166"
        stroke="currentColor"
        strokeWidth="0.91765"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ImproveIcon;

