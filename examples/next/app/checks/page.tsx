// Edge cases tests/next drives in a browser; not part of the example's story.
import {
  LoadingRegion,
  SkeletonCircle,
  SkeletonText,
  TextLoader,
} from '@dotquilt/react';

export default function ChecksPage() {
  return (
    <>
      <h1>Checks</h1>
      {/* Before the elements register: the page's classes size the loaders,
          and a pending region keeps its placeholder's space with content
          present. */}
      <SkeletonCircle data-check="avatar" className="check-avatar" />
      <TextLoader
        data-check="total"
        className="check-total"
        state="pending"
        mask="$00,000"
      >
        $48,120
      </TextLoader>
      <LoadingRegion
        data-check="region"
        aria-label="Check region"
        state="pending"
        placeholder={<SkeletonText lines={3} />}
      >
        <ul className="check-list" />
      </LoadingRegion>
      <p data-check="after">After the region</p>
    </>
  );
}
