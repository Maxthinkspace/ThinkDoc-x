import * as React from 'react';
import { SummaryCard } from './SummaryCard';
import type { FlattenedSummaryItem } from '..';

export interface SummaryVersion {
  versionIndex: number;
  summary: FlattenedSummaryItem;
  isOriginal: boolean;
}

export interface SummaryVersionCarouselProps {
  versions: SummaryVersion[];
  currentVersionIndex: number;
  onVersionChange: (newIndex: number) => void;
  onAcceptVersion: (versionIndex: number) => void;
  onCancelCarousel: () => void;
  onRerun: () => void;
  isRerunning?: boolean;
  showRecommendation?: boolean;
}

export const SummaryVersionCarousel: React.FC<SummaryVersionCarouselProps> = ({
  versions,
  currentVersionIndex,
  onVersionChange,
  onAcceptVersion,
  onCancelCarousel,
  onRerun,
  isRerunning = false,
  showRecommendation = true,
}) => {
  const currentVersion = versions[currentVersionIndex];
  const totalVersions = versions.length;

  const canGoPrev = currentVersionIndex > 0;
  const canGoNext = currentVersionIndex < totalVersions - 1;

  const handlePrev = () => {
    if (canGoPrev) {
      onVersionChange(currentVersionIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onVersionChange(currentVersionIndex + 1);
    }
  };

  const handleAccept = () => {
    onAcceptVersion(currentVersionIndex);
  };

  if (!currentVersion) {
    return null;
  }

  return (
    <SummaryCard
      key={`${currentVersion.summary.id}-v${currentVersionIndex}`}
      item={currentVersion.summary}
      onDelete={() => {}}
      onUpdate={() => {}}
      onRerun={onRerun}
      isRerunning={isRerunning}
      isInCarousel={true}
      onPrevVersion={handlePrev}
      onNextVersion={handleNext}
      onAcceptVersion={handleAccept}
      onCancelCarousel={onCancelCarousel}
      canGoPrev={canGoPrev}
      canGoNext={canGoNext}
      currentVersionIndex={currentVersionIndex}
      totalVersions={totalVersions}
      showRecommendation={showRecommendation}
    />
  );
};

export default SummaryVersionCarousel;